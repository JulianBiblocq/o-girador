/**
 * O Girador - Routeur Multi-Sorties AudioWorklet (`0..23`) ↔ Canaux Tone.js (< 135 lignes)
 * - Slot `0` réservé aux previews / défaut ; Slots `1..23` alloués dynamiquement aux pistes.
 * - Pont `GainNode` dédié par slot (`workletNode.connect(bridgeGain, slot, 0)`) évitant
 *   tout `InvalidAccessError` entre le nœud multi-sorties et les wrappers Tone.js.
 */

import { getTone } from '../../ToneLoader';
import { MAX_WORKLET_OUTPUTS } from './percussionWorkletTypes';

export const PREVIEW_WORKLET_SLOT = 0;

export class PercussionWorkletSlotRouter {
  private readonly slotOwnerTrackId = new Int32Array(MAX_WORKLET_OUTPUTS).fill(-1);
  private readonly trackToSlot = new Map<number, number>();
  private readonly slotBridgeGains: (GainNode | null)[] = new Array(MAX_WORKLET_OUTPUTS).fill(null);
  private readonly slotTargetChannel: unknown[] = new Array(MAX_WORKLET_OUTPUTS).fill(null);

  private getDefaultDestination(audioContext: AudioContext | null): unknown {
    try {
      const Tone = getTone();
      if (Tone && typeof Tone.getDestination === 'function') return Tone.getDestination();
    } catch (_) {}
    return audioContext ? audioContext.destination : null;
  }

  private connectBridgeToTarget(bridgeGain: GainNode, target: unknown): void {
    if (!target) return;
    try {
      const Tone = getTone();
      if (Tone && typeof Tone.connect === 'function') {
        Tone.connect(bridgeGain, target as any);
        return;
      }
    } catch (_) {}

    let unwrapped: any = target;
    while (unwrapped && unwrapped.input && unwrapped.input !== unwrapped) {
      unwrapped = unwrapped.input;
    }
    try {
      if (unwrapped && typeof bridgeGain.connect === 'function') bridgeGain.connect(unwrapped);
    } catch (_) {}
  }

  public attachWorkletNode(audioContext: AudioContext, workletNode: AudioWorkletNode): void {
    this.detachBridgeGains();
    for (let s = 0; s < MAX_WORKLET_OUTPUTS; s++) {
      const bridge = audioContext.createGain();
      bridge.gain.value = 1.0;
      this.slotBridgeGains[s] = bridge;
      try { workletNode.connect(bridge, s, 0); } catch (_) {}

      if (s === PREVIEW_WORKLET_SLOT) {
        this.connectBridgeToTarget(bridge, this.slotTargetChannel[0] ?? this.getDefaultDestination(audioContext));
      } else if (this.slotOwnerTrackId[s] !== -1) {
        this.connectBridgeToTarget(bridge, this.slotTargetChannel[s] ?? this.getDefaultDestination(audioContext));
      }
    }
  }

  public ensureTrackSlot(audioContext: AudioContext, trackId: number | string, channel: unknown): number {
    const numId = Number(trackId);
    if (!Number.isFinite(numId) || numId < 0) return -1;

    const existingSlot = this.trackToSlot.get(numId);
    if (existingSlot !== undefined) {
      if (this.slotTargetChannel[existingSlot] !== channel) {
        this.slotTargetChannel[existingSlot] = channel;
        const bridge = this.slotBridgeGains[existingSlot];
        if (bridge) {
          try { bridge.disconnect(); } catch (_) {}
          this.connectBridgeToTarget(bridge, channel ?? this.getDefaultDestination(audioContext));
        }
      }
      return existingSlot;
    }

    let freeSlot = -1;
    for (let s = 1; s < MAX_WORKLET_OUTPUTS; s++) {
      if (this.slotOwnerTrackId[s] === -1) { freeSlot = s; break; }
    }
    if (freeSlot === -1) return -1;

    this.slotOwnerTrackId[freeSlot] = numId;
    this.trackToSlot.set(numId, freeSlot);
    this.slotTargetChannel[freeSlot] = channel;

    const bridge = this.slotBridgeGains[freeSlot];
    if (bridge) {
      try { bridge.disconnect(); } catch (_) {}
      this.connectBridgeToTarget(bridge, channel ?? this.getDefaultDestination(audioContext));
    }
    return freeSlot;
  }

  public releaseTrackSlot(trackId: number | string): number {
    const numId = Number(trackId);
    const slot = this.trackToSlot.get(numId);
    if (slot === undefined) return -1;
    try { this.slotBridgeGains[slot]?.disconnect(); } catch (_) {}
    this.slotOwnerTrackId[slot] = -1;
    this.slotTargetChannel[slot] = null;
    this.trackToSlot.delete(numId);
    return slot;
  }

  public hasWorkletSlot(trackId: number | string): boolean {
    return this.trackToSlot.has(Number(trackId));
  }

  public getTrackSlot(trackId: number | string): number {
    return this.trackToSlot.get(Number(trackId)) ?? -1;
  }

  private detachBridgeGains(): void {
    for (let s = 0; s < MAX_WORKLET_OUTPUTS; s++) {
      if (this.slotBridgeGains[s]) {
        try { this.slotBridgeGains[s]!.disconnect(); } catch (_) {}
        this.slotBridgeGains[s] = null;
      }
    }
  }

  public dispose(): void {
    this.detachBridgeGains();
    this.slotOwnerTrackId.fill(-1);
    this.slotTargetChannel.fill(null);
    this.trackToSlot.clear();
  }
}
