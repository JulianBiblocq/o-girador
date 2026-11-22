/**
 * baqueBounceTrackGraph.ts — Graphe hors-ligne par piste & Escouades Spatiales (< 130 lignes).
 */
import { instrumentsConfig } from '../data';
import { isNeutralDefaultSectionPlayers, isSectionEnsembleEligible } from '../constants/sectionEnsembleLimits';
import { createOfflineRodaSpectralRouter, BUTTERWORTH_Q, resolveLowCutTargetHz } from '../audio/effectsChain';
import { applyWebAudioTrackSkinPhysics } from '../audio/engine/alfaiaTrackVoicePhysics';
import { computeEffectiveDecayNorm } from '../audio/engine/engineExecuteStroke';
import { computeEnginePeakGain, computeProgressiveDecayEnvelope } from '../audio/engine/engineStrokePlayback';
import type { ActiveVoice } from '../audio/engine/engineTypes';
import type { SectionPlayerAcousticSpec } from '../audio/spatial/sectionSpatialAcoustics';
import { createSpatialPlayerRouting } from '../audio/spatial/webAudioPlayerPanner';
import { getEffectiveRodaBreathingAmount, getEffectiveVolume, useSequencerStore } from '../stores/useSequencerStore';
import { applyMonoCompatiblePan } from './audio/monoCompatiblePan';
import { CONSOLE_HEADROOM_GAIN, faderPositionToDb, faderPositionToGain } from './audioMath';
import { isAutomationBypassed } from './automationBypassHelper';
import { hasActiveTrackAutomation } from './automationDetectHelper';
import { EMPTY_BOUNCE_STEM_PLAN, createOfflineStemInputs, resolveOfflineTrackRouting, type BounceBusStemPlan } from './baqueBounceBusStems';
import type { BaqueCycleTimingResult } from './baqueBounceTiming';

export interface OfflineTrackGraph {
  trackInputs: Map<number, GainNode>;
  activeVoicesByTrack: Map<string | number, ActiveVoice[]>;
}

function computeTrackLinearGain(allTracks: any[], track: any, posOverride?: number, panValOverride?: number): number {
  const rawDb = faderPositionToDb(posOverride !== undefined ? posOverride : getEffectiveVolume(allTracks, track.id));
  if (!Number.isFinite(rawDb) || rawDb <= -90) return 0;
  const { panCompensationDb } = applyMonoCompatiblePan(panValOverride ?? track.panVal ?? track.pan ?? 0);
  return Math.pow(10, Math.min(12, rawDb + panCompensationDb) / 20);
}

export function buildOfflineTrackGraph(
  ctx: OfflineAudioContext, allTracks: any[], baqueTracks: any[], timing: BaqueCycleTimingResult, startMeasureIdx: number,
  stemPlan: BounceBusStemPlan = EMPTY_BOUNCE_STEM_PLAN
): OfflineTrackGraph {
  const state = useSequencerStore.getState();
  const disableEq = Boolean(state.ecoConfig?.disableEq), globalBypass = state.globalAutomationBypass;
  const trackInputs = new Map<number, GainNode>(), activeVoicesByTrack = new Map<string | number, ActiveVoice[]>();
  const stems = createOfflineStemInputs(ctx, stemPlan);
  const routeSpectral = createOfflineRodaSpectralRouter(ctx, allTracks, stems, getEffectiveRodaBreathingAmount(state), disableEq);

  for (const track of baqueTracks) {
    const inst = instrumentsConfig[track.instrumentIdx], instId = inst?.id ?? '';
    const route = resolveOfflineTrackRouting(track, allTracks, stemPlan);
    const input = ctx.createGain(); input.gain.value = CONSOLE_HEADROOM_GAIN * route.sign;
    const lowCut = ctx.createBiquadFilter();
    lowCut.type = 'highpass'; lowCut.Q.value = BUTTERWORTH_Q; lowCut.frequency.value = resolveLowCutTargetHz(track, disableEq);

    const eq = track.eqBands;
    const eqLow = ctx.createBiquadFilter(); eqLow.type = 'lowshelf'; eqLow.frequency.value = eq?.low?.f ?? 100; eqLow.gain.value = disableEq ? 0 : (eq?.low?.g ?? 0);
    const eqMid = ctx.createBiquadFilter(); eqMid.type = 'peaking'; eqMid.frequency.value = eq?.mid?.f ?? 1000;
    eqMid.Q.value = eq?.mid?.q === 'narrow' ? 2.5 : BUTTERWORTH_Q; eqMid.gain.value = disableEq ? 0 : (eq?.mid?.g ?? 0);
    const eqHigh = ctx.createBiquadFilter(); eqHigh.type = 'highshelf'; eqHigh.frequency.value = eq?.high?.f ?? 8000; eqHigh.gain.value = disableEq ? 0 : (eq?.high?.g ?? 0);

    const hasPanAuto = !isAutomationBypassed(track, 'pan', globalBypass) && hasActiveTrackAutomation(track, 'pan') && Boolean(track.measurePans?.length);
    const hasSectionSpatial = !isNeutralDefaultSectionPlayers(track.sectionPlayers) && isSectionEnsembleEligible(instId, inst?.type);
    const effPanVal = hasSectionSpatial && !hasPanAuto ? 0 : (track.panVal ?? track.pan ?? 0);

    const panner = ctx.createStereoPanner(); panner.pan.value = applyMonoCompatiblePan(effPanVal).acousticPan;
    const fader = ctx.createGain(); fader.gain.value = computeTrackLinearGain(allTracks, track, undefined, effPanVal) * route.stemScale;

    if (!isAutomationBypassed(track, 'volume', globalBypass) && hasActiveTrackAutomation(track, 'volume') && track.measureVols?.length) {
      const parentScale = (track.volumeVal ?? 75) > 0
        ? faderPositionToGain(getEffectiveVolume(allTracks, track.id)) / Math.max(0.0001, faderPositionToGain(track.volumeVal ?? 75)) : 1;
      for (let m = 0; m < timing.totalMeasures; m++) {
        const pos = track.measureVols[startMeasureIdx + m] ?? (track.volumeVal ?? 75);
        fader.gain.setValueAtTime(computeTrackLinearGain(allTracks, track, pos, effPanVal) * parentScale * route.stemScale, timing.measureStartsSec[m]);
      }
    }
    if (hasPanAuto) {
      const basePan = track.panVal ?? track.pan ?? 0;
      for (let m = 0; m < timing.totalMeasures; m++) {
        panner.pan.setValueAtTime(applyMonoCompatiblePan(track.measurePans[startMeasureIdx + m] ?? basePan).acousticPan, timing.measureStartsSec[m]);
      }
    }

    input.connect(lowCut); lowCut.connect(eqLow); lowCut.connect(eqMid); eqMid.connect(eqHigh);
    eqHigh.connect(panner); panner.connect(fader); fader.connect(routeSpectral(instId, route.stemIndex));
    trackInputs.set(track.id, input); activeVoicesByTrack.set(track.id, []);
  }
  return { trackInputs, activeVoicesByTrack };
}

export function scheduleOfflineStrokeHit(
  ctx: OfflineAudioContext, graph: OfflineTrackGraph, track: any, instId: string, strokeSymbol: string,
  buffer: AudioBuffer, pitchRate: number, triggerTimeSec: number, velocity: number, stepDecayNorm: number, maxEndSec: number,
  opts: { isStudioCalibrated?: boolean; forceShort80ms?: boolean; strokeBaseGain?: number; playerIdx?: number; playerSpec?: SectionPlayerAcousticSpec } = {}
): void {
  const trackInput = graph.trackInputs.get(track.id);
  if (!trackInput || triggerTimeSec >= maxEndSec - 0.001) return;
  const pIdx = opts.playerIdx ?? 0, vKey = pIdx > 0 ? `${track.id}__p${pIdx}` : track.id;
  let voices = graph.activeVoicesByTrack.get(vKey);
  if (!voices) { voices = []; graph.activeVoicesByTrack.set(vKey, voices); }
  const time = Math.max(0, triggerTimeSec);

  applyWebAudioTrackSkinPhysics(voices, instId, strokeSymbol, time);

  const isLeftHandRufada = strokeSymbol === 'r';
  const adjVel = (velocity > 3.0 ? velocity / 100 : velocity) * (isLeftHandRufada ? 0.88 : 1.0);
  const basePeak = computeEnginePeakGain(adjVel, opts.strokeBaseGain ?? 1.0, Boolean(opts.isStudioCalibrated), false);
  if (basePeak <= 0.0001) return;

  const spatialRoute = createSpatialPlayerRouting(ctx, trackInput, opts.playerSpec, buffer.numberOfChannels || 1);
  const peakGain = basePeak * spatialRoute.gainCompensation;
  if (peakGain <= 0.0001) return;

  const effectiveRate = Math.max(0.25, pitchRate * (isLeftHandRufada ? 0.985 : 1.0));
  const realWorldDur = buffer.duration / effectiveRate;
  const env = computeProgressiveDecayEnvelope(realWorldDur, computeEffectiveDecayNorm(stepDecayNorm, track.trackDecay, false), Boolean(opts.forceShort80ms));
  const holdEnd = time + env.holdSec, releaseEnd = env.isFullBuffer ? time + realWorldDur : holdEnd + env.releaseSec;
  const expectedEnd = Math.min(maxEndSec, env.isFullBuffer ? releaseEnd : releaseEnd + 0.01);

  const src = ctx.createBufferSource(), gainNode = ctx.createGain();
  src.buffer = buffer; src.playbackRate.value = effectiveRate;
  let lpFilter: BiquadFilterNode | null = null;
  if (instId === 'timbal' && (strokeSymbol === 'G' || strokeSymbol === 'g')) {
    lpFilter = ctx.createBiquadFilter(); lpFilter.type = 'lowpass'; lpFilter.frequency.value = 20000; lpFilter.Q.value = Math.SQRT1_2;
    src.connect(lpFilter); lpFilter.connect(gainNode);
  } else {
    src.connect(gainNode);
  }
  gainNode.connect(spatialRoute.entryNode);

  gainNode.gain.setValueAtTime(peakGain, time);
  gainNode.gain.setValueAtTime(peakGain, Math.min(expectedEnd, holdEnd));
  if (!env.isFullBuffer && holdEnd < expectedEnd) {
    gainNode.gain.linearRampToValueAtTime(peakGain * 0.35, Math.min(expectedEnd, holdEnd + env.releaseSec * 0.5));
    gainNode.gain.exponentialRampToValueAtTime(0.0001, Math.min(expectedEnd, releaseEnd));
  }
  gainNode.gain.linearRampToValueAtTime(0, expectedEnd);
  src.start(time); src.stop(expectedEnd);
  voices.push({
    source: src, gainNode, time, holdEnd, releaseEnd, expectedEnd,
    velocity: peakGain, isFullBuffer: env.isFullBuffer, instrumentId: instId, strokeSymbol, isDucked: false, lpFilter,
  });
}
