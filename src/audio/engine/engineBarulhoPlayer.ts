/**
 * O Girador - Audio Engine Barulho (Looping Sounds) Player (< 75 lignes)
 */

import { GainNodeMapping } from './engineTypes';
import { EngineChannels } from './engineChannels';
import { EngineVoiceGuard } from './engineVoiceGuard';
import { BARULHO_LEGATO_VEL_RAMP_SEC, DEFAULT_BARULHO_FADEIN_SEC } from '../barulho/barulhoRampPlanner';

export class EngineBarulhoPlayer {
  public activeBarulhoNodes = new Map<string, AudioBufferSourceNode>();
  public activeBarulhoGains = new Map<string, GainNode>();
  public activeBarulhoCoords = new Map<string, number>();
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

  public trySustainLegatoBarulho(
    barKey: string,
    originCoord: number,
    targetGain: number,
    time: number,
    isSoftB: boolean
  ): boolean {
    const activeNode = this.activeBarulhoNodes.get(barKey);
    const activeGain = this.activeBarulhoGains.get(barKey);
    if (!activeNode || !activeGain) return false;
    const prevCoord = this.activeBarulhoCoords.get(barKey) ?? 0;
    const isInterMeasureSameStep =
      originCoord > 0 &&
      prevCoord > 0 &&
      ((prevCoord - 1) & 0x7F) === ((originCoord - 1) & 0x7F) &&
      ((prevCoord - 1) >>> 7) !== ((originCoord - 1) >>> 7);
    if (!isSoftB && !isInterMeasureSameStep) return false;

    if (originCoord > 0) this.activeBarulhoCoords.set(barKey, originCoord);
    const rampSec = isSoftB ? DEFAULT_BARULHO_FADEIN_SEC : BARULHO_LEGATO_VEL_RAMP_SEC;
    try {
      const gp = activeGain.gain as AudioParam & { cancelAndHoldAtTime?: (t: number) => AudioParam };
      if (typeof gp.cancelAndHoldAtTime === 'function') gp.cancelAndHoldAtTime(time);
      else { gp.cancelScheduledValues(time); gp.setValueAtTime(activeGain.gain.value, time); }
      gp.linearRampToValueAtTime(targetGain, time + rampSec);
    } catch (_) {}
    return true;
  }

  public fadeOutBarulho(
    instrumentId: string,
    time: number = this.audioContext?.currentTime || 0,
    fadeTime = 0.018
  ): void {
    const activeNode = this.activeBarulhoNodes.get(instrumentId);
    const activeGain = this.activeBarulhoGains.get(instrumentId);
    this.activeBarulhoCoords.delete(instrumentId);
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
    this.fadeOutBarulho(instrumentId, time, instrumentId.startsWith('apito') ? 0.006 : 0.018);
    for (let k = 1; k < 5; k++) {
      const kKey = `${instrumentId}__p${k}`;
      if (this.activeBarulhoNodes.has(kKey)) this.fadeOutBarulho(kKey, time, 0.018);
    }
  }

  public stopAllBarulho(): void {
    for (const key of Array.from(this.activeBarulhoNodes.keys())) this.fadeOutBarulho(key, this.audioContext?.currentTime || 0, 0.018);
    this.activeBarulhoCoords.clear();
  }

  public clear(): void {
    this.activeBarulhoNodes.clear();
    this.activeBarulhoGains.clear();
    this.activeBarulhoCoords.clear();
  }
}
