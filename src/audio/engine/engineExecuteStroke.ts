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
import { computeAlfaiaHighBpmDecayNorm, computeLivePlayerVelocityBreathing } from '../groove/strokeHumanizationDsp';
import { computeBarulhoPartnerEntrySpreadSec, selectSquadPlayerFile } from '../spatial/sectionBarulhoPhaseHelper';
import { computeDeterministicStrokeJitterSec, resolveTrackSectionSpatialProfile } from '../spatial/sectionSpatialAcoustics';
import { COMPOSITE_RIM_LAYER_VELOCITY_SCALE } from '../worklet/horizon/workletCompositeStrokeHelper';
import type { NotePlayerDeps } from './enginePlayerTypes';
import { EngineStrokePlayback } from './engineStrokePlayback';
import { triggerWebAudioSnareSympathyIfEligible } from './engineSympathyHelper';
import { EngineTuning } from './engineTuning';
import { ALFAIA_INSTRUMENTS } from './engineTypes';

export function computeEffectiveDecayNorm(rawStepDecay?: number, rawTrackDecay?: number, isPreviewOverride = false): number {
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

    const storeState = useSequencerStore.getState();
    const hasPanAuto = track ? (!isAutomationBypassed(track, 'pan', storeState.globalAutomationBypass) && hasActiveTrackAutomation(track, 'pan')) : false;
    const spatial = resolveTrackSectionSpatialProfile(track, instrumentId, Boolean(storeState.ecoConfig?.disableFx), hasPanAuto ? 0 : (track?.panVal ?? track?.pan ?? 0));
    const rawSynthCount = spatial.isNeutralSolo ? 1 : spatial.synthesizedCount;
    const hasSquadRR = typeof deps.roundRobin.selectSquadFileIndices === 'function';
    let resolvedStroke = stroke, forceShort80ms = false;
    let synthCount = resolvedStroke.isBarulho ? rawSynthCount : Math.min(rawSynthCount, Math.max(1, resolvedStroke.files.length));
    let squadIndices = hasSquadRR ? deps.roundRobin.selectSquadFileIndices(instrumentId, resolvedStroke, time, synthCount, trackId) : null;
    const pickFile = (s: StrokeMapping, indices: number[] | null, k: number): string =>
      indices ? (s.files[indices[k] ?? indices[0]] || s.files[0] || '') : selectSquadPlayerFile(s.files, 0, k);
    let bufferEntry = deps.sampleLoader.bufferPool.get(pickFile(resolvedStroke, squadIndices, 0));

    if ((!bufferEntry || !bufferEntry.loaded) && ALFAIA_INSTRUMENTS.has(instrumentId) && (effectiveSymbol === 'A' || effectiveSymbol === 'a')) {
      const fallbackE = config.strokes.find((s) => s.symbol === 'e');
      if (fallbackE) {
        resolvedStroke = fallbackE; forceShort80ms = true;
        synthCount = Math.min(rawSynthCount, Math.max(1, fallbackE.files.length));
        squadIndices = hasSquadRR ? deps.roundRobin.selectSquadFileIndices(instrumentId, fallbackE, time, synthCount, trackId) : null;
        bufferEntry = deps.sampleLoader.bufferPool.get(pickFile(fallbackE, squadIndices, 0));
      }
    }
    if (!bufferEntry || !bufferEntry.loaded) return;

    const allTracks = deps.trackLookupMap.size > 0 ? Array.from(deps.trackLookupMap.values()) : storeState.tracks;
    const temp = overrideTuning !== undefined ? { rank: 0, attackSpreadSec: 0 } : resolveTrackSectionTemperament(track, allTracks);
    const effectiveTime = time + temp.attackSpreadSec;
    const voiceGuardKey = trackId !== null ? trackId : instrumentId;

    const isLegacyRufada = effectiveSymbol === 'r' && !STUDIO_BANK_ENABLED[instrumentId as PendingStudioInstrumentId];
    const finalVelocity = isLegacyRufada ? velocity * 0.88 : velocity;
    const pitchNuance = isLegacyRufada ? 0.985 : (resolvedStroke.compositeRimSymbol && effectiveSymbol === 'a' ? 0.992 : 1.0);
    const chorusAmount = getEffectiveSkinChorusAmount(storeState);
    const baseRate = EngineTuning.calculatePitch(instrumentId, config, track, overrideTuning, allTracks, chorusAmount);
    const calculatedPitch = resolvedStroke.isBarulho ? baseRate : baseRate * pitchNuance;
    const adaptedTrackDecay = computeAlfaiaHighBpmDecayNorm(instrumentId, track?.trackDecay, storeState.bpm);
    const effectiveDecayNorm = computeEffectiveDecayNorm(decayMultiplier, adaptedTrackDecay, overrideTuning !== undefined);
    const isStudioCalibrated = Boolean(config.calibratedStudioBank);
    const rimStroke = resolvedStroke.compositeRimSymbol ? config.strokes.find((s) => s.symbol === resolvedStroke.compositeRimSymbol) : undefined;
    const rimIndices = rimStroke && hasSquadRR ? deps.roundRobin.selectSquadFileIndices(instrumentId, rimStroke, time, synthCount, trackId) : null;
    const stepSeed = Math.round(time * 100);

    for (let k = 0; k < synthCount; k++) {
      const entryK = k === 0 ? bufferEntry : (deps.sampleLoader.bufferPool.get(pickFile(resolvedStroke, squadIndices, k)) || bufferEntry);
      if (!entryK?.loaded) continue;
      const pSpec = spatial.isNeutralSolo ? undefined : spatial.players[k];
      const jitter = !pSpec || resolvedStroke.isBarulho ? 0 : computeDeterministicStrokeJitterSec(Number(trackId) || 0, k, stepSeed, synthCount, instrumentId);
      const barSpread = pSpec && resolvedStroke.isBarulho
        ? computeBarulhoPartnerEntrySpreadSec(k, synthCount)
        : (!pSpec && resolvedStroke.isBarulho && effectiveSymbol === 'B' && temp.rank > 0 ? computeBarulhoPartnerEntrySpreadSec(temp.rank, temp.rank + 1) : 0);
      const timeK = Math.max(effectiveTime, effectiveTime + (pSpec ? pSpec.baseDelaySec + jitter + barSpread : barSpread));
      const pitchMul = pSpec ? pSpec.pitchMul : 1.0;
      const velK = overrideTuning !== undefined || resolvedStroke.isBarulho
        ? finalVelocity
        : computeLivePlayerVelocityBreathing(finalVelocity, stepSeed, Number(trackId) || 0, k, stepSeed);
      const vKey = k > 0 ? `${voiceGuardKey}__p${k}` : voiceGuardKey;

      deps.voiceGuard.chokeTrackVoice(vKey, effectiveSymbol, timeK, instrumentId);
      EngineStrokePlayback.play(
        deps.playbackCtx, trackId, instrumentId, resolvedStroke,
        entryK.get() as AudioBuffer, calculatedPitch * pitchMul, timeK, velK, effectiveDecayNorm, isLiveHold,
        { isStudioCalibrated, forceShort80ms, strokeSymbol: effectiveSymbol, maxBarulhoDurSec, playerIdx: k, partnerRank: temp.rank, playerSpec: pSpec }
      );

      if (rimStroke) {
        const rimEntry = deps.sampleLoader.bufferPool.get(pickFile(rimStroke, rimIndices, k));
        if (rimEntry?.loaded) {
          EngineStrokePlayback.play(
            deps.playbackCtx, trackId, instrumentId, rimStroke,
            rimEntry.get() as AudioBuffer, baseRate * pitchMul, timeK, velK * COMPOSITE_RIM_LAYER_VELOCITY_SCALE,
            effectiveDecayNorm, false, { isStudioCalibrated, strokeSymbol: rimStroke.symbol, playerIdx: k, playerSpec: pSpec }
          );
        }
      }
    }
    if (overrideTuning === undefined) {
      triggerWebAudioSnareSympathyIfEligible(deps, trackId, instrumentId, effectiveSymbol, finalVelocity, effectiveTime, stepSeed, allTracks);
    }

    if (instrumentId === 'apito' && effectiveSymbol !== '/' && effectiveSymbol !== '.') {
      const Tone = getTone();
      Tone?.Draw?.schedule?.(() => { window.dispatchEvent(new CustomEvent('o-girador-apito-shake')); }, effectiveTime);
    }
  }
}
