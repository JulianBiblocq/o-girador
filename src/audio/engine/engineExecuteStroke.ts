/**
 * O Girador - Audio Engine Low-Level Stroke Execution (< 130 lignes)
 * - Lecture phase-continue 100 % naturelle des tambours (`playbackRate = 2^(st/12)`).
 * - Fallback intelligent `A -> pool e (80 ms)` Alfaia et couche composite `D/E + X` Rimshot Caixa/Tarol.
 */

import { getTone } from '../../ToneLoader';
import { InstrumentAudioConfig, StrokeMapping } from '../../data/audioConfig';
import { getEffectiveSkinChorusAmount, useSequencerStore } from '../../stores/useSequencerStore';
import { TrackGroup } from '../../types';
import { ALFAIA_INSTRUMENTS } from './engineTypes';
import { EngineTuning } from './engineTuning';
import { PendingStudioInstrumentId, STUDIO_BANK_ENABLED } from '../../universes/maracatu/instruments/studioBankRegistry';
import { EngineStrokePlayback } from './engineStrokePlayback';
import { resolveTrackSectionTemperament } from '../groove/sectionTemperament';
import { COMPOSITE_RIM_LAYER_VELOCITY_SCALE } from '../worklet/horizon/workletCompositeStrokeHelper';
import type { NotePlayerDeps } from './enginePlayerTypes';

export function computeEffectiveDecayNorm(
  rawStepDecay: number | undefined,
  rawTrackDecay: number | undefined,
  isPreviewOverride = false
): number {
  const s = rawStepDecay ?? 1;
  const stepDecayNorm = s > 1 ? s / 100 : s;
  const t = rawTrackDecay ?? 100;
  const trackDecayNorm = t > 1 ? t / 100 : t;
  if (isPreviewOverride && stepDecayNorm < 0.999) {
    return Math.max(0.15, Math.min(1.0, stepDecayNorm));
  }
  return Math.max(0.15, Math.min(1.0, stepDecayNorm * trackDecayNorm));
}

export class EngineExecuteStroke {
  public static execute(
    deps: NotePlayerDeps,
    trackId: number | null,
    instrumentId: string,
    config: InstrumentAudioConfig,
    stroke: StrokeMapping,
    time: number,
    velocity: number,
    decayMultiplier: number,
    overrideTuning: number | undefined,
    isLiveHold: boolean,
    track: TrackGroup | null,
    requestedSymbol?: string
  ): void {
    const effectiveSymbol = requestedSymbol || stroke.symbol;

    if (stroke.isBarulho && isLiveHold && deps.playbackCtx.barulho.activeBarulhoNodes.has(instrumentId)) {
      const activeGain = deps.playbackCtx.barulho.activeBarulhoGains.get(instrumentId);
      if (activeGain) {
        try {
          activeGain.gain.cancelScheduledValues(time);
          activeGain.gain.setValueAtTime(activeGain.gain.value, time);
          activeGain.gain.linearRampToValueAtTime(velocity, time + 0.1);
        } catch (_) {}
      }
      return;
    }

    if (!stroke.isBarulho || !isLiveHold) {
      deps.playbackCtx.barulho.stopBarulho(instrumentId, time);
    }

    let resolvedStroke = stroke;
    let forceShort80ms = false;
    let filePath = deps.roundRobin.selectFile(instrumentId, resolvedStroke, time, trackId);
    let bufferEntry = deps.sampleLoader.bufferPool.get(filePath);

    if ((!bufferEntry || !bufferEntry.loaded) && ALFAIA_INSTRUMENTS.has(instrumentId) && (effectiveSymbol === 'A' || effectiveSymbol === 'a')) {
      const fallbackE = config.strokes.find((s) => s.symbol === 'e');
      if (fallbackE) {
        resolvedStroke = fallbackE;
        forceShort80ms = true;
        filePath = deps.roundRobin.selectFile(instrumentId, resolvedStroke, time, trackId);
        bufferEntry = deps.sampleLoader.bufferPool.get(filePath);
      }
    }
    if (!bufferEntry || !bufferEntry.loaded) return;

    const storeState = useSequencerStore.getState();
    const allTracks = deps.trackLookupMap.size > 0 ? Array.from(deps.trackLookupMap.values()) : storeState.tracks;
    const microDelaySec = overrideTuning !== undefined ? 0 : resolveTrackSectionTemperament(track, allTracks).attackSpreadSec;
    const effectiveTime = time + microDelaySec;
    const voiceGuardKey = trackId !== null ? trackId : instrumentId;

    deps.voiceGuard.chokeTrackVoice(voiceGuardKey, effectiveSymbol, effectiveTime, instrumentId);

    const rawBuffer = bufferEntry.get() as AudioBuffer;
    const isLegacyRufada = effectiveSymbol === 'r' && !STUDIO_BANK_ENABLED[instrumentId as PendingStudioInstrumentId];
    const finalVelocity = isLegacyRufada ? velocity * 0.88 : velocity;
    const pitchNuance = isLegacyRufada ? 0.985 : (resolvedStroke.compositeRimSymbol && effectiveSymbol === 'a' ? 0.992 : 1.0);
    const chorusAmount = getEffectiveSkinChorusAmount(storeState);
    const baseRate = EngineTuning.calculatePitch(instrumentId, config, track, overrideTuning, allTracks, chorusAmount);
    const calculatedPitch = resolvedStroke.isBarulho ? baseRate : baseRate * pitchNuance;
    const effectiveDecayNorm = computeEffectiveDecayNorm(decayMultiplier, track?.trackDecay, overrideTuning !== undefined);
    const isStudioCalibrated = Boolean(config.calibratedStudioBank);

    EngineStrokePlayback.play(
      deps.playbackCtx, trackId, instrumentId, resolvedStroke,
      rawBuffer, calculatedPitch, effectiveTime, finalVelocity, effectiveDecayNorm, isLiveHold,
      { isStudioCalibrated, forceShort80ms, strokeSymbol: effectiveSymbol }
    );

    if (resolvedStroke.compositeRimSymbol) {
      const rimStroke = config.strokes.find((s) => s.symbol === resolvedStroke.compositeRimSymbol);
      const rimEntry = rimStroke ? deps.sampleLoader.bufferPool.get(deps.roundRobin.selectFile(instrumentId, rimStroke, time, trackId)) : undefined;
      if (rimStroke && rimEntry?.loaded) {
        EngineStrokePlayback.play(
          deps.playbackCtx, trackId, instrumentId, rimStroke,
          rimEntry.get() as AudioBuffer, baseRate, effectiveTime, finalVelocity * COMPOSITE_RIM_LAYER_VELOCITY_SCALE,
          effectiveDecayNorm, false, { isStudioCalibrated, strokeSymbol: rimStroke.symbol }
        );
      }
    }

    if (instrumentId === 'apito' && effectiveSymbol !== '/' && effectiveSymbol !== '.') {
      const Tone = getTone();
      Tone?.Draw?.schedule?.(() => {
        window.dispatchEvent(new CustomEvent('o-girador-apito-shake'));
      }, effectiveTime);
    }
  }
}
