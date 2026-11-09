/**
 * O Girador - Audio Engine Channels & Static Pre-Connected GainNode Pool (32 voices/track)
 */

import { getTone } from '../../ToneLoader';
import { POOL_SIZE_PER_TRACK, PooledGainNode } from './engineTypes';

export class EngineChannels {
  public instrumentChannels = new Map<string, any>();
  public defaultInstrumentChannels = new Map<string, any>();
  public gainNodePools = new Map<string, PooledGainNode[]>();
  private poolTargetChannel = new Map<string, any>();
  private poolCursors = new Map<string, number>();

  private ensurePoolConnected(audioContext: AudioContext, poolKey: string, channel: any): PooledGainNode[] {
    const Tone = getTone();
    const target = channel || Tone.getDestination();
    let pool = this.gainNodePools.get(poolKey);
    const prevTarget = this.poolTargetChannel.get(poolKey);

    if (!pool) {
      pool = [];
      for (let i = 0; i < POOL_SIZE_PER_TRACK; i++) {
        const g = audioContext.createGain() as PooledGainNode;
        g.gain.value = 0;
        g._inUse = false;
        g._allocatedAt = 0;
        g._activeSource = null;
        g._poolKey = poolKey;
        try { Tone.connect(g, target); } catch (_) {}
        pool.push(g);
      }
      this.gainNodePools.set(poolKey, pool);
      this.poolTargetChannel.set(poolKey, target);
      this.poolCursors.set(poolKey, 0);
    } else if (prevTarget !== target) {
      for (let i = 0; i < pool.length; i++) {
        try { pool[i].disconnect(); } catch (_) {}
        try { Tone.connect(pool[i], target); } catch (_) {}
      }
      this.poolTargetChannel.set(poolKey, target);
    }
    return pool;
  }

  public setInstrumentChannel(audioContext: AudioContext, trackId: number | string, instrumentId: string, channel: any): void {
    const normalizedId = String(trackId);
    this.instrumentChannels.set(normalizedId, channel);
    this.defaultInstrumentChannels.set(instrumentId, channel);
    this.ensurePoolConnected(audioContext, normalizedId, channel);
    this.ensurePoolConnected(audioContext, `default_${instrumentId}`, channel);
  }

  public removeInstrumentChannel(trackId: number | string, voiceSynths: Map<string, any>): void {
    const normalizedId = String(trackId);
    const pool = this.gainNodePools.get(normalizedId);
    if (pool) {
      for (let i = 0; i < pool.length; i++) {
        try { pool[i].gain.cancelScheduledValues(0); pool[i].disconnect(); } catch (_) {}
      }
      this.gainNodePools.delete(normalizedId);
      this.poolTargetChannel.delete(normalizedId);
      this.poolCursors.delete(normalizedId);
    }
    const channel = this.instrumentChannels.get(normalizedId);
    if (channel) {
      try { if (typeof channel.disconnect === 'function') channel.disconnect(); } catch (_) {}
      this.instrumentChannels.delete(normalizedId);
    }
    const voiceSynth = voiceSynths.get(normalizedId);
    if (voiceSynth) {
      try { voiceSynth.releaseAll(); voiceSynth.disconnect(); voiceSynth.dispose(); } catch (_) {}
      voiceSynths.delete(normalizedId);
    }
  }

  public getGainNode(audioContext: AudioContext, trackId: number | string | null, instrumentId: string): GainNode {
    const hasTrack = trackId !== null && trackId !== undefined;
    const poolKey = hasTrack ? String(trackId) : `default_${instrumentId}`;
    const channel = hasTrack ? this.instrumentChannels.get(poolKey) : this.defaultInstrumentChannels.get(instrumentId);
    const pool = this.ensurePoolConnected(audioContext, poolKey, channel);
    const startCursor = this.poolCursors.get(poolKey) ?? 0;
    const len = pool.length;

    let chosen: PooledGainNode | null = null;
    for (let i = 0; i < len; i++) {
      const idx = (startCursor + i) % len;
      if (!pool[idx]._inUse) {
        chosen = pool[idx];
        this.poolCursors.set(poolKey, (idx + 1) % len);
        break;
      }
    }

    if (!chosen) {
      let oldestIdx = 0;
      let oldestTime = Infinity;
      for (let i = 0; i < len; i++) {
        const t = pool[i]._allocatedAt ?? 0;
        if (t < oldestTime) { oldestTime = t; oldestIdx = i; }
      }
      chosen = pool[oldestIdx];
      this.poolCursors.set(poolKey, (oldestIdx + 1) % len);
      if (chosen._activeSource) {
        try { chosen._activeSource.onended = null; chosen._activeSource.stop(); chosen._activeSource.disconnect(); } catch (_) {}
        chosen._activeSource = null;
      }
      try {
        chosen.gain.cancelScheduledValues(audioContext.currentTime);
        chosen.gain.setValueAtTime(0, audioContext.currentTime);
      } catch (_) {}
    }

    chosen._inUse = true;
    chosen._allocatedAt = audioContext.currentTime;
    return chosen;
  }

  public releaseGainNode(audioContext: AudioContext, _instrumentId: string, gainNode: GainNode): void {
    const pooled = gainNode as PooledGainNode;
    pooled._inUse = false;
    pooled._activeSource = null;
    const now = audioContext.currentTime;
    try { pooled.gain.cancelScheduledValues(now); pooled.gain.setValueAtTime(0, now); } catch (_) {}
  }

  public dispose(): void {
    for (const [_, pool] of this.gainNodePools) {
      for (let i = 0; i < pool.length; i++) {
        try { pool[i].gain.cancelScheduledValues(0); pool[i].disconnect(); } catch (_) {}
      }
    }
    this.gainNodePools.clear();
    this.poolTargetChannel.clear();
    this.poolCursors.clear();
    this.instrumentChannels.clear();
    this.defaultInstrumentChannels.clear();
  }
}
