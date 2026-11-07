/**
 * vocalTransientSeparator.ts
 * Étage 1 du moteur DSP Vocal Studio (Sequenciador) :
 * Analyse Voisé / Non-Voisé par trames de 10 ms (HNR, ZCR, Onset Flux) et protection
 * intégrale 1:1 des consonnes (t, k, p, s, x, ch) avec fondu croisé cosinus de 4 ms (< 140 lignes).
 */

export interface VocalFrameClassification {
  frameIndex: number; startSample: number; endSample: number;
  rms: number; zcr: number; hnr: number; onsetFlux: number;
  isUnvoicedOrTransient: boolean; estimatedPeriodSamples: number;
}

export interface TransientRegion {
  startSample: number; endSample: number; targetStartSample: number; lengthSamples: number;
}

export function analyzeVocalFrames(pcm: Float32Array, sampleRate: number, frameMs = 10): VocalFrameClassification[] {
  const n = pcm.length;
  if (n === 0 || sampleRate <= 0) return [];
  const frameLen = Math.max(64, Math.round((frameMs / 1000) * sampleRate));
  const minLag = Math.max(8, Math.floor(sampleRate / 650));
  const maxLag = Math.min(frameLen * 2, Math.ceil(sampleRate / 75));
  const frames: VocalFrameClassification[] = [];
  let prevRms = 0;
  let lastValidLag = Math.round(sampleRate / 180);

  for (let start = 0, idx = 0; start < n; start += frameLen, idx++) {
    const end = Math.min(n, start + frameLen), len = end - start;
    let sumSq = 0, diffSq = 0, zeroCrossings = 0;
    for (let i = start; i < end; i++) {
      const v = pcm[i];
      sumSq += v * v;
      if (i > start) {
        const prev = pcm[i - 1], d = v - prev;
        diffSq += d * d;
        if ((v >= 0 && prev < 0) || (v < 0 && prev >= 0)) zeroCrossings++;
      }
    }

    const rms = Math.sqrt(sumSq / Math.max(1, len));
    const zcr = zeroCrossings / Math.max(1, len - 1);
    const hfRatio = sumSq > 1e-9 ? diffSq / sumSq : 0;
    const rmsJump = prevRms > 1e-4 ? Math.max(0, (rms - prevRms) / prevRms) : (rms > 0.015 ? 2.5 : 0);
    const onsetFlux = rmsJump + hfRatio * 1.35;
    prevRms = rms * 0.7 + prevRms * 0.3;

    let bestCorr = 0, bestLag = lastValidLag;
    const corrWin = Math.min(n - start, Math.max(len, maxLag + 32));
    if (rms >= 0.0025 && corrWin > minLag + 8) {
      const step = sampleRate > 32000 ? 2 : 1;
      for (let lag = minLag; lag <= maxLag && lag + 16 < corrWin; lag += step) {
        let num = 0, e1 = 0, e2 = 0;
        const win = Math.min(len, corrWin - lag);
        for (let k = 0; k < win; k += step) {
          const a = pcm[start + k], b = pcm[start + k + lag];
          num += a * b; e1 += a * a; e2 += b * b;
        }
        const denom = Math.sqrt(e1 * e2), corr = denom > 1e-9 ? num / denom : 0;
        const effCorr = corr * (1 - 0.035 * (lag / maxLag));
        if (effCorr > bestCorr) { bestCorr = effCorr; bestLag = lag; }
      }
    }

    const hnr = Math.max(0, Math.min(1, bestCorr));
    const isUnvoicedOrTransient =
      rms < 0.0025 || zcr > 0.22 || (hfRatio > 0.60 && hnr < 0.58) || (onsetFlux > 2.20 && hnr < 0.65) || hnr < 0.38;
    if (!isUnvoicedOrTransient && bestCorr >= 0.38) lastValidLag = bestLag;

    frames.push({
      frameIndex: idx, startSample: start, endSample: end, rms, zcr, hnr, onsetFlux,
      isUnvoicedOrTransient, estimatedPeriodSamples: bestLag,
    });
  }
  return frames;
}

export function extractTransientRegions(
  frames: VocalFrameClassification[],
  totalSamples: number,
  sampleRate: number,
  alpha: number
): TransientRegion[] {
  const regions: TransientRegion[] = [];
  const maxConsonantSamples = Math.round(0.14 * sampleRate); // max 140 ms par attaque/consonne 1:1
  let i = 0;
  while (i < frames.length) {
    if (!frames[i].isUnvoicedOrTransient || frames[i].rms < 0.0025) { i++; continue; }
    const s0 = frames[i].startSample;
    let s1 = frames[i].endSample;
    i++;
    while (i < frames.length && frames[i].isUnvoicedOrTransient && frames[i].rms >= 0.0025 && (frames[i].endSample - s0) <= maxConsonantSamples) {
      s1 = frames[i].endSample;
      i++;
    }
    const len = Math.min(totalSamples - s0, s1 - s0);
    if (len > 0) {
      regions.push({
        startSample: s0,
        endSample: s0 + len,
        targetStartSample: Math.max(0, Math.round(s0 * alpha)),
        lengthSamples: len,
      });
    }
  }
  return regions;
}

export function blendUnvoicedTransientsTimeStretched(
  originalPcm: Float32Array,
  voicedStretchedPcm: Float32Array,
  sampleRate: number,
  alpha: number,
  frames?: VocalFrameClassification[],
  crossfadeMs = 4
): Float32Array {
  const nOut = voicedStretchedPcm.length;
  if (nOut === 0 || originalPcm.length === 0) return voicedStretchedPcm;
  const resolvedFrames = frames ?? analyzeVocalFrames(originalPcm, sampleRate, 10);
  const regions = extractTransientRegions(resolvedFrames, originalPcm.length, sampleRate, alpha);
  const out = new Float32Array(voicedStretchedPcm);
  const cfSamples = Math.max(8, Math.round((crossfadeMs / 1000) * sampleRate));

  for (const reg of regions) {
    const d0 = reg.targetStartSample;
    const len = reg.lengthSamples;
    for (let k = 0; k < len; k++) {
      const dstIdx = d0 + k, srcIdx = reg.startSample + k;
      if (dstIdx < 0 || dstIdx >= nOut || srcIdx >= originalPcm.length) break;
      let w = 1.0;
      if (k < cfSamples) w = 0.5 * (1 - Math.cos((Math.PI * k) / cfSamples));
      else if (len - 1 - k < cfSamples) w = 0.5 * (1 - Math.cos((Math.PI * (len - 1 - k)) / cfSamples));
      out[dstIdx] = w * originalPcm[srcIdx] + (1 - w) * out[dstIdx];
    }
  }
  return out;
}
