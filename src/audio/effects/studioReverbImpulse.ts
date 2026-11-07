/**
 * studioReverbImpulse.ts
 * Réverbération acoustique Studio 1.4 s via `ConvolverNode` natif :
 * - Queue diffuse stéréo décorrélée sans réflexions fixes métalliques.
 * - Pré-filtrée en DSP : passe-haut 140 Hz et passe-bas 7.5 kHz.
 * - Normalisée en énergie L2 (`divisée par sqrt(sum(x_i^2)) * 4`) pour un niveau doux et calibré (< 85 lignes).
 */
import * as Tone from 'tone';

const DEFAULT_STUDIO_IR_DURATION_SEC = 1.4;

function applyBiquadBandlimitAndNormalizeInPlace(data: Float32Array, sampleRate: number): void {
  // 1. Passe-haut 1er ordre à 140 Hz (élimine la boue grave dans la réverbe)
  const rcHp = 1 / (2 * Math.PI * 140);
  const dt = 1 / sampleRate;
  const alphaHp = rcHp / (rcHp + dt);
  let prevX = 0;
  let prevY = 0;
  for (let i = 0; i < data.length; i++) {
    const x = data[i];
    const y = alphaHp * (prevY + x - prevX);
    prevX = x;
    prevY = y;
    data[i] = y;
  }

  // 2. Passe-bas 1er ordre à 7500 Hz (adoucit le haut du spectre)
  const rcLp = 1 / (2 * Math.PI * 7500);
  const alphaLp = dt / (rcLp + dt);
  let lpY = 0;
  let sumSq = 0;
  for (let i = 0; i < data.length; i++) {
    lpY += alphaLp * (data[i] - lpY);
    data[i] = lpY;
    sumSq += lpY * lpY;
  }

  // 3. Normalisation stricte en énergie L2 : divise par sqrt(sum(x_i^2)) * 4
  const l2Norm = Math.sqrt(sumSq);
  if (l2Norm > 1e-9) {
    const scale = 1 / (l2Norm * 4);
    for (let i = 0; i < data.length; i++) {
      data[i] *= scale;
    }
  }
}

export function buildStudioAcousticImpulseBuffer(
  rawCtx: BaseAudioContext,
  durationSec: number = DEFAULT_STUDIO_IR_DURATION_SEC
): AudioBuffer {
  const sr = rawCtx.sampleRate || 44100;
  const length = Math.max(1, Math.round(durationSec * sr));
  const buffer = rawCtx.createBuffer(2, length, sr);

  for (let ch = 0; ch < 2; ch++) {
    const channelData = buffer.getChannelData(ch);
    let seed = ch === 0 ? 0x13579bdf : 0x2468ace1;
    const nextRand = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return (seed / 0xffffffff) * 2 - 1;
    };

    const preDelaySamples = Math.round((0.010 + ch * 0.0013) * sr);
    const attackSamples = Math.round(0.015 * sr);
    for (let i = preDelaySamples; i < length; i++) {
      const relIdx = i - preDelaySamples;
      const t = relIdx / sr;
      const fadeIn = relIdx < attackSamples ? 0.5 * (1 - Math.cos(Math.PI * (relIdx / attackSamples))) : 1.0;
      const env = fadeIn * Math.exp(-5.2 * (t / durationSec));
      channelData[i] = nextRand() * env;
    }

    applyBiquadBandlimitAndNormalizeInPlace(channelData, sr);
  }
  return buffer;
}

export function createStudioConvolverReverb(): any {
  const rawCtx = (Tone.getContext().rawContext || Tone.context.rawContext || Tone.context) as AudioContext;
  const inputGain = new Tone.Gain(1);
  const wetGain = new Tone.Gain(1);
  const convolver = rawCtx.createConvolver();
  convolver.normalize = false;
  convolver.buffer = buildStudioAcousticImpulseBuffer(rawCtx, DEFAULT_STUDIO_IR_DURATION_SEC);

  Tone.connect(inputGain, convolver);
  Tone.connect(convolver, wetGain);

  let currentDecay = DEFAULT_STUDIO_IR_DURATION_SEC;
  Object.defineProperty(inputGain, 'decay', {
    get: () => currentDecay,
    set: (val: number) => { currentDecay = Number(val) || DEFAULT_STUDIO_IR_DURATION_SEC; },
    configurable: true,
  });
  (inputGain as any).wet = wetGain.gain;
  (inputGain as any)._convolver = convolver;
  (inputGain as any).connect = (dest: any, ...args: any[]) => { wetGain.connect(dest, ...args); return inputGain; };
  (inputGain as any).disconnect = (dest?: any, ...args: any[]) => { wetGain.disconnect(dest, ...args); return inputGain; };
  return inputGain;
}
