/**
 * O Girador - Audio Engine Native Web Audio Buffer Playback & Progressive Hold+Damping Envelopes (< 120 lignes)
 */

import { StrokeMapping } from '../../data/audioConfig';
import { PlaybackContext, PooledGainNode } from './engineTypes';
import { playBarulhoStroke } from './engineBarulhoPlayback';
import {
  computeEnginePeakGain,
  computeProgressiveDecayEnvelope,
  ProgressiveDecayEnvelope,
} from './strokeEnvelopeHelper';

export { computeEnginePeakGain, computeProgressiveDecayEnvelope };
export type { PlaybackContext, ProgressiveDecayEnvelope };

export interface StrokePlaybackOptions {
  isStudioCalibrated?: boolean;
  forceShort80ms?: boolean;
  strokeSymbol?: string;
  maxBarulhoDurSec?: number;
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
    isLiveHold: boolean,
    opts: StrokePlaybackOptions = {}
  ): void {
    const gainMultiplier = computeEnginePeakGain(
      velocity,
      stroke.baseGain ?? 1.0,
      Boolean(opts.isStudioCalibrated),
      isLiveHold
    );
    if (gainMultiplier <= 0.0001) return;

    const source = ctx.audioContext.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = calculatedPitch;

    const effectiveSymbol = opts.strokeSymbol || stroke.symbol;
    const gainNode = ctx.channels.getGainNode(ctx.audioContext, trackId, instrumentId);
    (gainNode as PooledGainNode)._activeSource = source;
    const needsTimbalLp = !stroke.isBarulho && instrumentId === 'timbal' && (effectiveSymbol === 'G' || effectiveSymbol === 'g');
    let lpFilter: BiquadFilterNode | null = null;
    if (needsTimbalLp && typeof ctx.audioContext.createBiquadFilter === 'function') {
      lpFilter = ctx.audioContext.createBiquadFilter();
      lpFilter.type = 'lowpass'; lpFilter.frequency.value = 20000; lpFilter.Q.value = Math.SQRT1_2;
      source.connect(lpFilter); lpFilter.connect(gainNode);
    } else {
      source.connect(gainNode);
    }

    if (stroke.isBarulho) {
      playBarulhoStroke(ctx, trackId, source, gainNode, instrumentId, buffer, calculatedPitch, time, gainMultiplier, isLiveHold, effectiveSymbol, opts.maxBarulhoDurSec);
    } else {
      this.playOneShot(
        ctx, trackId, source, gainNode, instrumentId, buffer,
        calculatedPitch, time, gainMultiplier, decayMultiplier,
        Boolean(opts.forceShort80ms), effectiveSymbol, lpFilter
      );
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
    decayMultiplier: number,
    forceShort80ms: boolean,
    strokeSymbol: string,
    lpFilter: BiquadFilterNode | null = null
  ): void {
    ctx.scheduledHits.add(source);
    const realWorldDuration = buffer.duration / calculatedPitch;
    const env = computeProgressiveDecayEnvelope(realWorldDuration, decayMultiplier, forceShort80ms);
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
      try { source.disconnect(); lpFilter?.disconnect(); } catch (_) {}
      ctx.channels.releaseGainNode(ctx.audioContext, instrumentId, gainNode);
      const mapping = ctx.activeGainNodes.get(source);
      if (mapping) { mapping.gainNode = null; mapping.instrumentId = ''; }
      ctx.activeGainNodes.delete(source);
      ctx.voiceGuard.removeActiveVoice(instrumentId, source);
    };

    const voiceKey = trackId !== null ? trackId : instrumentId;
    const activeVoice = ctx.voiceGuard.getActiveVoice(
      source, gainNode, time, holdEnd, releaseEnd, expectedEnd, gainMultiplier, env.isFullBuffer, instrumentId, strokeSymbol, lpFilter
    );
    const tv = ctx.voiceGuard.trackVoices.get(String(voiceKey)) || [];
    tv.push(activeVoice);
    ctx.voiceGuard.trackVoices.set(String(voiceKey), tv);
  }
}
