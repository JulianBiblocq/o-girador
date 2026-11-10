/**
 * studioReverbImpulse.ts
 * Synthèse IR acoustique 3 espaces (`street`, `wood_studio`, `great_hall`) :
 * - Silence strict pendant `preDelayMs` (`0..80 ms`), coupe-bas (`80..250 Hz`) et amortissement HF (`2.5..12 kHz`).
 * - Normalisation énergétique stéréo L2 stricte (`0.00 dB` d'écart entre `0.4 s` et `4.0 s`) (< 135 lignes).
 */
import * as Tone from 'tone';
import type { ReverbSpaceType } from './studioFxPresets';
import { safeRampTo } from '../../utils/audio/safeAudioParamRamp';

export interface StudioReverbImpulseOptions {
  decaySec?: number; spaceType?: ReverbSpaceType; preDelayMs?: number;
  lowCutHz?: number; dampHz?: number; stereoWidth?: number;
}

const DEFAULT_OPTS: Required<StudioReverbImpulseOptions> = {
  decaySec: 1.4, spaceType: 'wood_studio', preDelayMs: 12,
  lowCutHz: 140, dampHz: 7500, stereoWidth: 100,
};

const TARGET_STEREO_L2_ENERGY = 0.35355339;

export function mapReverbTimeKnobToDecaySec(timeVal: number): number {
  const num = Number.isFinite(timeVal) ? timeVal : 35;
  if (num >= 0.4 && num <= 4.0) return num;
  return Number((0.4 + (Math.max(0, Math.min(100, num)) / 100) * 3.6).toFixed(3));
}

export function buildStudioAcousticImpulseArrays(
  sampleRate: number,
  optionsOrDecay: number | StudioReverbImpulseOptions = DEFAULT_OPTS
): { chL: Float32Array; chR: Float32Array; preDelaySamples: number } {
  const sr = sampleRate > 8000 ? sampleRate : 48000;
  const raw: StudioReverbImpulseOptions = typeof optionsOrDecay === 'number' ? { decaySec: optionsOrDecay } : optionsOrDecay;
  const decaySec = Math.max(0.4, Math.min(4.0, raw.decaySec ?? DEFAULT_OPTS.decaySec));
  const spaceType: ReverbSpaceType = raw.spaceType ?? DEFAULT_OPTS.spaceType;
  const preDelayMs = Math.max(0, Math.min(80, raw.preDelayMs ?? DEFAULT_OPTS.preDelayMs));
  const lowCutHz = Math.max(80, Math.min(250, raw.lowCutHz ?? DEFAULT_OPTS.lowCutHz));
  const dampHz = Math.max(2500, Math.min(12000, raw.dampHz ?? DEFAULT_OPTS.dampHz));
  const stereoWidth = Math.max(0, Math.min(100, raw.stereoWidth ?? DEFAULT_OPTS.stereoWidth));

  const preDelaySamples = Math.round((preDelayMs / 1000) * sr);
  const length = preDelaySamples + Math.max(64, Math.round(decaySec * sr));
  const chL = new Float32Array(length), chR = new Float32Array(length);
  const attackSec = spaceType === 'street' ? 0.003 : spaceType === 'great_hall' ? 0.028 : 0.012;
  const decayRate = spaceType === 'street' ? 6.2 : spaceType === 'great_hall' ? 4.4 : 5.2;
  const attackSamples = Math.max(1, Math.round(attackSec * sr));
  const dt = 1 / sr, rcHp = 1 / (2 * Math.PI * lowCutHz), alphaHp = rcHp / (rcHp + dt);
  const rcLp = 1 / (2 * Math.PI * dampHz), alphaLp = dt / (rcLp + dt);

  for (let ch = 0; ch < 2; ch++) {
    const data = ch === 0 ? chL : chR;
    let seed = ch === 0 ? 0x13579bdf : 0x2468ace1, prevX = 0, prevHp = 0, lpY = 0;
    for (let i = preDelaySamples; i < length; i++) {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      const noise = (seed / 0xffffffff) * 2 - 1, relIdx = i - preDelaySamples, t = relIdx / sr;
      const fadeIn = relIdx < attackSamples ? 0.5 * (1 - Math.cos(Math.PI * (relIdx / attackSamples))) : 1;
      const earlyMod = spaceType === 'street' && relIdx < sr * 0.045 ? 1 + 0.35 * Math.sin(relIdx * 0.043) : 1;
      const x = noise * fadeIn * earlyMod * Math.exp(-decayRate * (t / decaySec));
      const hp = alphaHp * (prevHp + x - prevX);
      prevX = x; prevHp = hp;
      lpY += alphaLp * (hp - lpY);
      data[i] = lpY;
    }
  }

  const width = stereoWidth / 100;
  let totalSq = 0;
  for (let i = preDelaySamples; i < length; i++) {
    const mid = 0.5 * (chL[i] + chR[i]), side = 0.5 * (chL[i] - chR[i]) * width;
    const l = mid + side, r = mid - side;
    chL[i] = l; chR[i] = r; totalSq += l * l + r * r;
  }
  const normScale = totalSq > 1e-12 ? TARGET_STEREO_L2_ENERGY / Math.sqrt(totalSq) : 0;
  for (let i = preDelaySamples; i < length; i++) { chL[i] *= normScale; chR[i] *= normScale; }
  return { chL, chR, preDelaySamples };
}

export function buildStudioAcousticImpulseBuffer(
  rawCtx: BaseAudioContext, optionsOrDecay: number | StudioReverbImpulseOptions = DEFAULT_OPTS
): AudioBuffer {
  const sr = rawCtx.sampleRate || 48000;
  const { chL, chR } = buildStudioAcousticImpulseArrays(sr, optionsOrDecay);
  const buffer = rawCtx.createBuffer(2, chL.length, sr);
  buffer.getChannelData(0).set(chL); buffer.getChannelData(1).set(chR);
  return buffer;
}

export function updateStudioReverbNode(reverbNode: any, patch: Partial<StudioReverbImpulseOptions>, immediate = false): void {
  if (!reverbNode?._convolver || !reverbNode?._reverbOpts) return;
  const cur: Required<StudioReverbImpulseOptions> = reverbNode._reverbOpts;
  const next: Required<StudioReverbImpulseOptions> = {
    decaySec: patch.decaySec !== undefined ? Math.max(0.4, Math.min(4.0, patch.decaySec)) : cur.decaySec,
    spaceType: patch.spaceType ?? cur.spaceType,
    preDelayMs: patch.preDelayMs !== undefined ? Math.max(0, Math.min(80, patch.preDelayMs)) : cur.preDelayMs,
    lowCutHz: patch.lowCutHz !== undefined ? Math.max(80, Math.min(250, patch.lowCutHz)) : cur.lowCutHz,
    dampHz: patch.dampHz !== undefined ? Math.max(2500, Math.min(12000, patch.dampHz)) : cur.dampHz,
    stereoWidth: patch.stereoWidth !== undefined ? Math.max(0, Math.min(100, patch.stereoWidth)) : cur.stereoWidth,
  };
  const changed =
    Math.abs(next.decaySec - cur.decaySec) > 1e-3 || next.spaceType !== cur.spaceType ||
    Math.abs(next.preDelayMs - cur.preDelayMs) > 0.1 || Math.abs(next.lowCutHz - cur.lowCutHz) > 0.5 ||
    Math.abs(next.dampHz - cur.dampHz) > 5 || Math.abs(next.stereoWidth - cur.stereoWidth) > 0.5;
  if (!changed) return;
  reverbNode._reverbOpts = next;
  if (reverbNode._rebuildTimer) clearTimeout(reverbNode._rebuildTimer);
  const applyRebuild = () => {
    try {
      const targetWet = reverbNode.wet?.value ?? 1;
      if (!immediate && reverbNode.wet) safeRampTo(reverbNode.wet, 0, 0.012);
      reverbNode._convolver.buffer = buildStudioAcousticImpulseBuffer(reverbNode._rawCtx, reverbNode._reverbOpts);
      if (!immediate && reverbNode.wet) safeRampTo(reverbNode.wet, targetWet, 0.025);
    } catch { /* ignore */ }
  };
  if (immediate) { applyRebuild(); return; }
  reverbNode._rebuildTimer = setTimeout(applyRebuild, 150);
}

export function createStudioConvolverReverb(): any {
  const rawCtx = (Tone.getContext().rawContext || Tone.context.rawContext || Tone.context) as AudioContext;
  const inputGain = new Tone.Gain(1) as any, wetGain = new Tone.Gain(1), convolver = rawCtx.createConvolver();
  convolver.normalize = false;
  inputGain._rawCtx = rawCtx; inputGain._convolver = convolver; inputGain._reverbOpts = { ...DEFAULT_OPTS };
  convolver.buffer = buildStudioAcousticImpulseBuffer(rawCtx, inputGain._reverbOpts);
  Tone.connect(inputGain, convolver); Tone.connect(convolver, wetGain);
  inputGain.output = wetGain;
  Object.defineProperty(inputGain, 'decay', {
    get: () => inputGain._reverbOpts.decaySec,
    set: (val: number) => updateStudioReverbNode(inputGain, { decaySec: mapReverbTimeKnobToDecaySec(val) }),
    configurable: true,
  });
  inputGain.wet = wetGain.gain;
  inputGain.setWetSmooth = (w: number) => safeRampTo(wetGain.gain, Math.max(0, Math.min(1, w)), 0.025);
  inputGain.connect = (dest: any, ...a: any[]) => { wetGain.connect(dest, ...a); return inputGain; };
  inputGain.disconnect = (dest?: any, ...a: any[]) => { wetGain.disconnect(dest, ...a); return inputGain; };
  return inputGain;
}
