/**
 * O Girador - Audio Engine Channels & Gain Node Pooling
 */

import { getTone } from '../../ToneLoader';
import { MAX_POOL_SIZE } from './engineTypes';

export class EngineChannels {
  public instrumentChannels = new Map<string, any>();
  public defaultInstrumentChannels = new Map<string, any>();
  public gainNodePools = new Map<string, GainNode[]>();

  public setInstrumentChannel(
    audioContext: AudioContext,
    trackId: number | string,
    instrumentId: string,
    channel: any
  ): void {
    const normalizedId = String(trackId);
    this.instrumentChannels.set(normalizedId, channel);
    this.defaultInstrumentChannels.set(instrumentId, channel);

    if (!this.gainNodePools.has(instrumentId)) {
      const pool: GainNode[] = [];
      for (let i = 0; i < 15; i++) {
        const gainNode = audioContext.createGain();
        (gainNode as any)._isReleased = true;
        gainNode.gain.value = 0;
        pool.push(gainNode);
      }
      this.gainNodePools.set(instrumentId, pool);
    }
  }

  public removeInstrumentChannel(
    trackId: number | string,
    voiceSynths: Map<string, any>
  ): void {
    const normalizedId = String(trackId);
    const channel = this.instrumentChannels.get(normalizedId);
    if (channel) {
      try {
        if (typeof channel.disconnect === 'function') channel.disconnect();
      } catch (_) {}
      this.instrumentChannels.delete(normalizedId);
    }
    const voiceSynth = voiceSynths.get(normalizedId);
    if (voiceSynth) {
      try {
        voiceSynth.releaseAll();
        voiceSynth.disconnect();
        voiceSynth.dispose();
      } catch (_) {}
      voiceSynths.delete(normalizedId);
    }
  }

  public getGainNode(
    audioContext: AudioContext,
    trackId: number | string | null,
    instrumentId: string
  ): GainNode {
    const Tone = getTone();
    let gainNode: GainNode;

    const pool = this.gainNodePools.get(instrumentId);
    if (pool && pool.length > 0) {
      gainNode = pool.pop()!;
      (gainNode as any)._isReleased = false;
    } else {
      gainNode = audioContext.createGain();
      (gainNode as any)._isReleased = false;
      gainNode.gain.value = 0;
    }

    const channel = (trackId !== null && trackId !== undefined)
      ? this.instrumentChannels.get(String(trackId))
      : this.defaultInstrumentChannels.get(instrumentId);

    if (channel) {
      Tone.connect(gainNode, channel);
    } else {
      Tone.connect(gainNode, Tone.getDestination());
    }

    return gainNode;
  }

  public releaseGainNode(
    audioContext: AudioContext,
    instrumentId: string,
    gainNode: GainNode
  ): void {
    if ((gainNode as any)._isReleased) return;
    (gainNode as any)._isReleased = true;

    const currentTime = audioContext.currentTime;
    try {
      gainNode.gain.cancelScheduledValues(currentTime);
      gainNode.gain.setValueAtTime(0, currentTime);
    } catch (_) {}

    try {
      gainNode.disconnect();
    } catch (_) {}

    const pool = this.gainNodePools.get(instrumentId);
    if (pool && pool.length < MAX_POOL_SIZE) {
      pool.push(gainNode);
    }
  }

  public dispose(): void {
    for (const [_, pool] of this.gainNodePools) {
      pool.forEach((gainNode) => {
        try {
          gainNode.gain.cancelScheduledValues(0);
          gainNode.disconnect();
        } catch (_) {}
      });
    }
    this.gainNodePools.clear();
    this.instrumentChannels.clear();
    this.defaultInstrumentChannels.clear();
  }
}
