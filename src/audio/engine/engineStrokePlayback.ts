/**
 * O Girador - Audio Engine Native Web Audio Buffer Playback & Progressive Hold+Damping Envelopes (< 125 lignes)
 */

import { StrokeMapping } from '../../data/audioConfig';
import { PlaybackContext, PooledGainNode } from './engineTypes';
import { playBarulhoStroke } from './engineBarulhoPlayback';

export type { PlaybackContext };

export interface ProgressiveDecayEnvelope {
  isFullBuffer: boolean;
  totalAudibleSec: number;
  holdSec: number;
  releaseSec: number;
}

export function computeProgressiveDecayEnvelope(
  realWorldDuration: number,
  rawDecay: number
): ProgressiveDecayEnvelope {
  const effectiveDecayNorm = rawDecay > 1 ? rawDecay / 100 : Math.max(0.15, Math.min(1.0, rawDecay));
  if (effectiveDecayNorm >= 0.995) {
    return {
      isFullBuffer: true,
      totalAudibleSec: realWorldDuration,
      holdSec: Math.max(0, realWorldDuration - Math.min(0.015, realWorldDuration / 2)),
      releaseSec: Math.min(0.015, realWorldDuration / 2),
    };
  }
  const minDurationSec = 0.085;
  const maxDurationSec = Math.min(realWorldDuration, 1.35);
  const t = Math.max(0, Math.min(1, (effectiveDecayNorm - 0.15) / 0.85));
  const shapedT = Math.pow(t, 1.6);
  const totalAudibleSec = minDurationSec + shapedT * Math.max(0, maxDurationSec - minDurationSec);
  const holdSec = Math.max(0.030, totalAudibleSec * 0.55);
  const releaseSec = Math.max(0.040, totalAudibleSec - holdSec);
  return { isFullBuffer: false, totalAudibleSec, holdSec, releaseSec };
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
    const normVel = velocity > 3.0 ? velocity / 100 : velocity;
    if (normVel <= 0.001) return;

    const source = ctx.audioContext.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = calculatedPitch;

    const gainNode = ctx.channels.getGainNode(ctx.audioContext, trackId, instrumentId);
    (gainNode as PooledGainNode)._activeSource = source;
    source.connect(gainNode);

    const compensatedVel = normVel * 1.142857;
    const gainMultiplier = Math.pow(Math.max(0, Math.min(2.0, compensatedVel)), 1.8);

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
    const realWorldDuration = buffer.duration / calculatedPitch;
    const env = computeProgressiveDecayEnvelope(realWorldDuration, decayMultiplier);
    const holdEnd = time + env.holdSec;
    const releaseEnd = env.isFullBuffer ? time + realWorldDuration : holdEnd + env.releaseSec;
    const expectedEnd = env.isFullBuffer ? releaseEnd : releaseEnd + 0.01;

    ctx.activeGainNodes.set(source, ctx.voiceGuard.getGainNodeMapping(instrumentId, gainNode, expectedEnd));

    if (!env.isFullBuffer) {
      const safeGain = Math.max(0.0001, gainMultiplier);
      gainNode.gain.cancelScheduledValues(time);
      gainNode.gain.setValueAtTime(safeGain, time);
      gainNode.gain.setValueAtTime(safeGain, holdEnd);
      gainNode.gain.linearRampToValueAtTime(safeGain * 0.35, holdEnd + env.releaseSec * 0.5);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, releaseEnd);
      gainNode.gain.linearRampToValueAtTime(0, expectedEnd);

      source.start(time);
      source.stop(expectedEnd);
    } else {
      gainNode.gain.cancelScheduledValues(time);
      gainNode.gain.setValueAtTime(gainMultiplier, time);
      gainNode.gain.setValueAtTime(gainMultiplier, holdEnd);
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
    };

    if (trackId !== null) {
      const activeVoice = ctx.voiceGuard.getActiveVoice(
        source, gainNode, time, holdEnd, releaseEnd, expectedEnd, gainMultiplier, env.isFullBuffer, instrumentId
      );
      const tv = ctx.voiceGuard.trackVoices.get(String(trackId)) || [];
      tv.push(activeVoice);
      ctx.voiceGuard.trackVoices.set(String(trackId), tv);
    }
  }
}
