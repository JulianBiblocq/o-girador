/**
 * studioSaturationChain.ts
 * Saturation Harmonique à Lampe « Bass-Protected » 100 % Web Audio natif (< 130 lignes) :
 * - Chaîne statique : `BiquadFilterNode (HPF 60..300 Hz, déf. 180 Hz)` -> `WaveShaperNode (4096 pts)`
 *   -> `BiquadFilterNode (LPF 2.5..12 kHz, déf. 6.5 kHz)` -> `GainNode` compensé -> `wetGain`.
 * - 2 caractères : `'soft_tube'` (harmoniques paires, `f(0) = 0`) & `'biting_filament'` (mordant Caixa).
 * - Oversampling adaptatif : `isEcoMode ? 'none' : '4x'`.
 */
import * as Tone from 'tone';
import type { TubeSaturationCharacter } from './studioFxPresets';
import { safeRampTo } from '../../utils/audio/safeAudioParamRamp';

export interface StudioSaturationOptions {
  drivePct?: number;
  character?: TubeSaturationCharacter;
  preHpfHz?: number;
  toneHz?: number;
}

const DEFAULT_SAT_OPTS: Required<StudioSaturationOptions> = {
  drivePct: 40,
  character: 'soft_tube',
  preHpfHz: 180,
  toneHz: 6500,
};

export function resolveSaturationOversample(isEcoMode: boolean): OverSampleType {
  return isEcoMode ? 'none' : '4x';
}

export function buildTubeSaturationCurve(
  drivePct: number,
  character: TubeSaturationCharacter = 'soft_tube',
  numSamples = 4096
): Float32Array<ArrayBuffer> {
  const n = Math.max(256, numSamples | 0);
  const curve = new Float32Array(new ArrayBuffer(n * 4));
  const normDrive = Math.max(0, Math.min(100, Number.isFinite(drivePct) ? drivePct : 40)) / 100;
  const k = 0.6 + normDrive * 5.4;

  if (character === 'biting_filament') {
    const driveK = 1.1 + normDrive * 7.5;
    const norm = Math.atan(driveK) || 1;
    for (let i = 0; i < n; i++) {
      const x = (i * 2) / (n - 1) - 1;
      const body = Math.atan(driveK * x) / norm;
      const edge = (x * driveK * 0.5) / (1 + Math.abs(x * driveK * 0.5));
      curve[i] = 0.72 * body + 0.28 * edge;
    }
  } else {
    const bias = 0.18 + normDrive * 0.14;
    const tanhBias = Math.tanh(bias);
    const posNorm = Math.max(1e-6, Math.tanh(k + bias) - tanhBias);
    for (let i = 0; i < n; i++) {
      const x = (i * 2) / (n - 1) - 1;
      curve[i] = (Math.tanh(k * x + bias) - tanhBias) / posNorm;
    }
  }
  curve[n >> 1] = 0;
  return curve;
}

export function updateStudioSaturationNode(
  satNode: any,
  patch: Partial<StudioSaturationOptions>,
  isEcoMode?: boolean
): void {
  if (!satNode?._shaper || !satNode?._satOpts) return;
  const cur: Required<StudioSaturationOptions> = satNode._satOpts;
  const next: Required<StudioSaturationOptions> = {
    drivePct: patch.drivePct !== undefined ? Math.max(0, Math.min(100, patch.drivePct)) : cur.drivePct,
    character: patch.character ?? cur.character,
    preHpfHz: patch.preHpfHz !== undefined ? Math.max(60, Math.min(300, patch.preHpfHz)) : cur.preHpfHz,
    toneHz: patch.toneHz !== undefined ? Math.max(2500, Math.min(12000, patch.toneHz)) : cur.toneHz,
  };
  if (Math.abs(next.drivePct - cur.drivePct) > 0.2 || next.character !== cur.character) {
    satNode._shaper.curve = buildTubeSaturationCurve(next.drivePct, next.character);
    const compGain = 1 / (1 + 0.28 * (next.drivePct / 100));
    safeRampTo(satNode._compGain.gain, compGain, 0.02);
  }
  if (Math.abs(next.preHpfHz - cur.preHpfHz) > 0.5) {
    safeRampTo(satNode._preHpf.frequency, next.preHpfHz, 0.02);
  }
  if (Math.abs(next.toneHz - cur.toneHz) > 5) {
    safeRampTo(satNode._postLpf.frequency, next.toneHz, 0.02);
  }
  if (isEcoMode !== undefined) {
    satNode._shaper.oversample = resolveSaturationOversample(isEcoMode);
  }
  satNode._satOpts = next;
}

export function createStudioSaturationChain(isEcoMode = false): any {
  const rawCtx = (Tone.getContext().rawContext || Tone.context.rawContext || Tone.context) as AudioContext;
  const inputGain = new Tone.Gain(1) as any;
  const wetGain = new Tone.Gain(1);

  const preHpf = rawCtx.createBiquadFilter();
  preHpf.type = 'highpass'; preHpf.frequency.value = DEFAULT_SAT_OPTS.preHpfHz; preHpf.Q.value = Math.SQRT1_2;
  const shaper = rawCtx.createWaveShaper();
  shaper.curve = buildTubeSaturationCurve(DEFAULT_SAT_OPTS.drivePct, DEFAULT_SAT_OPTS.character);
  shaper.oversample = resolveSaturationOversample(isEcoMode);
  const postLpf = rawCtx.createBiquadFilter();
  postLpf.type = 'lowpass'; postLpf.frequency.value = DEFAULT_SAT_OPTS.toneHz; postLpf.Q.value = Math.SQRT1_2;
  const compGain = rawCtx.createGain();
  compGain.gain.value = 1 / (1 + 0.28 * (DEFAULT_SAT_OPTS.drivePct / 100));

  Tone.connect(inputGain, preHpf); preHpf.connect(shaper); shaper.connect(postLpf);
  postLpf.connect(compGain); Tone.connect(compGain, wetGain);
  inputGain.output = wetGain;

  inputGain._satOpts = { ...DEFAULT_SAT_OPTS };
  inputGain._preHpf = preHpf; inputGain._shaper = shaper;
  inputGain._postLpf = postLpf; inputGain._compGain = compGain;
  Object.defineProperty(inputGain, 'distortion', {
    get: () => inputGain._satOpts.drivePct / 100,
    set: (val: number) => updateStudioSaturationNode(inputGain, { drivePct: Math.max(0, Math.min(1, Number(val) || 0)) * 100 }),
    configurable: true,
  });
  Object.defineProperty(inputGain, 'oversample', {
    get: () => shaper.oversample,
    set: (val: OverSampleType) => { shaper.oversample = val; },
    configurable: true,
  });
  inputGain.wet = wetGain.gain;
  inputGain.connect = (dest: any, ...a: any[]) => { wetGain.connect(dest, ...a); return inputGain; };
  inputGain.disconnect = (dest?: any, ...a: any[]) => { wetGain.disconnect(dest, ...a); return inputGain; };
  inputGain.dispose = () => {
    try { preHpf.disconnect(); shaper.disconnect(); postLpf.disconnect(); compGain.disconnect(); } catch { /* ignore */ }
    inputGain.disconnect(); wetGain.dispose();
  };
  return inputGain;
}
