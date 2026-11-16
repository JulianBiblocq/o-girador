/**
 * O Girador - Pont PCM Main Thread <-> AudioWorklet (`MAX_WORKLET_SAMPLES = 2048`) (< 130 lignes)
 * - Dédoublonnement strict : un même `samplePath` déjà présent sur le port actif n'est jamais transféré deux fois.
 * - Libération réelle : `unregisterSampleBuffers` purge les références Main Thread ET envoie `UNLOAD_SAMPLES` au Worklet.
 */

import { analyzeBarulhoLoopRegion, bakeBarulhoChannelPcm, isBarulhoSamplePath } from '../barulho/barulhoLoopRegionAnalyzer';
import { bindBufferPoolEviction } from '../engine/engineMemorySync';
import { LoadSampleMessage, MAX_WORKLET_SAMPLES, UnloadSamplesMessage } from './percussionWorkletTypes';

export interface WorkletMessagePortLike {
  postMessage(message: unknown, transfer?: Transferable[]): void;
}

export class PercussionWorkletSampleBridge {
  private readonly pathToSampleId = new Map<string, number>();
  private readonly sampleIdToPath = new Map<number, string>();
  private readonly registeredBuffers = new Map<number, AudioBuffer>();
  private readonly sentToCurrentPort = new Set<number>();
  private unbindPoolEviction: (() => void) | null = null;
  private nextSampleId = 0;
  private port: WorkletMessagePortLike | null = null;

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
    for (const [sampleId, audioBuffer] of this.registeredBuffers.entries()) {
      this.postSampleToWorklet(sampleId, audioBuffer);
    }
  }

  public registerSampleBuffer(path: string, audioBuffer: AudioBuffer): number {
    if (!path || !audioBuffer || typeof audioBuffer.getChannelData !== 'function') return -1;

    let sampleId = this.pathToSampleId.get(path);
    if (sampleId === undefined) {
      if (this.nextSampleId >= MAX_WORKLET_SAMPLES) return -1;
      sampleId = this.nextSampleId++;
      this.pathToSampleId.set(path, sampleId);
      this.sampleIdToPath.set(sampleId, path);
    }

    this.registeredBuffers.set(sampleId, audioBuffer);
    if (this.sentToCurrentPort.has(sampleId)) return sampleId;
    if (this.port) this.postSampleToWorklet(sampleId, audioBuffer);
    return sampleId;
  }

  public unregisterSampleBuffers(paths: Iterable<string>): number[] {
    const freedIds: number[] = [];
    for (const path of paths) {
      const sampleId = this.pathToSampleId.get(path);
      if (sampleId === undefined) continue;
      const hadLocal = this.registeredBuffers.delete(sampleId);
      const hadRemote = this.sentToCurrentPort.delete(sampleId);
      if (hadLocal || hadRemote) freedIds.push(sampleId);
    }
    if (freedIds.length > 0 && this.port) {
      const msg: UnloadSamplesMessage = { type: 'UNLOAD_SAMPLES', sampleIds: freedIds };
      try { this.port.postMessage(msg); } catch (_) {}
    }
    return freedIds;
  }

  private postSampleToWorklet(sampleId: number, audioBuffer: AudioBuffer): void {
    if (!this.port || audioBuffer.numberOfChannels < 1 || this.sentToCurrentPort.has(sampleId)) return;

    const sr = audioBuffer.sampleRate > 0 ? audioBuffer.sampleRate : 48000;
    const path = this.sampleIdToPath.get(sampleId) ?? '';
    let ch0: Float32Array;
    let ch1: Float32Array | null;
    let bodyStartFrame = 0, loopResumeFrame = 0, loopWrapFrame = 0;

    if (isBarulhoSamplePath(path)) {
      const raw0 = audioBuffer.getChannelData(0);
      const reg = analyzeBarulhoLoopRegion(raw0, sr);
      ch0 = bakeBarulhoChannelPcm(raw0, reg);
      ch1 = audioBuffer.numberOfChannels > 1 ? bakeBarulhoChannelPcm(audioBuffer.getChannelData(1), reg) : null;
      bodyStartFrame = reg.bodyStartFrame; loopResumeFrame = reg.loopResumeFrame; loopWrapFrame = reg.loopWrapFrame;
    } else {
      ch0 = new Float32Array(audioBuffer.getChannelData(0));
      ch1 = audioBuffer.numberOfChannels > 1 ? new Float32Array(audioBuffer.getChannelData(1)) : null;
    }

    const msg: LoadSampleMessage = { type: 'LOAD_SAMPLE', sampleId, ch0, ch1, sampleRate: sr, bodyStartFrame, loopResumeFrame, loopWrapFrame };
    try {
      this.port.postMessage(msg, ch1 ? [ch0.buffer, ch1.buffer] : [ch0.buffer]);
      this.sentToCurrentPort.add(sampleId);
    } catch (err) {
      console.error('[PercussionWorkletSampleBridge] Failed to transfer PCM buffer:', err);
    }
  }

  public getSampleId(path: string): number { return this.pathToSampleId.get(path) ?? -1; }
  public isSampleReadyInWorklet(path: string): boolean {
    const id = this.pathToSampleId.get(path);
    return id !== undefined && this.sentToCurrentPort.has(id);
  }

  public dispose(): void {
    this.unbindPoolEviction?.(); this.unbindPoolEviction = null; this.port = null;
    this.sentToCurrentPort.clear(); this.registeredBuffers.clear();
    this.pathToSampleId.clear(); this.sampleIdToPath.clear(); this.nextSampleId = 0;
  }
}
