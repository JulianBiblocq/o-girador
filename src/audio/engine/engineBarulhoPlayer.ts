/**
 * O Girador - Audio Engine Barulho (Looping Sounds) Player (< 75 lignes)
 */

import { GainNodeMapping } from './engineTypes';
import { EngineChannels } from './engineChannels';
import { EngineVoiceGuard } from './engineVoiceGuard';

export class EngineBarulhoPlayer {
  public activeBarulhoNodes = new Map<string, AudioBufferSourceNode>();
  public activeBarulhoGains = new Map<string, GainNode>();
  private audioContext!: AudioContext;
  private channels!: EngineChannels;
  private voiceGuard!: EngineVoiceGuard;
  private activeGainNodes!: Map<AudioBufferSourceNode, GainNodeMapping>;

  public init(
    audioContext: AudioContext,
    channels: EngineChannels,
    voiceGuard: EngineVoiceGuard,
    activeGainNodes: Map<AudioBufferSourceNode, GainNodeMapping>
  ): void {
    this.audioContext = audioContext;
    this.channels = channels;
    this.voiceGuard = voiceGuard;
    this.activeGainNodes = activeGainNodes;
  }

  public fadeOutBarulho(
    instrumentId: string,
    time: number = this.audioContext?.currentTime || 0,
    fadeTime = 0.018
  ): void {
    const activeNode = this.activeBarulhoNodes.get(instrumentId);
    const activeGain = this.activeBarulhoGains.get(instrumentId);
    if (activeNode && activeGain) {
      this.voiceGuard?.removeActiveVoice(instrumentId, activeNode);
      try {
        const gp = activeGain.gain as AudioParam & { cancelAndHoldAtTime?: (t: number) => AudioParam };
        if (typeof gp.cancelAndHoldAtTime === 'function') gp.cancelAndHoldAtTime(time);
        else { gp.cancelScheduledValues(time); gp.setValueAtTime(activeGain.gain.value, time); }
        gp.linearRampToValueAtTime(0, time + fadeTime);
        activeNode.stop(time + fadeTime + 0.002);
      } catch (_) {
        try { activeNode.disconnect(); } catch (__) {}
        if (this.channels && this.audioContext) this.channels.releaseGainNode(this.audioContext, instrumentId, activeGain);
        const mapping = this.activeGainNodes?.get(activeNode);
        if (mapping) { mapping.gainNode = null; mapping.instrumentId = ''; }
        this.activeGainNodes?.delete(activeNode);
      }
      this.activeBarulhoNodes.delete(instrumentId);
      this.activeBarulhoGains.delete(instrumentId);
    }
  }

  public stopBarulho(instrumentId: string, time: number = this.audioContext?.currentTime || 0): void {
    this.fadeOutBarulho(instrumentId, time, 0.018);
  }

  public stopAllBarulho(): void {
    for (const key of Array.from(this.activeBarulhoNodes.keys())) this.stopBarulho(key);
  }

  public clear(): void {
    this.activeBarulhoNodes.clear();
    this.activeBarulhoGains.clear();
  }
}
