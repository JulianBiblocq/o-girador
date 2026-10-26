/**
 * O Girador - Audio Engine Native Web Audio Buffer Playback & Envelopes
 */

import { StrokeMapping } from '../../data/audioConfig';
import { GainNodeMapping, PlaybackContext } from './engineTypes';
import { EngineChannels } from './engineChannels';
import { EngineVoiceGuard } from './engineVoiceGuard';
import { EngineBarulhoPlayer } from './engineBarulhoPlayer';
import { playBarulhoStroke } from './engineBarulhoPlayback';

export type { PlaybackContext };


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
    const normVel = velocity > 3.0 ? velocity / 100 : velocity;
    if (normVel <= 0.001) return;

    const source = ctx.audioContext.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = calculatedPitch;

    const gainNode = ctx.channels.getGainNode(ctx.audioContext, trackId, instrumentId);
    source.connect(gainNode);

    const gainMultiplier = Math.pow(Math.max(0, Math.min(2.0, normVel)), 1.8);

    if (stroke.isBarulho) {
      playBarulhoStroke(ctx, source, gainNode, instrumentId, buffer, calculatedPitch, time, gainMultiplier, decayMultiplier, isLiveHold);
    } else {
      this.playOneShot(ctx, trackId, source, gainNode, instrumentId, buffer, calculatedPitch, time, gainMultiplier, decayMultiplier);
    }
  }

  private static playOneShot(
    ctx: PlaybackContext,
    trackId: number | null,
    source: AudioBufferSourceNode,
    gainNode: GainNode,
    instrumentId: string,
    buffer: AudioBuffer,
    calculatedPitch: number,
    time: number,
    gainMultiplier: number,
    decayMultiplier: number
  ): void {
    ctx.scheduledHits.add(source);
    const originalBufferDuration = buffer.duration;
    const realWorldDuration = originalBufferDuration / calculatedPitch;
    const normDecay = decayMultiplier > 3.0 ? decayMultiplier / 100 : Math.max(0.05, Math.min(1.0, decayMultiplier));

    let expectedEnd: number;

    if (normDecay < 0.98) {
      const minDecaySec = 0.04;
      const maxDecaySec = Math.min(realWorldDuration, 1.2);
      const effectiveDecaySec = Math.max(minDecaySec, minDecaySec + Math.pow(normDecay, 1.7) * (maxDecaySec - minDecaySec));
      expectedEnd = time + effectiveDecaySec + 0.01;

      ctx.activeGainNodes.set(source, ctx.voiceGuard.getGainNodeMapping(instrumentId, gainNode, expectedEnd));

      const attackHold = Math.min(0.015, effectiveDecaySec * 0.25);
      const safeGain = Math.max(0.0001, gainMultiplier);

      gainNode.gain.cancelScheduledValues(time);
      gainNode.gain.setValueAtTime(safeGain, time);
      gainNode.gain.setValueAtTime(safeGain, time + attackHold);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, time + effectiveDecaySec);
      gainNode.gain.linearRampToValueAtTime(0, time + effectiveDecaySec + 0.005);

      source.start(time);
      source.stop(expectedEnd);
    } else {
      expectedEnd = time + realWorldDuration;
      ctx.activeGainNodes.set(source, ctx.voiceGuard.getGainNodeMapping(instrumentId, gainNode, expectedEnd));

      const fadeTime = Math.min(0.015, realWorldDuration / 2);
      gainNode.gain.cancelScheduledValues(time);
      gainNode.gain.setValueAtTime(gainMultiplier, time);
      gainNode.gain.setValueAtTime(gainMultiplier, time + Math.max(0, realWorldDuration - fadeTime));
      gainNode.gain.linearRampToValueAtTime(0, expectedEnd);

      source.start(time);
      source.stop(expectedEnd + 0.01);
    }

    source.onended = () => {
      ctx.scheduledHits.delete(source);
      try { source.disconnect(); } catch (_) {}
      ctx.channels.releaseGainNode(ctx.audioContext, instrumentId, gainNode);
      const mapping = ctx.activeGainNodes.get(source);
      if (mapping) { mapping.gainNode = null; mapping.instrumentId = ''; }
      ctx.activeGainNodes.delete(source);
      ctx.voiceGuard.removeActiveVoice(instrumentId, source);
      if (trackId !== null) {
        const tv = ctx.voiceGuard.trackVoices.get(String(trackId));
        if (tv) {
          const idx = tv.findIndex(v => v.source === source);
          if (idx !== -1) tv.splice(idx, 1);
        }
      }
    };

    const activeVoice = ctx.voiceGuard.getActiveVoice(source, gainNode, time, gainMultiplier, instrumentId);
    const voices = ctx.voiceGuard.instrumentVoices.get(instrumentId) || [];
    voices.push(activeVoice);
    ctx.voiceGuard.instrumentVoices.set(instrumentId, voices);
    if (trackId !== null) {
      const tv = ctx.voiceGuard.trackVoices.get(String(trackId)) || [];
      tv.push(activeVoice);
      ctx.voiceGuard.trackVoices.set(String(trackId), tv);
    }
  }
}
