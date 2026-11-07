/**
 * vocalPatternBufferCache.ts — Cache mémoire & orchestration Web Worker (`vocalDsp.worker.ts`) (< 140 lignes).
 */
import { synthesizeTimePitchHybridTdPsola } from './formantPreservingTimePitchEngine';
import type { VocalDspWorkerRequest, VocalDspWorkerResponse } from '../../workers/vocalDsp.worker';

export interface ScaledPatternTiming {
  alpha: number; scaledT1OffsetSec: number; scaledTrimStartSec: number; scaledTrimEndSec: number; when: number;
}

export interface VocalPatternDspCacheEntry {
  cacheKey: string; audioBuffer: AudioBuffer; alpha: number; recordedBpm: number; liveBpm: number;
  transpositionSemitones: number; deltaSemitones: number;
  scaledT1OffsetSec: number; scaledTrimStartSec: number; scaledTrimEndSec: number;
}

const dspBufferCache = new Map<string, VocalPatternDspCacheEntry>();
const pendingWorkerPromises = new Map<string, Promise<VocalPatternDspCacheEntry>>();
let dspWorkerInstance: Worker | null = null;
const workerResolvers = new Map<string, (res: VocalDspWorkerResponse) => void>();

export const clearVocalPatternDspCache = (): void => { dspBufferCache.clear(); pendingWorkerPromises.clear(); };

export function buildVocalDspCacheKey(patternIdOrComposite: string | number, currentBpm: number, vocalTransposeSteps: number, trackId?: string | number): string {
  const baseKey = trackId !== undefined && !String(patternIdOrComposite).includes('_') ? `${trackId}_${patternIdOrComposite}` : String(patternIdOrComposite);
  return `${baseKey}__dsp_${Math.round(Number(currentBpm || 88))}_${Math.round(Number(vocalTransposeSteps || 0))}`;
}

export function getCachedVocalPatternDspEntry(patternIdOrComposite: string | number, currentBpm: number, vocalTransposeSteps: number, trackId?: string | number): VocalPatternDspCacheEntry | undefined {
  return dspBufferCache.get(buildVocalDspCacheKey(patternIdOrComposite, currentBpm, vocalTransposeSteps, trackId)) ||
    dspBufferCache.get(buildVocalDspCacheKey(patternIdOrComposite, currentBpm, vocalTransposeSteps));
}
export const getCachedVocalPatternDsp = getCachedVocalPatternDspEntry;

export function computeScaledPatternTiming(
  pattern: { t1OffsetSec?: number; trimStartSec?: number; trimEndSec?: number; recordedBpm?: number },
  currentBpm: number, slotMeasureT1Time = 0, fallbackDurationSec = 0
): ScaledPatternTiming {
  const recBpm = Number(pattern.recordedBpm) > 0 ? Number(pattern.recordedBpm) : Number(currentBpm || 88);
  const curBpm = Number(currentBpm) > 0 ? Number(currentBpm) : recBpm;
  const alpha = Math.round(curBpm) === Math.round(recBpm) ? 1.0 : recBpm / curBpm;
  const rawT1 = Number(pattern.t1OffsetSec ?? 0), rawStart = Math.max(0, Number(pattern.trimStartSec ?? 0));
  const rawEnd = Number(pattern.trimEndSec) > rawStart ? Number(pattern.trimEndSec) : Math.max(rawStart + 0.05, fallbackDurationSec);
  const scaledT1OffsetSec = rawT1 * alpha, scaledTrimStartSec = rawStart * alpha, scaledTrimEndSec = rawEnd * alpha;
  return { alpha, scaledT1OffsetSec, scaledTrimStartSec, scaledTrimEndSec, when: slotMeasureT1Time + (scaledTrimStartSec - scaledT1OffsetSec) };
}

function createAudioBufferFromChannels(channels: Float32Array[], sampleRate: number): AudioBuffer {
  const numCh = Math.max(1, channels.length), length = Math.max(1, channels[0]?.length || 1);
  if (typeof AudioBuffer !== 'undefined') {
    try {
      const buf = new AudioBuffer({ numberOfChannels: numCh, length, sampleRate });
      for (let c = 0; c < numCh; c++) buf.copyToChannel(new Float32Array(channels[c]), c);
      return buf;
    } catch (_) {}
  }
  return {
    sampleRate, length, duration: length / sampleRate, numberOfChannels: numCh,
    getChannelData: (c: number) => channels[Math.min(numCh - 1, c)],
    copyFromChannel: (dst: Float32Array, c: number, start = 0) => dst.set(channels[c].subarray(start, start + dst.length)),
    copyToChannel: (src: Float32Array, c: number, start = 0) => channels[c].set(src, start),
  } as unknown as AudioBuffer;
}

function getDspWorker(): Worker | null {
  if (dspWorkerInstance) return dspWorkerInstance;
  if (typeof Worker === 'undefined' || typeof window === 'undefined') return null;
  try {
    dspWorkerInstance = new Worker(new URL('../../workers/vocalDsp.worker.ts', import.meta.url), { type: 'module' });
    dspWorkerInstance.onmessage = (e: MessageEvent<VocalDspWorkerResponse>) => {
      const cb = workerResolvers.get(e.data.requestId);
      if (cb) { workerResolvers.delete(e.data.requestId); cb(e.data); }
    };
    return dspWorkerInstance;
  } catch (_) { return null; }
}

export function getOrComputeVocalPatternDspSync(
  patternKey: string | number, sourceBuffer: AudioBuffer, recordedBpm: number, currentBpm: number,
  vocalTransposeSteps: number, packTranspositionSemitones = 0,
  timingMeta: { t1OffsetSec?: number; trimStartSec?: number; trimEndSec?: number } = {}
): VocalPatternDspCacheEntry {
  const cacheKey = buildVocalDspCacheKey(patternKey, currentBpm, vocalTransposeSteps);
  if (dspBufferCache.has(cacheKey)) return dspBufferCache.get(cacheKey)!;
  const scaled = computeScaledPatternTiming({ ...timingMeta, recordedBpm }, currentBpm, 0, sourceBuffer.duration);
  const deltaSemitones = Math.round(Number(vocalTransposeSteps || 0) - Number(packTranspositionSemitones || 0));
  const isIdentity = Math.round(currentBpm) === Math.round(recordedBpm) && deltaSemitones === 0;
  const outBuffer = isIdentity ? sourceBuffer : createAudioBufferFromChannels(
    Array.from({ length: sourceBuffer.numberOfChannels }, (_, c) =>
      synthesizeTimePitchHybridTdPsola(sourceBuffer.getChannelData(c), sourceBuffer.sampleRate, scaled.alpha, deltaSemitones)
    ),
    sourceBuffer.sampleRate
  );
  const entry: VocalPatternDspCacheEntry = {
    cacheKey, audioBuffer: outBuffer, alpha: isIdentity ? 1.0 : scaled.alpha, recordedBpm, liveBpm: currentBpm,
    transpositionSemitones: vocalTransposeSteps, deltaSemitones,
    scaledT1OffsetSec: scaled.scaledT1OffsetSec, scaledTrimStartSec: scaled.scaledTrimStartSec,
    scaledTrimEndSec: Math.min(outBuffer.duration, scaled.scaledTrimEndSec),
  };
  dspBufferCache.set(cacheKey, entry);
  return entry;
}

export async function requestVocalPatternDspAsync(
  patternKey: string | number, sourceBuffer: AudioBuffer, recordedBpm: number, currentBpm: number,
  vocalTransposeSteps: number, packTranspositionSemitones = 0,
  timingMeta: { t1OffsetSec?: number; trimStartSec?: number; trimEndSec?: number } = {},
  onReady?: (entry: VocalPatternDspCacheEntry) => void
): Promise<VocalPatternDspCacheEntry> {
  const cacheKey = buildVocalDspCacheKey(patternKey, currentBpm, vocalTransposeSteps);
  if (dspBufferCache.has(cacheKey)) { const hit = dspBufferCache.get(cacheKey)!; onReady?.(hit); return hit; }
  if (pendingWorkerPromises.has(cacheKey)) return pendingWorkerPromises.get(cacheKey)!;
  const scaled = computeScaledPatternTiming({ ...timingMeta, recordedBpm }, currentBpm, 0, sourceBuffer.duration);
  const deltaSemitones = Math.round(Number(vocalTransposeSteps || 0) - Number(packTranspositionSemitones || 0));
  const worker = getDspWorker();
  if ((Math.round(currentBpm) === Math.round(recordedBpm) && deltaSemitones === 0) || !worker) {
    const syncEntry = getOrComputeVocalPatternDspSync(patternKey, sourceBuffer, recordedBpm, currentBpm, vocalTransposeSteps, packTranspositionSemitones, timingMeta);
    onReady?.(syncEntry); return syncEntry;
  }
  const requestId = `${cacheKey}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const channels = Array.from({ length: sourceBuffer.numberOfChannels }, (_, c) => new Float32Array(sourceBuffer.getChannelData(c)));
  const promise = new Promise<VocalPatternDspCacheEntry>((resolve) => {
    workerResolvers.set(requestId, (res) => {
      pendingWorkerPromises.delete(cacheKey);
      const outBuffer = createAudioBufferFromChannels(res.channels, res.sampleRate);
      const entry: VocalPatternDspCacheEntry = {
        cacheKey, audioBuffer: outBuffer, alpha: scaled.alpha, recordedBpm, liveBpm: currentBpm,
        transpositionSemitones: vocalTransposeSteps, deltaSemitones,
        scaledT1OffsetSec: scaled.scaledT1OffsetSec, scaledTrimStartSec: scaled.scaledTrimStartSec,
        scaledTrimEndSec: Math.min(outBuffer.duration, scaled.scaledTrimEndSec),
      };
      dspBufferCache.set(cacheKey, entry); onReady?.(entry); resolve(entry);
    });
    const req: VocalDspWorkerRequest = { requestId, cacheKey, channels, sampleRate: sourceBuffer.sampleRate, alpha: scaled.alpha, semitones: deltaSemitones, timeStretchRatio: scaled.alpha, pitchShiftSemitones: deltaSemitones };
    worker.postMessage(req, channels.map((c) => c.buffer));
  });
  pendingWorkerPromises.set(cacheKey, promise);
  return promise;
}
export const getOrCreateFormantShiftedAudioBuffer = requestVocalPatternDspAsync;
