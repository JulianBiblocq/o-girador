/**
 * O Girador - Audio Engine Native Web Audio Buffer Playback & Spatial Squad Panning (< 138 lignes)
 */
import { StrokeMapping } from '../../data/audioConfig';
import { computeVelocityToneCutoffHz } from '../groove/strokeHumanizationDsp';
import type { SectionPlayerAcousticSpec } from '../spatial/sectionSpatialAcoustics';
import { createSpatialPlayerRouting } from '../spatial/webAudioPlayerPanner';
import { PlaybackContext, PooledGainNode } from './engineTypes';
import { playBarulhoStroke } from './engineBarulhoPlayback';
import { computeEnginePeakGain, computeProgressiveDecayEnvelope, ProgressiveDecayEnvelope } from './strokeEnvelopeHelper';

export { computeEnginePeakGain, computeProgressiveDecayEnvelope };
export type { PlaybackContext, ProgressiveDecayEnvelope };

export interface StrokePlaybackOptions {
  isStudioCalibrated?: boolean;
  forceShort80ms?: boolean;
  strokeSymbol?: string;
  maxBarulhoDurSec?: number;
  playerIdx?: number;
  partnerRank?: number;
  skipVoiceGuard?: boolean;
  playerSpec?: SectionPlayerAcousticSpec;
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
    const basePeak = computeEnginePeakGain(
      velocity,
      stroke.baseGain ?? 1.0,
      Boolean(opts.isStudioCalibrated),
      isLiveHold
    );
    if (basePeak <= 0.0001) return;

    const source = ctx.audioContext.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = calculatedPitch;

    const effectiveSymbol = opts.strokeSymbol || stroke.symbol;
    const gainNode = ctx.channels.getGainNode(ctx.audioContext, trackId, instrumentId);
    (gainNode as PooledGainNode)._activeSource = source;
    const spatialRoute = createSpatialPlayerRouting(ctx.audioContext, gainNode, opts.playerSpec, buffer.numberOfChannels || 1);
    const gainMultiplier = basePeak * spatialRoute.gainCompensation;
    if (gainMultiplier <= 0.0001) {
      spatialRoute.cleanup();
      ctx.channels.releaseGainNode(ctx.audioContext, instrumentId, gainNode);
      return;
    }

    const toneCutoffHz = stroke.isBarulho ? 0 : computeVelocityToneCutoffHz(velocity);
    const needsTimbalLp = !stroke.isBarulho && instrumentId === 'timbal' && (effectiveSymbol === 'G' || effectiveSymbol === 'g');
    let lpFilter: BiquadFilterNode | null = null;
    if ((needsTimbalLp || toneCutoffHz > 0) && typeof ctx.audioContext.createBiquadFilter === 'function') {
      lpFilter = ctx.audioContext.createBiquadFilter();
      lpFilter.type = 'lowpass'; lpFilter.frequency.value = toneCutoffHz > 0 ? toneCutoffHz : 20000; lpFilter.Q.value = needsTimbalLp ? Math.SQRT1_2 : 0.5;
      source.connect(lpFilter); lpFilter.connect(spatialRoute.entryNode);
    } else {
      source.connect(spatialRoute.entryNode);
    }

    if (stroke.isBarulho) {
      playBarulhoStroke(
        ctx, trackId, source, gainNode, instrumentId, buffer, calculatedPitch,
        time, gainMultiplier, isLiveHold, effectiveSymbol, opts.maxBarulhoDurSec,
        opts.playerIdx ?? 0, spatialRoute.cleanup, opts.partnerRank ?? 0
      );
    } else {
      this.playOneShot(
        ctx, trackId, source, gainNode, instrumentId, buffer,
        calculatedPitch, time, gainMultiplier, decayMultiplier,
        Boolean(opts.forceShort80ms), effectiveSymbol, lpFilter,
        opts.playerIdx ?? 0, spatialRoute.cleanup, Boolean(opts.skipVoiceGuard)
      );
    }
  }

  private static playOneShot(
    ctx: PlaybackContext, trackId: number | null, source: AudioBufferSourceNode, gainNode: GainNode,
    instrumentId: string, buffer: AudioBuffer, calculatedPitch: number, time: number,
    gainMultiplier: number, decayMultiplier: number, forceShort80ms: boolean,
    strokeSymbol: string, lpFilter: BiquadFilterNode | null = null, playerIdx = 0, extraCleanup?: () => void, skipVoiceGuard = false
  ): void {
    ctx.scheduledHits.add(source);
    const realWorldDuration = buffer.duration / calculatedPitch;
    const env = computeProgressiveDecayEnvelope(realWorldDuration, decayMultiplier, forceShort80ms);
    const holdEnd = time + env.holdSec;
    const releaseEnd = env.isFullBuffer ? time + realWorldDuration : holdEnd + env.releaseSec;
    const expectedEnd = env.isFullBuffer ? releaseEnd : releaseEnd + 0.01;

    ctx.activeGainNodes.set(source, ctx.voiceGuard.getGainNodeMapping(instrumentId, gainNode, expectedEnd));

    gainNode.gain.cancelScheduledValues(time);
    if (!env.isFullBuffer) {
      const safeGain = Math.max(0.0001, gainMultiplier);
      gainNode.gain.setValueAtTime(safeGain, time);
      gainNode.gain.setValueAtTime(safeGain, holdEnd);
      gainNode.gain.linearRampToValueAtTime(safeGain * 0.35, holdEnd + env.releaseSec * 0.5);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, releaseEnd);
      gainNode.gain.linearRampToValueAtTime(0, expectedEnd);
      source.start(time); source.stop(expectedEnd);
    } else {
      gainNode.gain.setValueAtTime(gainMultiplier, time);
      gainNode.gain.setValueAtTime(gainMultiplier, holdEnd);
      gainNode.gain.linearRampToValueAtTime(0, expectedEnd);
      source.start(time); source.stop(expectedEnd + 0.01);
    }

    source.onended = () => {
      ctx.scheduledHits.delete(source);
      try { source.disconnect(); lpFilter?.disconnect(); } catch (_) {}
      extraCleanup?.();
      ctx.channels.releaseGainNode(ctx.audioContext, instrumentId, gainNode);
      const mapping = ctx.activeGainNodes.get(source);
      if (mapping) { mapping.gainNode = null; mapping.instrumentId = ''; }
      ctx.activeGainNodes.delete(source);
      ctx.voiceGuard.removeActiveVoice(instrumentId, source);
    };

    if (skipVoiceGuard) return;
    const baseKey = trackId !== null ? trackId : instrumentId;
    const voiceKey = playerIdx > 0 ? `${baseKey}__p${playerIdx}` : baseKey;
    const activeVoice = ctx.voiceGuard.getActiveVoice(
      source, gainNode, time, holdEnd, releaseEnd, expectedEnd, gainMultiplier, env.isFullBuffer, instrumentId, strokeSymbol, lpFilter
    );
    const tv = ctx.voiceGuard.trackVoices.get(String(voiceKey)) || [];
    tv.push(activeVoice);
    ctx.voiceGuard.trackVoices.set(String(voiceKey), tv);
  }
}
