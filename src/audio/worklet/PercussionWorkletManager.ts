/**
 * O Girador - Orchestrateur Main Thread du Mixeur PCM AudioWorklet (< 140 lignes)
 * - Charge le bundle IIFE autonome (`virtual:percussion-worklet-code`) via `Blob` URL
 *   directement sur le vrai `window.AudioContext` natif (contournant `standardized-audio-context`).
 */

import workletIIFECode from 'virtual:percussion-worklet-code';
import { InstrumentAudioConfig } from '../../data/audioConfig';
import { TrackGroup } from '../../types';
import {
  MAX_WORKLET_OUTPUTS, PurgeAllMessage, PurgeFromFrameMessage, PurgeTrackMessage, PushEventsMessage,
} from './percussionWorkletTypes';
import { PercussionWorkletSampleBridge } from './percussionWorkletSampleBridge';
import { PercussionWorkletSlotRouter, unwrapNativeAudioContext } from './percussionWorkletSlotRouter';
import { PercussionWorkletTrackSync } from './percussionWorkletTrackSync';

export { workletIIFECode };

export class PercussionWorkletManager {
  public readonly slotRouter = new PercussionWorkletSlotRouter();
  public readonly sampleBridge = new PercussionWorkletSampleBridge();
  public readonly trackSync = new PercussionWorkletTrackSync();

  private workletNode: AudioWorkletNode | null = null;
  private configMap = new Map<string, InstrumentAudioConfig>();
  private _isReady = false;
  private initPromise: Promise<boolean> | null = null;

  public get isReady(): boolean { return this._isReady && this.workletNode !== null; }
  public hasWorkletSlot(trackId: number | string): boolean { return this.slotRouter.hasWorkletSlot(trackId); }
  public registerSampleBuffer(path: string, audioBuffer: AudioBuffer): number { return this.sampleBridge.registerSampleBuffer(path, audioBuffer); }
  public syncTracks(tracks: TrackGroup[]): void { this.trackSync.syncTracks(this.workletNode?.port ?? null, tracks, this.slotRouter, this.configMap); }

  public init(
    audioContext: AudioContext,
    configMap: Map<string, InstrumentAudioConfig>,
    initialTracks: TrackGroup[] = [],
    bufferPool?: Map<string, unknown>
  ): Promise<boolean> {
    this.configMap = configMap;
    if (bufferPool) this.sampleBridge.syncBufferPool(bufferPool);
    if (this._isReady && this.workletNode) return Promise.resolve(true);
    if (this.initPromise) return this.initPromise;

    const hasWin = typeof window !== 'undefined';
    const isSecure = hasWin ? window.isSecureContext !== false : true;
    const nativeCtx = unwrapNativeAudioContext(audioContext);
    const NativeCtxCtor = hasWin ? (window.AudioContext || (window as any).webkitAudioContext) : null;
    const isNativeCtx = Boolean(
      nativeCtx && (!hasWin || (NativeCtxCtor && nativeCtx instanceof window.BaseAudioContext && nativeCtx.constructor === NativeCtxCtor))
    );
    if (!isSecure || !isNativeCtx || !nativeCtx || !nativeCtx.audioWorklet || typeof nativeCtx.audioWorklet.addModule !== 'function') {
      console.error('[PercussionWorklet] Native window.AudioContext with audioWorklet unavailable:', { isSecure, isNativeCtx, audioContext });
      this._isReady = false;
      return Promise.resolve(false);
    }

    const blobUrl = URL.createObjectURL(new Blob([workletIIFECode], { type: 'application/javascript; charset=utf-8' }));
    const p: Promise<boolean> = nativeCtx.audioWorklet.addModule(blobUrl).then(() => {
      const WorkletNodeCtor = (hasWin && window.AudioWorkletNode) || AudioWorkletNode;
      const node = new WorkletNodeCtor(nativeCtx, 'percussion-engine-processor', {
        numberOfInputs: 0,
        numberOfOutputs: MAX_WORKLET_OUTPUTS,
        outputChannelCount: new Array(MAX_WORKLET_OUTPUTS).fill(2),
      });
      node.onprocessorerror = (err) => console.error('[PercussionWorklet] Processor runtime error:', err);
      this.workletNode = node;
      this.slotRouter.attachWorkletNode(audioContext, nativeCtx, node);
      if (bufferPool) this.sampleBridge.syncBufferPool(bufferPool);
      this.sampleBridge.attachPort(node.port);
      this.trackSync.resetDiffCache();
      this.trackSync.syncTracks(node.port, initialTracks, this.slotRouter, this.configMap);
      this._isReady = true;
      if (import.meta.env.DEV) {
        console.info('[PercussionWorklet] Ready:', {
          isReady: this.isReady, isNativeCtx, routedSlots: this.slotRouter.routedSlotCount, loadedSamples: this.sampleBridge.loadedSampleCount,
        });
      }
      return true;
    }).catch((err) => {
      console.error('[PercussionWorklet] Failed to initialize AudioWorklet:', err);
      this._isReady = false; this.workletNode = null;
      return false;
    }).finally(() => {
      try { URL.revokeObjectURL(blobUrl); } catch (_) {}
      this.initPromise = null;
    });
    this.initPromise = p;
    return p;
  }

  public ensureTrackSlot(audioContext: AudioContext, trackId: number | string, channel: unknown, tracks?: TrackGroup[]): number {
    const slot = this.slotRouter.ensureTrackSlot(audioContext, trackId, channel);
    if (slot > 0) { this.trackSync.invalidateSlot(slot); if (tracks) this.syncTracks(tracks); }
    return slot;
  }

  public releaseTrackSlot(trackId: number | string): void {
    const numId = Number(trackId);
    if (Number.isFinite(numId)) this.purgeTrack(numId);
    const slot = this.slotRouter.releaseTrackSlot(trackId);
    if (slot > 0) this.trackSync.invalidateSlot(slot);
  }

  public pushPackedEvents(eventsData: Float64Array, eventCount: number): void {
    if (!this.workletNode || eventCount <= 0) return;
    const msg: PushEventsMessage = { type: 'PUSH_EVENTS', eventsData, eventCount };
    try { this.workletNode.port.postMessage(msg, [eventsData.buffer]); } catch (err) { console.error('[PercussionWorklet] pushPackedEvents error:', err); }
  }

  public purgeAll(): void {
    if (!this.workletNode) return;
    const msg: PurgeAllMessage = { type: 'PURGE_ALL' };
    try { this.workletNode.port.postMessage(msg); } catch (_) {}
  }

  public purgeFromFrame(fromFrame: number, measureSeqId?: number): void {
    if (!this.workletNode) return;
    const msg: PurgeFromFrameMessage = { type: 'PURGE_FROM_FRAME', fromFrame, measureSeqId };
    try { this.workletNode.port.postMessage(msg); } catch (_) {}
  }

  public purgeTrack(trackId: number): void {
    if (!this.workletNode) return;
    const msg: PurgeTrackMessage = { type: 'PURGE_TRACK', trackId };
    try { this.workletNode.port.postMessage(msg); } catch (_) {}
  }

  public dispose(): void {
    this._isReady = false; this.initPromise = null;
    if (this.workletNode) {
      try { this.workletNode.port.onmessage = null; this.workletNode.disconnect(); } catch (_) {}
      this.workletNode = null;
    }
    this.sampleBridge.dispose(); this.slotRouter.dispose(); this.trackSync.dispose();
  }
}
