/**
 * O Girador - Audio Engine Low-Level Stroke Execution & Spatial Squad Fallback/Preview (< 142 lignes)
 */
import { getTone } from '../../ToneLoader';
import { InstrumentAudioConfig, StrokeMapping } from '../../data/audioConfig';
import { getEffectiveSkinChorusAmount, useSequencerStore } from '../../stores/useSequencerStore';
import { TrackGroup } from '../../types';
import { isAutomationBypassed } from '../../utils/automationBypassHelper';
import { hasActiveTrackAutomation } from '../../utils/automationDetectHelper';
import { PendingStudioInstrumentId, STUDIO_BANK_ENABLED } from '../../universes/maracatu/instruments/studioBankRegistry';
import { resolveTrackSectionTemperament } from '../groove/sectionTemperament';
import { computeBarulhoPartnerEntrySpreadSec, selectSquadPlayerFile } from '../spatial/sectionBarulhoPhaseHelper';
import { computeDeterministicStrokeJitterSec, resolveTrackSectionSpatialProfile } from '../spatial/sectionSpatialAcoustics';
import { COMPOSITE_RIM_LAYER_VELOCITY_SCALE } from '../worklet/horizon/workletCompositeStrokeHelper';
import type { NotePlayerDeps } from './enginePlayerTypes';
import { EngineStrokePlayback } from './engineStrokePlayback';
import { EngineTuning } from './engineTuning';
import { ALFAIA_INSTRUMENTS } from './engineTypes';

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
    deps: NotePlayerDeps, trackId: number | null, instrumentId: string, config: InstrumentAudioConfig,
    stroke: StrokeMapping, time: number, velocity: number, decayMultiplier: number,
    overrideTuning: number | undefined, isLiveHold: boolean, track: TrackGroup | null,
    requestedSymbol?: string, maxBarulhoDurSec?: number
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

    if (!stroke.isBarulho || (!isLiveHold && !maxBarulhoDurSec)) {
      deps.playbackCtx.barulho.stopBarulho(instrumentId, time);
      for (let k = 1; k < 5; k++) deps.playbackCtx.barulho.stopBarulho(`${instrumentId}__p${k}`, time);
    }

    const hasIndexedRR = typeof deps.roundRobin.selectFileIndex === 'function';
    const pickBase = (s: StrokeMapping): number => (hasIndexedRR ? deps.roundRobin.selectFileIndex(instrumentId, s, time, trackId) : -1);
    const pickFile = (s: StrokeMapping, base: number, k: number): string =>
      base >= 0 ? selectSquadPlayerFile(s.files, base, k) : deps.roundRobin.selectFile(instrumentId, s, time, trackId);

    let resolvedStroke = stroke;
    let forceShort80ms = false;
    let baseIdx = pickBase(resolvedStroke);
    let bufferEntry = deps.sampleLoader.bufferPool.get(pickFile(resolvedStroke, baseIdx, 0));

    if ((!bufferEntry || !bufferEntry.loaded) && ALFAIA_INSTRUMENTS.has(instrumentId) && (effectiveSymbol === 'A' || effectiveSymbol === 'a')) {
      const fallbackE = config.strokes.find((s) => s.symbol === 'e');
      if (fallbackE) {
        resolvedStroke = fallbackE; forceShort80ms = true;
        baseIdx = pickBase(resolvedStroke);
        bufferEntry = deps.sampleLoader.bufferPool.get(pickFile(resolvedStroke, baseIdx, 0));
      }
    }
    if (!bufferEntry || !bufferEntry.loaded) return;

    const storeState = useSequencerStore.getState();
    const allTracks = deps.trackLookupMap.size > 0 ? Array.from(deps.trackLookupMap.values()) : storeState.tracks;
    const microDelaySec = overrideTuning !== undefined ? 0 : resolveTrackSectionTemperament(track, allTracks).attackSpreadSec;
    const effectiveTime = time + microDelaySec;
    const voiceGuardKey = trackId !== null ? trackId : instrumentId;

    const hasPanAuto = track ? (!isAutomationBypassed(track, 'pan', storeState.globalAutomationBypass) && hasActiveTrackAutomation(track, 'pan')) : false;
    const spatial = resolveTrackSectionSpatialProfile(track, instrumentId, Boolean(storeState.isEcoMode), hasPanAuto ? 0 : (track?.panVal ?? track?.pan ?? 0));
    const synthCount = spatial.isNeutralSolo ? 1 : spatial.synthesizedCount;

    const isLegacyRufada = effectiveSymbol === 'r' && !STUDIO_BANK_ENABLED[instrumentId as PendingStudioInstrumentId];
    const finalVelocity = isLegacyRufada ? velocity * 0.88 : velocity;
    const pitchNuance = isLegacyRufada ? 0.985 : (resolvedStroke.compositeRimSymbol && effectiveSymbol === 'a' ? 0.992 : 1.0);
    const chorusAmount = getEffectiveSkinChorusAmount(storeState);
    const baseRate = EngineTuning.calculatePitch(instrumentId, config, track, overrideTuning, allTracks, chorusAmount);
    const calculatedPitch = resolvedStroke.isBarulho ? baseRate : baseRate * pitchNuance;
    const effectiveDecayNorm = computeEffectiveDecayNorm(decayMultiplier, track?.trackDecay, overrideTuning !== undefined);
    const isStudioCalibrated = Boolean(config.calibratedStudioBank);
    const rimStroke = resolvedStroke.compositeRimSymbol ? config.strokes.find((s) => s.symbol === resolvedStroke.compositeRimSymbol) : undefined;
    const rimBaseIdx = rimStroke ? pickBase(rimStroke) : -1;
    const stepSeed = Math.round(time * 100);

    for (let k = 0; k < synthCount; k++) {
      const entryK = k === 0 ? bufferEntry : (deps.sampleLoader.bufferPool.get(pickFile(resolvedStroke, baseIdx, k)) || bufferEntry);
      if (!entryK?.loaded) continue;
      const pSpec = spatial.isNeutralSolo ? undefined : spatial.players[k];
      const jitter = !pSpec || resolvedStroke.isBarulho ? 0 : computeDeterministicStrokeJitterSec(Number(trackId) || 0, k, stepSeed, synthCount);
      const barSpread = pSpec && resolvedStroke.isBarulho ? computeBarulhoPartnerEntrySpreadSec(k, synthCount) : 0;
      const timeK = Math.max(effectiveTime, effectiveTime + (pSpec ? pSpec.baseDelaySec + jitter + barSpread : 0));
      const pitchMul = pSpec ? pSpec.pitchMul : 1.0;
      const vKey = k > 0 ? `${voiceGuardKey}__p${k}` : voiceGuardKey;

      deps.voiceGuard.chokeTrackVoice(vKey, effectiveSymbol, timeK, instrumentId);
      EngineStrokePlayback.play(
        deps.playbackCtx, trackId, instrumentId, resolvedStroke,
        entryK.get() as AudioBuffer, calculatedPitch * pitchMul, timeK, finalVelocity, effectiveDecayNorm, isLiveHold,
        { isStudioCalibrated, forceShort80ms, strokeSymbol: effectiveSymbol, maxBarulhoDurSec, playerIdx: k, playerSpec: pSpec }
      );

      if (rimStroke) {
        const rimEntry = deps.sampleLoader.bufferPool.get(pickFile(rimStroke, rimBaseIdx, k));
        if (rimEntry?.loaded) {
          EngineStrokePlayback.play(
            deps.playbackCtx, trackId, instrumentId, rimStroke,
            rimEntry.get() as AudioBuffer, baseRate * pitchMul, timeK, finalVelocity * COMPOSITE_RIM_LAYER_VELOCITY_SCALE,
            effectiveDecayNorm, false, { isStudioCalibrated, strokeSymbol: rimStroke.symbol, playerIdx: k, playerSpec: pSpec }
          );
        }
      }
    }

    if (instrumentId === 'apito' && effectiveSymbol !== '/' && effectiveSymbol !== '.') {
      const Tone = getTone();
      Tone?.Draw?.schedule?.(() => { window.dispatchEvent(new CustomEvent('o-girador-apito-shake')); }, effectiveTime);
    }
  }
}
