/**
 * O Girador - Routeur Multi-Sorties AudioWorklet (`0..23`) <-> Canaux Natifs (< 140 lignes)
 */

import { getTone } from '../../ToneLoader';
import { MAX_WORKLET_OUTPUTS } from './percussionWorkletTypes';

export const PREVIEW_WORKLET_SLOT = 0;

export function unwrapNativeAudioContext(ctx: unknown): AudioContext | null {
  let curr: any = ctx;
  const hasWin = typeof window !== 'undefined';
  const NativeCtx = hasWin ? (window.AudioContext || (window as any).webkitAudioContext) : null;
  for (let i = 0; i < 6 && curr; i++) {
    if (hasWin && NativeCtx && window.BaseAudioContext) {
      if (curr instanceof window.BaseAudioContext && curr.constructor === NativeCtx) return curr as AudioContext;
    } else if (!hasWin && curr && typeof curr.createGain === 'function' && !curr._nativeAudioContext && !curr._nativeContext) {
      return curr as AudioContext;
    }
    curr = curr._nativeAudioContext || curr._nativeContext || curr.rawContext || curr.context || null;
  }
  return null;
}

export function unwrapNativeAudioNode(target: unknown): AudioNode | null {
  let curr: any = target;
  const hasWinNode = typeof window !== 'undefined' && typeof window.AudioNode !== 'undefined';
  for (let i = 0; i < 10 && curr; i++) {
    if (hasWinNode ? curr instanceof window.AudioNode : (typeof curr.connect === 'function' && !curr._nativeAudioNode && !curr._gainNode && !curr.input)) {
      return curr as AudioNode;
    }
    curr = curr._nativeAudioNode || curr._nativeGainNode || curr._nativeAudioDestinationNode || curr._nativeNode
      || curr._gainNode || (curr.input && curr.input !== curr ? curr.input : null) || (curr.output && curr.output !== curr ? curr.output : null);
  }
  return null;
}

export class PercussionWorkletSlotRouter {
  private readonly slotOwnerTrackId = new Int32Array(MAX_WORKLET_OUTPUTS).fill(-1);
  private readonly slotConnected = new Uint8Array(MAX_WORKLET_OUTPUTS);
  private readonly trackToSlot = new Map<number, number>();
  private readonly slotBridgeGains: (GainNode | null)[] = new Array(MAX_WORKLET_OUTPUTS).fill(null);
  private readonly slotTargetChannel: unknown[] = new Array(MAX_WORKLET_OUTPUTS).fill(null);
  private sacKeepAlive: ConstantSourceNode | null = null;

  public get routedSlotCount(): number {
    let c = 0;
    for (let s = 1; s < MAX_WORKLET_OUTPUTS; s++) if (this.slotConnected[s] === 1) c++;
    return c;
  }

  private getDefaultDestination(audioContext: AudioContext | null): unknown {
    try { const Tone = getTone(); if (Tone?.getDestination) return Tone.getDestination(); } catch (_) {}
    return audioContext ? audioContext.destination : null;
  }

  private connectBridgeToTarget(audioContext: AudioContext, bridgeGain: GainNode, target: unknown): boolean {
    const nativeTarget = unwrapNativeAudioNode(target);
    if (!nativeTarget || (typeof window !== 'undefined' && window.AudioNode && !(nativeTarget instanceof window.AudioNode))) {
      console.error('[PercussionWorkletSlotRouter] Target is not a native window.AudioNode:', target);
      return false;
    }
    try {
      if (!this.sacKeepAlive && typeof audioContext.createConstantSource === 'function') {
        this.sacKeepAlive = audioContext.createConstantSource();
        this.sacKeepAlive.offset.value = 0; this.sacKeepAlive.start(0);
      }
      const Tone = getTone();
      if (this.sacKeepAlive && Tone?.connect) Tone.connect(this.sacKeepAlive, target as any);
    } catch (_) {}
    try { bridgeGain.connect(nativeTarget); return true; } catch (err) {
      console.error('[PercussionWorkletSlotRouter] Native bridgeGain.connect failed:', err);
      return false;
    }
  }

  public attachWorkletNode(audioContext: AudioContext, nativeCtx: AudioContext, workletNode: AudioWorkletNode): void {
    this.detachBridgeGains();
    for (let s = 0; s < MAX_WORKLET_OUTPUTS; s++) {
      const bridge = nativeCtx.createGain();
      bridge.gain.value = 1.0; this.slotBridgeGains[s] = bridge;
      try { workletNode.connect(bridge, s, 0); } catch (err) { console.error('[PercussionWorkletSlotRouter] workletNode.connect failed on slot', s, err); }
      if (s === PREVIEW_WORKLET_SLOT || this.slotOwnerTrackId[s] !== -1) {
        const ok = this.connectBridgeToTarget(audioContext, bridge, this.slotTargetChannel[s] ?? this.getDefaultDestination(audioContext));
        this.slotConnected[s] = ok ? 1 : 0;
        if (!ok && s > 0) { this.trackToSlot.delete(this.slotOwnerTrackId[s]); this.slotOwnerTrackId[s] = -1; }
      }
    }
  }

  public ensureTrackSlot(audioContext: AudioContext, trackId: number | string, channel: unknown): number {
    const numId = Number(trackId);
    if (!Number.isFinite(numId) || numId < 0) return -1;
    const target = channel ?? this.getDefaultDestination(audioContext);
    if (!unwrapNativeAudioNode(target)) {
      console.error(`[PercussionWorkletSlotRouter] Track ${numId} channel has no native AudioNode:`, channel);
      return -1;
    }
    let slot = this.trackToSlot.get(numId);
    if (slot === undefined) {
      for (let s = 1; s < MAX_WORKLET_OUTPUTS; s++) if (this.slotOwnerTrackId[s] === -1) { slot = s; break; }
      if (slot === undefined) return -1;
      this.slotOwnerTrackId[slot] = numId; this.trackToSlot.set(numId, slot);
    } else if (this.slotTargetChannel[slot] === channel) return slot;
    this.slotTargetChannel[slot] = channel;
    const bridge = this.slotBridgeGains[slot];
    if (bridge) {
      try { bridge.disconnect(); } catch (_) {}
      const ok = this.connectBridgeToTarget(audioContext, bridge, target);
      this.slotConnected[slot] = ok ? 1 : 0;
      if (!ok) { this.releaseTrackSlot(numId); return -1; }
    }
    return slot;
  }

  public releaseTrackSlot(trackId: number | string): number {
    const slot = this.trackToSlot.get(Number(trackId));
    if (slot === undefined) return -1;
    try { this.slotBridgeGains[slot]?.disconnect(); } catch (_) {}
    this.slotOwnerTrackId[slot] = -1; this.slotConnected[slot] = 0; this.slotTargetChannel[slot] = null;
    this.trackToSlot.delete(Number(trackId));
    return slot;
  }

  public hasWorkletSlot(trackId: number | string): boolean {
    const slot = this.trackToSlot.get(Number(trackId));
    return slot !== undefined && this.slotConnected[slot] === 1;
  }
  public getTrackSlot(trackId: number | string): number { return this.trackToSlot.get(Number(trackId)) ?? -1; }

  private detachBridgeGains(): void {
    this.slotConnected.fill(0);
    for (let s = 0; s < MAX_WORKLET_OUTPUTS; s++) {
      if (this.slotBridgeGains[s]) { try { this.slotBridgeGains[s]!.disconnect(); } catch (_) {} this.slotBridgeGains[s] = null; }
    }
  }

  public dispose(): void {
    this.detachBridgeGains();
    if (this.sacKeepAlive) { try { this.sacKeepAlive.stop(); this.sacKeepAlive.disconnect(); } catch (_) {} this.sacKeepAlive = null; }
    this.slotOwnerTrackId.fill(-1); this.slotTargetChannel.fill(null); this.trackToSlot.clear();
  }
}
