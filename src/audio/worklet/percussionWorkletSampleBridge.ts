/**
 * O Girador - Pont PCM Main Thread <-> AudioWorklet (`MAX_WORKLET_SAMPLES = 2048`) (< 120 lignes)
 * - Dédoublonnement strict + slot bouclé dédié (`loop::`) pour `Apito L` sur `Apito W long.ogg` sans tronquer `W`.
 * - Synchronisation temps réel avec `barulhoLoopRegistry` (re-bake instantané vers `PercussionEngineProcessor`).
 */

import { isBarulhoSamplePath } from '../barulho/barulhoLoopRegionAnalyzer';
import { LoopLabInstrumentId, resolveLoopInstrumentFromPath, subscribeLoopLabRegistry } from '../engine/barulhoLoopRegistry';
import { bindBufferPoolEviction } from '../engine/engineMemorySync';
import { normalizeCanonicalSampleKey } from '../engine/sampleFetchUtils';
import { buildWorkletLoadSampleMessage, isLoopSampleKeyMatchingInstrument, LOOP_KEY_PREFIX } from './percussionWorkletLoopPayload';
import { MAX_WORKLET_SAMPLES, UnloadSamplesMessage } from './percussionWorkletTypes';

export interface WorkletMessagePortLike {
  postMessage(message: unknown, transfer?: Transferable[]): void;
}

export class PercussionWorkletSampleBridge {
  private readonly pathToSampleId = new Map<string, number>();
  private readonly sampleIdToPath = new Map<number, string>();
  private readonly registeredBuffers = new Map<number, AudioBuffer>();
  private readonly sentToCurrentPort = new Set<number>();
  private unbindPoolEviction: (() => void) | null = null;
  private unbindLoopRegistry: (() => void) | null = null;
  private nextSampleId = 0;
  private port: WorkletMessagePortLike | null = null;

  constructor() {
    this.unbindLoopRegistry = subscribeLoopLabRegistry((instId) => this.rebakeLoopForInstrument(instId));
  }

  public get loadedSampleCount(): number { return this.sentToCurrentPort.size; }

  public syncBufferPool(bufferPool: Map<string, unknown>): void {
    if (!this.unbindPoolEviction) {
      this.unbindPoolEviction = bindBufferPoolEviction(bufferPool, (paths) => this.unregisterSampleBuffers(paths));
    }
    for (const [path, entry] of bufferPool.entries()) {
      const audioBuffer = typeof (entry as any)?.get === 'function' ? (entry as any).get() : entry;
      if (audioBuffer) this.registerSampleBuffer(path, audioBuffer as AudioBuffer);
    }
  }

  public attachPort(port: WorkletMessagePortLike | null): void {
    if (this.port === port) return;
    this.port = port;
    this.sentToCurrentPort.clear();
    if (!port) return;
    for (const [sampleId, audioBuffer] of this.registeredBuffers.entries()) this.postSampleToWorklet(sampleId, audioBuffer);
  }

  private allocateAndStoreKey(key: string, audioBuffer: AudioBuffer): number {
    let sampleId = this.pathToSampleId.get(key);
    if (sampleId === undefined) {
      if (this.nextSampleId >= MAX_WORKLET_SAMPLES) return -1;
      sampleId = this.nextSampleId++;
      this.pathToSampleId.set(key, sampleId);
      this.sampleIdToPath.set(sampleId, key);
    }
    this.registeredBuffers.set(sampleId, audioBuffer);
    if (!this.sentToCurrentPort.has(sampleId) && this.port) this.postSampleToWorklet(sampleId, audioBuffer);
    return sampleId;
  }

  public registerSampleBuffer(rawPath: string, audioBuffer: AudioBuffer): number {
    if (!rawPath || !audioBuffer || typeof audioBuffer.getChannelData !== 'function') return -1;
    const path = normalizeCanonicalSampleKey(rawPath);
    const primaryId = this.allocateAndStoreKey(path, audioBuffer);
    if (!isBarulhoSamplePath(path) && resolveLoopInstrumentFromPath(path) !== null) {
      this.allocateAndStoreKey(LOOP_KEY_PREFIX + path, audioBuffer);
    }
    return primaryId;
  }

  public unregisterSampleBuffers(paths: Iterable<string>): number[] {
    const freedIds: number[] = [];
    for (const rawPath of paths) {
      const path = normalizeCanonicalSampleKey(rawPath);
      for (const key of [path, LOOP_KEY_PREFIX + path]) {
        const sampleId = this.pathToSampleId.get(key);
        if (sampleId === undefined) continue;
        if (this.registeredBuffers.delete(sampleId) || this.sentToCurrentPort.delete(sampleId)) freedIds.push(sampleId);
      }
    }
    if (freedIds.length > 0 && this.port) {
      const msg: UnloadSamplesMessage = { type: 'UNLOAD_SAMPLES', sampleIds: freedIds };
      try { this.port.postMessage(msg); } catch (_) {}
    }
    return freedIds;
  }

  private rebakeLoopForInstrument(instId: LoopLabInstrumentId): void {
    if (!this.port) return;
    for (const [sampleId, key] of this.sampleIdToPath.entries()) {
      if (!isLoopSampleKeyMatchingInstrument(key, instId)) continue;
      const buf = this.registeredBuffers.get(sampleId);
      if (!buf) continue;
      this.sentToCurrentPort.delete(sampleId);
      this.postSampleToWorklet(sampleId, buf);
    }
  }

  private postSampleToWorklet(sampleId: number, audioBuffer: AudioBuffer): void {
    if (!this.port || audioBuffer.numberOfChannels < 1 || this.sentToCurrentPort.has(sampleId)) return;
    const msg = buildWorkletLoadSampleMessage(sampleId, this.sampleIdToPath.get(sampleId) ?? '', audioBuffer);
    try {
      this.port.postMessage(msg, msg.ch1 ? [msg.ch0.buffer, msg.ch1.buffer] : [msg.ch0.buffer]);
      this.sentToCurrentPort.add(sampleId);
    } catch (err) {
      console.error('[PercussionWorkletSampleBridge] Failed to transfer PCM buffer:', err);
    }
  }

  public getSampleId(rawPath: string, isLoop = false): number {
    const path = normalizeCanonicalSampleKey(rawPath);
    if (isLoop) {
      const loopId = this.pathToSampleId.get(LOOP_KEY_PREFIX + path);
      if (loopId !== undefined) return loopId;
    }
    return this.pathToSampleId.get(path) ?? -1;
  }

  public isSampleReadyInWorklet(rawPath: string): boolean {
    const id = this.pathToSampleId.get(normalizeCanonicalSampleKey(rawPath));
    return id !== undefined && this.sentToCurrentPort.has(id);
  }

  public dispose(): void {
    this.unbindPoolEviction?.(); this.unbindPoolEviction = null;
    this.unbindLoopRegistry?.(); this.unbindLoopRegistry = null; this.port = null;
    this.sentToCurrentPort.clear(); this.registeredBuffers.clear();
    this.pathToSampleId.clear(); this.sampleIdToPath.clear(); this.nextSampleId = 0;
  }
}
