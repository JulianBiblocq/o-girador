/**
 * O Girador - Audio Engine Barulho (Looping Sounds) Player
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

  public stopBarulho(instrumentId: string, time: number = this.audioContext?.currentTime || 0): void {
    const activeNode = this.activeBarulhoNodes.get(instrumentId);
    const activeGain = this.activeBarulhoGains.get(instrumentId);
    if (activeNode && activeGain) {
      this.voiceGuard?.removeActiveVoice(instrumentId, activeNode);
      try {
        const fadeTime = 0.015;
        activeGain.gain.setValueAtTime(activeGain.gain.value, time);
        activeGain.gain.linearRampToValueAtTime(0, time + fadeTime);
        activeNode.stop(time + fadeTime);
      } catch (_) {
        try { activeNode.disconnect(); } catch (_) {}
        if (this.channels && this.audioContext) this.channels.releaseGainNode(this.audioContext, instrumentId, activeGain);
        const mapping = this.activeGainNodes?.get(activeNode);
        if (mapping) { mapping.gainNode = null; mapping.instrumentId = ''; }
        this.activeGainNodes?.delete(activeNode);
      }
      this.activeBarulhoNodes.delete(instrumentId);
      this.activeBarulhoGains.delete(instrumentId);
    }
  }

  public stopAllBarulho(): void {
    for (const key of Array.from(this.activeBarulhoNodes.keys())) this.stopBarulho(key);
  }

  public clear(): void {
    this.activeBarulhoNodes.clear();
    this.activeBarulhoGains.clear();
  }
}
