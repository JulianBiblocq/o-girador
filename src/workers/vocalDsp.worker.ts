/**
 * vocalDsp.worker.ts
 * Web Worker dédié au calcul DSP Vocal Studio (Time-Stretching TD-PSOLA +
 * Préservation Formantique LPC + Protection 1:1 des Consonnes) hors du Main Thread UI (< 65 lignes).
 * Opère sur des Float32Array transférables (Transferable) sans copie mémoire.
 */
import { synthesizeTimePitchHybridTdPsola } from '../audio/vocalDsp/formantPreservingTimePitchEngine';

export interface VocalDspWorkerRequest {
  requestId: string;
  cacheKey: string;
  channels: Float32Array[];
  sampleRate: number;
  alpha: number;
  semitones: number;
  timeStretchRatio?: number;
  pitchShiftSemitones?: number;
}

export interface VocalDspWorkerResponse {
  requestId: string;
  cacheKey: string;
  channels: Float32Array[];
  sampleRate: number;
}

export function processVocalDspRequest(req: VocalDspWorkerRequest): VocalDspWorkerResponse {
  const effectiveAlpha = Number.isFinite(req.timeStretchRatio) && req.timeStretchRatio! > 0
    ? req.timeStretchRatio!
    : req.alpha;
  const effectiveSemitones = Number.isFinite(req.pitchShiftSemitones)
    ? req.pitchShiftSemitones!
    : req.semitones;

  const outChannels: Float32Array[] = [];
  for (let ch = 0; ch < req.channels.length; ch++) {
    const processed = synthesizeTimePitchHybridTdPsola(
      req.channels[ch],
      req.sampleRate,
      effectiveAlpha,
      effectiveSemitones
    );
    outChannels.push(processed);
  }
  return {
    requestId: req.requestId,
    cacheKey: req.cacheKey,
    channels: outChannels,
    sampleRate: req.sampleRate,
  };
}

if (typeof self !== 'undefined' && typeof (self as any).postMessage === 'function' && typeof window === 'undefined') {
  self.onmessage = (event: MessageEvent<VocalDspWorkerRequest>) => {
    const res = processVocalDspRequest(event.data);
    const transfer = res.channels.map((c) => c.buffer);
    (self as any).postMessage(res, transfer);
  };
}

