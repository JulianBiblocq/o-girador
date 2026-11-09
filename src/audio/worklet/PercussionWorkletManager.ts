/**
 * O Girador - Orchestrateur Main Thread du Mixeur PCM AudioWorklet (< 140 lignes)
 * - Initialise `percussion-engine-processor` (24 sorties stéréo, 0 entrée).
 * - Coordonne `PercussionWorkletSlotRouter`, `PercussionWorkletSampleBridge` et `PercussionWorkletTrackSync`.
 * - Repli transparent (`isReady === false`) si `audioWorklet` est indisponible.
 */

import { getTone } from '../../ToneLoader';
import { InstrumentAudioConfig } from '../../data/audioConfig';
import { TrackGroup } from '../../types';
import {
  MAX_WORKLET_OUTPUTS, PurgeAllMessage, PurgeFromFrameMessage, PurgeTrackMessage, PushEventsMessage,
} from './percussionWorkletTypes';
import { PercussionWorkletSampleBridge } from './percussionWorkletSampleBridge';
import { PercussionWorkletSlotRouter } from './percussionWorkletSlotRouter';
import { PercussionWorkletTrackSync } from './percussionWorkletTrackSync';
import percussionWorkletUrl from './processor/percussionEngineProcessor?worker&url';

export { percussionWorkletUrl };

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
    initialTracks: TrackGroup[] = []
  ): Promise<boolean> {
    this.configMap = configMap;
    if (this._isReady && this.workletNode) return Promise.resolve(true);
    if (this.initPromise) return this.initPromise;

    const isSecure = typeof window !== 'undefined' ? window.isSecureContext !== false : true;
    const workletApi = (audioContext as any)?.audioWorklet;
    if (!isSecure || !workletApi || typeof workletApi.addModule !== 'function') {
      this._isReady = false;
      return Promise.resolve(false);
    }

    const p: Promise<boolean> = workletApi.addModule(percussionWorkletUrl).then(() => {
      const options: AudioWorkletNodeOptions = {
        numberOfInputs: 0,
        numberOfOutputs: MAX_WORKLET_OUTPUTS,
        outputChannelCount: new Array(MAX_WORKLET_OUTPUTS).fill(2),
      };
      const toneCtx = getTone()?.getContext?.();
      const node: AudioWorkletNode =
        toneCtx && toneCtx.rawContext === audioContext && typeof toneCtx.createAudioWorkletNode === 'function'
          ? toneCtx.createAudioWorkletNode('percussion-engine-processor', options)
          : new AudioWorkletNode(audioContext, 'percussion-engine-processor', options);

      this.workletNode = node;
      this.slotRouter.attachWorkletNode(audioContext, node);
      this.sampleBridge.attachPort(node.port);
      this.trackSync.resetDiffCache();
      this.trackSync.syncTracks(node.port, initialTracks, this.slotRouter, this.configMap);
      this._isReady = true;
      return true;
    }).catch(() => {
      this._isReady = false;
      this.workletNode = null;
      return false;
    }).finally(() => {
      this.initPromise = null;
    });

    this.initPromise = p;
    return p;
  }

  public ensureTrackSlot(audioContext: AudioContext, trackId: number | string, channel: unknown, tracks?: TrackGroup[]): number {
    const slot = this.slotRouter.ensureTrackSlot(audioContext, trackId, channel);
    if (slot > 0) {
      this.trackSync.invalidateSlot(slot);
      if (tracks) this.syncTracks(tracks);
    }
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
    try { this.workletNode.port.postMessage(msg, [eventsData.buffer]); } catch (_) {}
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
    this._isReady = false;
    this.initPromise = null;
    if (this.workletNode) {
      try { this.workletNode.port.onmessage = null; this.workletNode.disconnect(); } catch (_) {}
      this.workletNode = null;
    }
    this.sampleBridge.dispose();
    this.slotRouter.dispose();
    this.trackSync.dispose();
  }
}
