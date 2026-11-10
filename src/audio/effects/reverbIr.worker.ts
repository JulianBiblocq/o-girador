/**
 * reverbIr.worker.ts
 * Web Worker dédié à la synthèse mathématique d'IR stéréo 3 espaces (`street`, `wood_studio`, `great_hall`)
 * avec normalisation énergétique L2 hors du Main Thread UI (0 ms bloqué, transfert zéro-copie) (< 105 lignes).
 */
import type { ReverbSpaceType } from './studioFxPresets';

export interface StudioReverbImpulseOptions {
  decaySec?: number;
  spaceType?: ReverbSpaceType;
  preDelayMs?: number;
  lowCutHz?: number;
  dampHz?: number;
  stereoWidth?: number;
}

export interface ReverbIrWorkerRequest {
  id: number;
  sampleRate: number;
  opts: StudioReverbImpulseOptions;
}

export interface ReverbIrWorkerResponse {
  id: number;
  left: Float32Array<ArrayBuffer>;
  right: Float32Array<ArrayBuffer>;
  preDelaySamples: number;
  sampleRate: number;
}

export const DEFAULT_REVERB_IR_OPTS: Required<StudioReverbImpulseOptions> = {
  decaySec: 1.4,
  spaceType: 'wood_studio',
  preDelayMs: 12,
  lowCutHz: 140,
  dampHz: 7500,
  stereoWidth: 100,
};

const TARGET_STEREO_L2_ENERGY = 0.35355339;

export function buildStudioAcousticImpulseArrays(
  sampleRate: number,
  optionsOrDecay: number | StudioReverbImpulseOptions = DEFAULT_REVERB_IR_OPTS
): { chL: Float32Array<ArrayBuffer>; chR: Float32Array<ArrayBuffer>; preDelaySamples: number } {
  const sr = sampleRate > 8000 ? sampleRate : 48000;
  const raw: StudioReverbImpulseOptions = typeof optionsOrDecay === 'number' ? { decaySec: optionsOrDecay } : optionsOrDecay;
  const decaySec = Math.max(0.4, Math.min(4.0, raw.decaySec ?? DEFAULT_REVERB_IR_OPTS.decaySec));
  const spaceType: ReverbSpaceType = raw.spaceType ?? DEFAULT_REVERB_IR_OPTS.spaceType;
  const preDelayMs = Math.max(0, Math.min(80, raw.preDelayMs ?? DEFAULT_REVERB_IR_OPTS.preDelayMs));
  const lowCutHz = Math.max(80, Math.min(250, raw.lowCutHz ?? DEFAULT_REVERB_IR_OPTS.lowCutHz));
  const dampHz = Math.max(2500, Math.min(12000, raw.dampHz ?? DEFAULT_REVERB_IR_OPTS.dampHz));
  const stereoWidth = Math.max(0, Math.min(100, raw.stereoWidth ?? DEFAULT_REVERB_IR_OPTS.stereoWidth));

  const preDelaySamples = Math.round((preDelayMs / 1000) * sr);
  const length = preDelaySamples + Math.max(64, Math.round(decaySec * sr));
  const chL = new Float32Array(new ArrayBuffer(length * 4));
  const chR = new Float32Array(new ArrayBuffer(length * 4));
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

let latestWorkerReqId = 0;

if (typeof self !== 'undefined' && typeof (self as any).postMessage === 'function' && typeof window === 'undefined') {
  self.onmessage = (event: MessageEvent<ReverbIrWorkerRequest>) => {
    const req = event.data;
    if (!req || req.id < latestWorkerReqId) return;
    latestWorkerReqId = req.id;
    const sr = req.sampleRate > 8000 ? req.sampleRate : 48000;
    const { chL, chR, preDelaySamples } = buildStudioAcousticImpulseArrays(sr, req.opts);
    if (req.id < latestWorkerReqId) return;
    const res: ReverbIrWorkerResponse = { id: req.id, left: chL, right: chR, preDelaySamples, sampleRate: sr };
    (self as any).postMessage(res, [chL.buffer, chR.buffer]);
  };
}

