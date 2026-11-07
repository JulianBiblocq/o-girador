/**
 * formantPreservingTimePitchEngine.ts
 * Étage 3 du moteur DSP Vocal Studio (Sequenciador) :
 * Synthèse Conjointe Time-Stretch (alpha = recordedBpm / currentBpm) + Pitch-Shift (r = 2^(st/12))
 * synchrone aux époques glottiques TD-PSOLA avec préservation LPC des formants F1/F2/F3
 * et verrouillage 1:1 des consonnes percussives (< 140 lignes).
 */
import { type VocalFrameClassification, analyzeVocalFrames, extractTransientRegions, blendUnvoicedTransientsTimeStretched } from './vocalTransientSeparator';
import { detectGlottalEpochs } from './tdPsolaEpochDetector';

const LPC_ORDER = 14;

function sampleHermite4(buf: Float32Array, pos: number): number {
  const n = buf.length;
  if (pos <= 1) return buf[Math.max(0, Math.floor(pos))] || 0;
  if (pos >= n - 2) return buf[n - 1] || 0;
  const i = Math.floor(pos), t = pos - i, y0 = buf[i - 1], y1 = buf[i], y2 = buf[i + 1], y3 = buf[i + 2];
  const c1 = 0.5 * (y2 - y0), c2 = y0 - 2.5 * y1 + 2 * y2 - 0.5 * y3, c3 = 0.5 * (y3 - y0) + 1.5 * (y1 - y2);
  return ((c3 * t + c2) * t + c1) * t + y1;
}

function computeLpcCoeffs(frame: Float32Array, order = LPC_ORDER): Float32Array {
  const n = frame.length, r = new Float32Array(order + 1), a = new Float32Array(order + 1), prev = new Float32Array(order + 1);
  for (let k = 0; k <= order; k++) {
    let sum = 0;
    for (let i = 0; i < n - k; i++) sum += frame[i] * frame[i + k];
    r[k] = sum;
  }
  a[0] = 1;
  if (r[0] < 1e-9) return a;
  let err = r[0];
  for (let i = 1; i <= order; i++) {
    let acc = r[i];
    for (let j = 1; j < i; j++) acc += a[j] * r[i - j];
    const kRefl = Math.max(-0.96, Math.min(0.96, -acc / Math.max(1e-9, err)));
    prev.set(a); a[i] = kRefl;
    for (let j = 1; j < i; j++) a[j] = prev[j] + kRefl * prev[i - j];
    err *= 1 - kRefl * kRefl;
    if (err <= 1e-9) break;
  }
  return a;
}

function buildPiecewiseVoicedTimeMap(nIn: number, nOut: number, alpha: number, frames: VocalFrameClassification[], sampleRate: number): Float32Array {
  const map = new Float32Array(nOut), regions = extractTransientRegions(frames, nIn, sampleRate, alpha);
  if (regions.length === 0 || Math.abs(alpha - 1) < 1e-4) {
    const invAlpha = 1 / Math.max(0.25, alpha);
    for (let d = 0; d < nOut; d++) map[d] = Math.min(nIn - 1, d * invAlpha);
    return map;
  }
  let prevDst = 0, prevSrc = 0;
  for (const reg of regions) {
    const d0 = Math.min(nOut - 1, Math.max(prevDst, reg.targetStartSample)), s0 = Math.min(nIn - 1, Math.max(prevSrc, reg.startSample));
    if (d0 > prevDst) {
      const slope = (s0 - prevSrc) / (d0 - prevDst);
      for (let d = prevDst; d < d0; d++) map[d] = Math.min(nIn - 1, prevSrc + (d - prevDst) * slope);
    }
    const len = Math.min(reg.lengthSamples, nOut - d0, nIn - s0);
    for (let k = 0; k < len; k++) map[d0 + k] = s0 + k;
    prevDst = d0 + len; prevSrc = s0 + len;
  }
  if (prevDst < nOut) {
    const slope = (nIn - 1 - prevSrc) / Math.max(1, nOut - 1 - prevDst);
    for (let d = prevDst; d < nOut; d++) map[d] = Math.min(nIn - 1, Math.max(0, prevSrc + (d - prevDst) * slope));
  }
  return map;
}

function restoreFormantEnvelopeLpc(origPcm: Float32Array, synthPcm: Float32Array, timeMap: Float32Array, sampleRate: number): Float32Array {
  const nOut = synthPcm.length, nIn = origPcm.length, lpcWin = Math.max(128, Math.round(0.02 * sampleRate)), lpcHop = lpcWin >> 1;
  const out = new Float32Array(nOut), winSum = new Float32Array(nOut), win = new Float32Array(lpcWin);
  for (let i = 0; i < lpcWin; i++) win[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (lpcWin - 1)));
  const origBuf = new Float32Array(lpcWin), synBuf = new Float32Array(lpcWin), exc = new Float32Array(lpcWin), rest = new Float32Array(lpcWin);
  for (let start = 0; start < nOut; start += lpcHop) {
    const len = Math.min(lpcWin, nOut - start);
    if (len < LPC_ORDER * 2) break;
    const srcStart = Math.max(0, Math.min(nIn - len, Math.round(timeMap[Math.min(nOut - 1, start + (len >> 1))] - (len >> 1))));
    let oSq = 0, sSq = 0;
    for (let i = 0; i < len; i++) {
      origBuf[i] = origPcm[srcStart + i] * win[i]; synBuf[i] = synthPcm[start + i] * win[i];
      oSq += origBuf[i] * origBuf[i]; sSq += synBuf[i] * synBuf[i];
    }
    if (oSq < 1e-8 || sSq < 1e-8) continue;
    const aOrig = computeLpcCoeffs(origBuf, LPC_ORDER), aSyn = computeLpcCoeffs(synBuf, LPC_ORDER);
    for (let i = 0; i < len; i++) {
      let s = synBuf[i];
      for (let k = 1; k <= LPC_ORDER && i - k >= 0; k++) s += aSyn[k] * synBuf[i - k];
      exc[i] = s;
    }
    let rSq = 0;
    for (let i = 0; i < len; i++) {
      let y = exc[i];
      for (let k = 1; k <= LPC_ORDER && i - k >= 0; k++) y -= aOrig[k] * rest[i - k];
      rest[i] = Math.max(-1.5, Math.min(1.5, y)); rSq += rest[i] * rest[i];
    }
    const gain = rSq > 1e-8 ? Math.sqrt(oSq / rSq) : 1;
    for (let i = 0; i < len; i++) { out[start + i] += rest[i] * gain * win[i]; winSum[start + i] += win[i] * win[i]; }
  }
  for (let i = 0; i < nOut; i++) out[i] = winSum[i] > 1e-4 ? Math.max(-1, Math.min(1, out[i] / winSum[i])) : synthPcm[i];
  return out;
}

export function synthesizeTimePitchHybridTdPsola(pcm: Float32Array, sampleRate: number, alpha: number, semitones: number): Float32Array {
  const nIn = pcm.length;
  if (nIn === 0 || sampleRate <= 0) return new Float32Array(0);
  const safeAlpha = Math.max(0.4, Math.min(2.5, Number.isFinite(alpha) && alpha > 0 ? alpha : 1.0));
  const clampedSt = Math.max(-12, Math.min(12, Number.isFinite(semitones) ? semitones : 0));
  if (Math.abs(safeAlpha - 1.0) < 1e-4 && Math.abs(clampedSt) < 0.01) return new Float32Array(pcm);

  const nOut = Math.max(64, Math.round(nIn * safeAlpha)), r = Math.pow(2, clampedSt / 12);
  const frames = analyzeVocalFrames(pcm, sampleRate, 10);
  const { epochs, framePeriods, hopSamples } = detectGlottalEpochs(pcm, sampleRate, frames);
  const timeMap = buildPiecewiseVoicedTimeMap(nIn, nOut, safeAlpha, frames, sampleRate);
  const synthAcc = new Float32Array(nOut), winDensity = new Float32Array(nOut);
  let tOut = 0, k = 0;
  const defaultT0 = Math.max(24, Math.round(sampleRate / 180));

  while (tOut < nOut && epochs.length >= 2) {
    const dCenter = Math.min(nOut - 1, Math.round(tOut)), tauSrc = timeMap[dCenter];
    while (k + 1 < epochs.length - 1 && epochs[k + 1] <= tauSrc) k++;
    const m0 = epochs[k], m1 = epochs[Math.min(epochs.length - 1, k + 1)];
    const fIdx = Math.min(framePeriods.length - 1, Math.max(0, Math.floor(tauSrc / hopSamples)));
    const T0 = Math.max(16, m1 - m0 > 12 && m1 - m0 < sampleRate / 60 ? m1 - m0 : (framePeriods[fIdx] || defaultT0));
    const frac = m1 > m0 ? Math.max(0, Math.min(1, (tauSrc - m0) / (m1 - m0))) : 0;
    const mSrc = frac < 0.5 ? m0 : m1;
    const synthStep = Math.max(12, T0 / r), L = Math.max(16, Math.round(synthStep));
    for (let d = -L; d <= L; d++) {
      const dstIdx = dCenter + d;
      if (dstIdx < 0 || dstIdx >= nOut) continue;
      const w = 0.5 * (1 + Math.cos((Math.PI * d) / L));
      synthAcc[dstIdx] += sampleHermite4(pcm, mSrc + d) * w;
      winDensity[dstIdx] += w;
    }
    tOut += synthStep;
  }

  const voicedOut = new Float32Array(nOut);
  for (let i = 0; i < nOut; i++) {
    voicedOut[i] = winDensity[i] > 1e-4 ? Math.max(-1, Math.min(1, synthAcc[i] / winDensity[i])) : sampleHermite4(pcm, timeMap[i]);
  }
  const formantRestored = Math.abs(clampedSt) >= 0.05 ? restoreFormantEnvelopeLpc(pcm, voicedOut, timeMap, sampleRate) : voicedOut;
  return blendUnvoicedTransientsTimeStretched(pcm, formantRestored, sampleRate, safeAlpha, frames, 4);
}
