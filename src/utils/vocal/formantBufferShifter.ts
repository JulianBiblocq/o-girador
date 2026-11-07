/**
 * formantBufferShifter.ts
 * Transposition vocale avec préservation de l'enveloppe formantique (LPC Levinson-Durbin + PSOLA)
 * et verrouillage des consonnes non-voisées pour AudioBuffer dans Sequenciador (< 120 lignes).
 */

function estimateLpcCoeffs(frame: Float32Array, order: number): { a: Float64Array; gain: number } {
  const n = frame.length;
  const r = new Float64Array(order + 1);
  for (let k = 0; k <= order; k++) {
    let sum = 0;
    for (let i = 0; i < n - k; i++) sum += frame[i] * frame[i + k];
    r[k] = sum / n;
  }
  const a = new Float64Array(order + 1);
  a[0] = 1.0;
  if (r[0] < 1e-9) return { a, gain: 0 };

  let e = r[0];
  const prev = new Float64Array(order + 1);
  for (let i = 1; i <= order; i++) {
    let acc = r[i];
    for (let j = 1; j < i; j++) acc += a[j] * r[i - j];
    const kVal = Math.max(-0.985, Math.min(0.985, -acc / e));
    for (let j = 1; j < i; j++) prev[j] = a[j];
    for (let j = 1; j < i; j++) a[j] = prev[j] + kVal * prev[i - j];
    a[i] = kVal;
    e *= 1 - kVal * kVal;
    if (e <= 1e-9) break;
  }
  return { a, gain: Math.sqrt(Math.max(1e-9, e)) };
}

export function shiftPcmFormantPreserved(pcm: Float32Array, sampleRate: number, semitones: number): Float32Array {
  if (!pcm || pcm.length === 0 || Math.abs(semitones) < 0.01) return pcm;
  const pitchRatio = Math.pow(2, semitones / 12);
  const n = pcm.length;
  const out = new Float32Array(n);
  const winSize = 1024, hop = 256, lpcOrder = 14;
  const hann = new Float32Array(winSize);
  for (let i = 0; i < winSize; i++) hann[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (winSize - 1)));

  const frameBuf = new Float32Array(winSize);
  const residual = new Float32Array(winSize);
  const shiftedRes = new Float32Array(winSize);
  const synthFrame = new Float32Array(winSize);
  const norm = new Float32Array(n);

  for (let start = 0; start + winSize <= n; start += hop) {
    let zc = 0, sumSq = 0;
    for (let i = 0; i < winSize; i++) {
      const s = pcm[start + i];
      frameBuf[i] = s * hann[i];
      sumSq += s * s;
      if (i > 0 && ((s >= 0 && pcm[start + i - 1] < 0) || (s < 0 && pcm[start + i - 1] >= 0))) zc++;
    }
    const rms = Math.sqrt(sumSq / winSize), zcr = zc / winSize;
    // Consonnes fricatives/plosives : verrouillées à 1.0x sans transposition
    if (rms < 0.008 || zcr > 0.24) {
      for (let i = 0; i < winSize; i++) {
        out[start + i] += frameBuf[i] * hann[i];
        norm[start + i] += hann[i] * hann[i];
      }
      continue;
    }

    const { a } = estimateLpcCoeffs(frameBuf, lpcOrder);
    for (let i = 0; i < winSize; i++) {
      let pred = 0;
      for (let k = 1; k <= lpcOrder && i - k >= 0; k++) pred += a[k] * frameBuf[i - k];
      residual[i] = frameBuf[i] + pred;
    }

    for (let i = 0; i < winSize; i++) {
      const srcPos = (i * pitchRatio) % (winSize - 1);
      const i0 = Math.floor(srcPos), frac = srcPos - i0;
      shiftedRes[i] = residual[i0] * (1 - frac) + residual[Math.min(winSize - 1, i0 + 1)] * frac;
    }

    let synthSq = 0;
    for (let i = 0; i < winSize; i++) {
      let fb = 0;
      for (let k = 1; k <= lpcOrder && i - k >= 0; k++) fb -= a[k] * synthFrame[i - k];
      const v = Math.max(-2.5, Math.min(2.5, shiftedRes[i] + fb));
      synthFrame[i] = v;
      synthSq += v * v;
    }
    const synthRms = Math.sqrt(synthSq / winSize);
    const scale = synthRms > 1e-6 ? Math.min(2.0, rms / synthRms) : 1.0;

    for (let i = 0; i < winSize; i++) {
      out[start + i] += synthFrame[i] * scale * hann[i];
      norm[start + i] += hann[i] * hann[i];
    }
  }

  for (let i = 0; i < n; i++) {
    out[i] = norm[i] > 1e-4 ? out[i] / norm[i] : pcm[i];
  }
  return out;
}

export function getOrCreateFormantShiftedAudioBuffer(
  baseBuffer: AudioBuffer,
  deltaSemitones: number,
  cacheKey: string,
  vocalBuffers: Record<string | number, AudioBuffer>
): AudioBuffer {
  if (Math.abs(deltaSemitones) < 0.01) return baseBuffer;
  if (vocalBuffers[cacheKey]) return vocalBuffers[cacheKey];
  try {
    const sr = baseBuffer.sampleRate, len = baseBuffer.length, channels = baseBuffer.numberOfChannels;
    const shifted = new AudioBuffer({ length: len, numberOfChannels: channels, sampleRate: sr });
    for (let ch = 0; ch < channels; ch++) {
      const chData = baseBuffer.getChannelData(ch);
      const outPcm = shiftPcmFormantPreserved(chData, sr, deltaSemitones);
      shifted.copyToChannel(new Float32Array(outPcm), ch);
    }
    vocalBuffers[cacheKey] = shifted;
    return shifted;
  } catch {
    return baseBuffer;
  }
}

