/**
 * vocalPatternBufferCache.ts
 * Étage 4 du moteur DSP Vocal Studio (Sequenciador) :
 * Mise à l'échelle exacte de `t1OffsetSec` / `trimStartSec` / `trimEndSec` (alpha = recordedBpm / liveBpm)
 * et cache asynchrone par motif (`${patternId}_${liveBpm}_${transpositionSemitones}`) piloté par Web Worker (< 138 lignes).
 */
import { synthesizeTimePitchHybridTdPsola } from './formantPreservingTimePitchEngine';
import type { VocalDspWorkerRequest, VocalDspWorkerResponse } from './vocalDspWorker';

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

export function buildVocalDspCacheKey(patternId: string | number, liveBpm: number, transpositionSemitones: number): string {
  const rBpm = Math.round(Number(liveBpm || 88) * 100) / 100;
  const rSt = Math.round(Number(transpositionSemitones || 0) * 100) / 100;
  return `${patternId}_${rBpm}_${rSt}`;
}

export function getCachedVocalPatternDspEntry(patternId: string | number, liveBpm: number, transpositionSemitones: number): VocalPatternDspCacheEntry | undefined {
  return dspBufferCache.get(buildVocalDspCacheKey(patternId, liveBpm, transpositionSemitones));
}

export function computeScaledPatternTiming(
  pattern: { t1OffsetSec?: number; trimStartSec?: number; trimEndSec?: number; recordedBpm?: number },
  liveBpm: number,
  slotMeasureT1Time = 0,
  fallbackDurationSec = 0
): ScaledPatternTiming {
  const recBpm = Number(pattern.recordedBpm) > 0 ? Number(pattern.recordedBpm) : Number(liveBpm || 88);
  const curBpm = Number(liveBpm) > 0 ? Number(liveBpm) : recBpm;
  const alpha = recBpm / curBpm;
  const rawT1 = Number(pattern.t1OffsetSec ?? 0), rawStart = Math.max(0, Number(pattern.trimStartSec ?? 0));
  const rawEnd = Number(pattern.trimEndSec) > rawStart ? Number(pattern.trimEndSec) : Math.max(rawStart + 0.05, fallbackDurationSec);
  const scaledT1OffsetSec = rawT1 * alpha, scaledTrimStartSec = rawStart * alpha, scaledTrimEndSec = rawEnd * alpha;
  const when = slotMeasureT1Time + (scaledTrimStartSec - scaledT1OffsetSec);
  return { alpha, scaledT1OffsetSec, scaledTrimStartSec, scaledTrimEndSec, when };
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
    dspWorkerInstance = new Worker(new URL('./vocalDspWorker.ts', import.meta.url), { type: 'module' });
    dspWorkerInstance.onmessage = (e: MessageEvent<VocalDspWorkerResponse>) => {
      const cb = workerResolvers.get(e.data.requestId);
      if (cb) { workerResolvers.delete(e.data.requestId); cb(e.data); }
    };
    return dspWorkerInstance;
  } catch (_) { return null; }
}

export function getOrComputeVocalPatternDspSync(
  patternId: string | number, sourceBuffer: AudioBuffer, recordedBpm: number, liveBpm: number,
  transpositionSemitones: number, packTranspositionSemitones = 0,
  timingMeta: { t1OffsetSec?: number; trimStartSec?: number; trimEndSec?: number } = {}
): VocalPatternDspCacheEntry {
  const cacheKey = buildVocalDspCacheKey(patternId, liveBpm, transpositionSemitones);
  const existing = dspBufferCache.get(cacheKey);
  if (existing) return existing;
  const scaled = computeScaledPatternTiming({ ...timingMeta, recordedBpm }, liveBpm, 0, sourceBuffer.duration);
  const deltaSemitones = Number(transpositionSemitones || 0) - Number(packTranspositionSemitones || 0);
  let outBuffer = sourceBuffer;
  if (Math.abs(scaled.alpha - 1.0) >= 1e-4 || Math.abs(deltaSemitones) >= 0.01) {
    const outChannels: Float32Array[] = [];
    for (let c = 0; c < sourceBuffer.numberOfChannels; c++) {
      outChannels.push(synthesizeTimePitchHybridTdPsola(sourceBuffer.getChannelData(c), sourceBuffer.sampleRate, scaled.alpha, deltaSemitones));
    }
    outBuffer = createAudioBufferFromChannels(outChannels, sourceBuffer.sampleRate);
  }
  const entry: VocalPatternDspCacheEntry = {
    cacheKey, audioBuffer: outBuffer, alpha: scaled.alpha, recordedBpm, liveBpm, transpositionSemitones, deltaSemitones,
    scaledT1OffsetSec: scaled.scaledT1OffsetSec, scaledTrimStartSec: scaled.scaledTrimStartSec,
    scaledTrimEndSec: Math.min(outBuffer.duration, scaled.scaledTrimEndSec),
  };
  dspBufferCache.set(cacheKey, entry);
  return entry;
}

export async function requestVocalPatternDspAsync(
  patternId: string | number, sourceBuffer: AudioBuffer, recordedBpm: number, liveBpm: number,
  transpositionSemitones: number, packTranspositionSemitones = 0,
  timingMeta: { t1OffsetSec?: number; trimStartSec?: number; trimEndSec?: number } = {}
): Promise<VocalPatternDspCacheEntry> {
  const cacheKey = buildVocalDspCacheKey(patternId, liveBpm, transpositionSemitones);
  if (dspBufferCache.has(cacheKey)) return dspBufferCache.get(cacheKey)!;
  if (pendingWorkerPromises.has(cacheKey)) return pendingWorkerPromises.get(cacheKey)!;
  const worker = getDspWorker();
  const scaled = computeScaledPatternTiming({ ...timingMeta, recordedBpm }, liveBpm, 0, sourceBuffer.duration);
  const deltaSemitones = Number(transpositionSemitones || 0) - Number(packTranspositionSemitones || 0);
  if (!worker || (Math.abs(scaled.alpha - 1.0) < 1e-4 && Math.abs(deltaSemitones) < 0.01)) {
    return getOrComputeVocalPatternDspSync(patternId, sourceBuffer, recordedBpm, liveBpm, transpositionSemitones, packTranspositionSemitones, timingMeta);
  }
  const requestId = `${cacheKey}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const channels = Array.from({ length: sourceBuffer.numberOfChannels }, (_, c) => new Float32Array(sourceBuffer.getChannelData(c)));
  const promise = new Promise<VocalPatternDspCacheEntry>((resolve) => {
    workerResolvers.set(requestId, (res) => {
      pendingWorkerPromises.delete(cacheKey);
      const outBuffer = createAudioBufferFromChannels(res.channels, res.sampleRate);
      const entry: VocalPatternDspCacheEntry = {
        cacheKey, audioBuffer: outBuffer, alpha: scaled.alpha, recordedBpm, liveBpm, transpositionSemitones, deltaSemitones,
        scaledT1OffsetSec: scaled.scaledT1OffsetSec, scaledTrimStartSec: scaled.scaledTrimStartSec,
        scaledTrimEndSec: Math.min(outBuffer.duration, scaled.scaledTrimEndSec),
      };
      dspBufferCache.set(cacheKey, entry);
      resolve(entry);
    });
    const req: VocalDspWorkerRequest = { requestId, cacheKey, channels, sampleRate: sourceBuffer.sampleRate, alpha: scaled.alpha, semitones: deltaSemitones };
    worker.postMessage(req, channels.map((c) => c.buffer));
  });
  pendingWorkerPromises.set(cacheKey, promise);
  return promise;
}
