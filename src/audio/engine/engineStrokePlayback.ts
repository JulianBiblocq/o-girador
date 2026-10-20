/**
 * O Girador - Audio Engine Native Web Audio Buffer Playback & Envelopes
 */

import { StrokeMapping } from '../../data/audioConfig';
import { GainNodeMapping } from './engineTypes';
import { EngineChannels } from './engineChannels';
import { EngineVoiceGuard } from './engineVoiceGuard';
import { EngineBarulhoPlayer } from './engineBarulhoPlayer';

export interface PlaybackContext {
  audioContext: AudioContext;
  channels: EngineChannels;
  voiceGuard: EngineVoiceGuard;
  barulho: EngineBarulhoPlayer;
  scheduledHits: Set<AudioBufferSourceNode>;
  activeGainNodes: Map<AudioBufferSourceNode, GainNodeMapping>;
}

export class EngineStrokePlayback {
  public static play(
    ctx: PlaybackContext,
    trackId: number | null,
    instrumentId: string,
    stroke: StrokeMapping,
    buffer: AudioBuffer,
    calculatedPitch: number,
    time: number,
    velocity: number,
    decayMultiplier: number,
    isLiveHold: boolean
  ): void {
    const source = ctx.audioContext.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = calculatedPitch;

    const gainNode = ctx.channels.getGainNode(ctx.audioContext, trackId, instrumentId);
    gainNode.gain.cancelScheduledValues(time);
    gainNode.gain.setValueAtTime(velocity, time);
    source.connect(gainNode);

    if (stroke.isBarulho) {
      this.playBarulho(ctx, source, gainNode, instrumentId, buffer, calculatedPitch, time, velocity, decayMultiplier, isLiveHold);
    } else {
      this.playOneShot(ctx, source, gainNode, instrumentId, buffer, calculatedPitch, time, velocity, decayMultiplier);
    }
  }

  private static playBarulho(
    ctx: PlaybackContext,
    source: AudioBufferSourceNode,
    gainNode: GainNode,
    instrumentId: string,
    buffer: AudioBuffer,
    calculatedPitch: number,
    time: number,
    velocity: number,
    decayMultiplier: number,
    isLiveHold: boolean
  ): void {
    if (isLiveHold) {
      source.loop = true;
      source.start(time);
      ctx.barulho.activeBarulhoNodes.set(instrumentId, source);
      ctx.barulho.activeBarulhoGains.set(instrumentId, gainNode);
      ctx.activeGainNodes.set(source, ctx.voiceGuard.getGainNodeMapping(instrumentId, gainNode, Infinity));
    } else {
      ctx.scheduledHits.add(source);
      const originalDuration = buffer.duration;
      const maxDuration = Math.max(0.35, Math.min(1.2, originalDuration * decayMultiplier));
      const realWorldDuration = maxDuration / calculatedPitch;
      const fadeTime = Math.min(0.02, realWorldDuration / 2);

      ctx.barulho.activeBarulhoNodes.set(instrumentId, source);
      ctx.barulho.activeBarulhoGains.set(instrumentId, gainNode);
      ctx.activeGainNodes.set(source, ctx.voiceGuard.getGainNodeMapping(instrumentId, gainNode, time + realWorldDuration));

      gainNode.gain.setValueAtTime(velocity, time);
      gainNode.gain.setValueAtTime(velocity, time + Math.max(0, realWorldDuration - fadeTime));
      gainNode.gain.linearRampToValueAtTime(0, time + realWorldDuration);
      source.start(time, 0, maxDuration);
      source.stop(time + realWorldDuration + 0.01);
    }

    source.onended = () => {
      try { source.disconnect(); } catch (_) {}
      ctx.channels.releaseGainNode(ctx.audioContext, instrumentId, gainNode);
      const mapping = ctx.activeGainNodes.get(source);
      if (mapping) { mapping.gainNode = null; mapping.instrumentId = ''; }
      ctx.activeGainNodes.delete(source);
      ctx.voiceGuard.removeActiveVoice(instrumentId, source);
      if (ctx.barulho.activeBarulhoNodes.get(instrumentId) === source) {
        ctx.barulho.activeBarulhoNodes.delete(instrumentId);
        ctx.barulho.activeBarulhoGains.delete(instrumentId);
      }
    };
  }

  private static playOneShot(
    ctx: PlaybackContext,
    source: AudioBufferSourceNode,
    gainNode: GainNode,
    instrumentId: string,
    buffer: AudioBuffer,
    calculatedPitch: number,
    time: number,
    velocity: number,
    decayMultiplier: number
  ): void {
    ctx.scheduledHits.add(source);
    const originalBufferDuration = buffer.duration;
    const bufferPlayDuration = originalBufferDuration * decayMultiplier;
    const realWorldDuration = bufferPlayDuration / calculatedPitch;
    const expectedEnd = time + realWorldDuration;

    ctx.activeGainNodes.set(source, ctx.voiceGuard.getGainNodeMapping(instrumentId, gainNode, expectedEnd));

    const fadeTime = Math.min(0.015, realWorldDuration / 2);
    gainNode.gain.setValueAtTime(velocity, time);
    gainNode.gain.setValueAtTime(velocity, time + realWorldDuration - fadeTime);
    gainNode.gain.linearRampToValueAtTime(0, time + realWorldDuration);

    if (decayMultiplier < 1.0) source.start(time, 0, bufferPlayDuration);
    else source.start(time);

    source.onended = () => {
      ctx.scheduledHits.delete(source);
      try { source.disconnect(); } catch (_) {}
      ctx.channels.releaseGainNode(ctx.audioContext, instrumentId, gainNode);
      const mapping = ctx.activeGainNodes.get(source);
      if (mapping) { mapping.gainNode = null; mapping.instrumentId = ''; }
      ctx.activeGainNodes.delete(source);
      ctx.voiceGuard.removeActiveVoice(instrumentId, source);
    };

    const voices = ctx.voiceGuard.instrumentVoices.get(instrumentId) || [];
    voices.push(ctx.voiceGuard.getActiveVoice(source, gainNode, time, velocity, instrumentId));
    ctx.voiceGuard.instrumentVoices.set(instrumentId, voices);
  }
}
