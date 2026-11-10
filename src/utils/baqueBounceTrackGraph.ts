/**
 * baqueBounceTrackGraph.ts
 * Graphe hors-ligne (OfflineAudioContext) par piste pour le Bounce Baque :
 * Coupe-bas Butterworth (Q = 0.7071), EQ 3 bandes, Pan mono-compatible, Bus/Link et Choke (< 135 lignes).
 */
import { getEffectiveVolume, useSequencerStore } from '../stores/useSequencerStore';
import { faderPositionToDb, faderPositionToGain } from './audioMath';
import { applyMonoCompatiblePan } from './audio/monoCompatiblePan';
import { BUTTERWORTH_Q, resolveLowCutTargetHz } from '../audio/effects/insertEqTargets';
import { computeEffectiveDecayNorm } from '../audio/engine/engineExecuteStroke';
import { computeProgressiveDecayEnvelope } from '../audio/engine/engineStrokePlayback';
import { computeAnalyticalVoiceGainAtTime } from '../audio/engine/engineVoiceGuard';
import { isAutomationBypassed } from './automationBypassHelper';
import { hasActiveTrackAutomation } from './automationDetectHelper';
import type { ActiveVoice } from '../audio/engine/engineTypes';
import type { BaqueCycleTimingResult } from './baqueBounceTiming';

export interface OfflineTrackGraph {
  trackInputs: Map<number, GainNode>;
  activeVoicesByTrack: Map<number, ActiveVoice[]>;
}

function computeTrackLinearGain(allTracks: any[], track: any, posOverride?: number, panValOverride?: number): number {
  const effectivePos = posOverride !== undefined ? posOverride : getEffectiveVolume(allTracks, track.id);
  const rawDb = faderPositionToDb(effectivePos);
  if (!Number.isFinite(rawDb) || rawDb <= -90) return 0;
  const { panCompensationDb } = applyMonoCompatiblePan(panValOverride ?? track.panVal ?? track.pan ?? 0);
  return Math.pow(10, Math.min(12, rawDb + panCompensationDb) / 20);
}

export function buildOfflineTrackGraph(
  ctx: OfflineAudioContext, allTracks: any[], baqueTracks: any[], timing: BaqueCycleTimingResult, startMeasureIdx: number
): OfflineTrackGraph {
  const state = useSequencerStore.getState();
  const disableEq = Boolean(state.ecoConfig?.disableEq), globalBypass = state.globalAutomationBypass;
  const trackInputs = new Map<number, GainNode>(), activeVoicesByTrack = new Map<number, ActiveVoice[]>();

  for (const track of baqueTracks) {
    const input = ctx.createGain();
    const lowCut = ctx.createBiquadFilter();
    lowCut.type = 'highpass'; lowCut.Q.value = BUTTERWORTH_Q; lowCut.frequency.value = resolveLowCutTargetHz(track, disableEq);

    const eq = track.eqBands;
    const eqLow = ctx.createBiquadFilter();
    eqLow.type = 'lowshelf'; eqLow.frequency.value = eq?.low?.f ?? 100; eqLow.gain.value = disableEq ? 0 : (eq?.low?.g ?? 0);

    const eqMid = ctx.createBiquadFilter();
    eqMid.type = 'peaking'; eqMid.frequency.value = eq?.mid?.f ?? 1000;
    eqMid.Q.value = eq?.mid?.q === 'narrow' ? 2.5 : BUTTERWORTH_Q; eqMid.gain.value = disableEq ? 0 : (eq?.mid?.g ?? 0);

    const eqHigh = ctx.createBiquadFilter();
    eqHigh.type = 'highshelf'; eqHigh.frequency.value = eq?.high?.f ?? 8000; eqHigh.gain.value = disableEq ? 0 : (eq?.high?.g ?? 0);

    const panner = ctx.createStereoPanner(), basePan = track.panVal ?? track.pan ?? 0;
    panner.pan.value = applyMonoCompatiblePan(basePan).acousticPan;

    const fader = ctx.createGain();
    fader.gain.value = computeTrackLinearGain(allTracks, track);

    if (!isAutomationBypassed(track, 'volume', globalBypass) && hasActiveTrackAutomation(track, 'volume') && track.measureVols?.length) {
      const parentScale = (track.volumeVal ?? 75) > 0
        ? faderPositionToGain(getEffectiveVolume(allTracks, track.id)) / Math.max(0.0001, faderPositionToGain(track.volumeVal ?? 75))
        : 1;
      for (let m = 0; m < timing.totalMeasures; m++) {
        const pos = track.measureVols[startMeasureIdx + m] ?? (track.volumeVal ?? 75);
        fader.gain.setValueAtTime(computeTrackLinearGain(allTracks, track, pos) * parentScale, timing.measureStartsSec[m]);
      }
    }
    if (!isAutomationBypassed(track, 'pan', globalBypass) && hasActiveTrackAutomation(track, 'pan') && track.measurePans?.length) {
      for (let m = 0; m < timing.totalMeasures; m++) {
        const panPos = track.measurePans[startMeasureIdx + m] ?? basePan;
        panner.pan.setValueAtTime(applyMonoCompatiblePan(panPos).acousticPan, timing.measureStartsSec[m]);
      }
    }

    input.connect(lowCut); lowCut.connect(eqLow); eqLow.connect(eqMid); eqMid.connect(eqHigh);
    eqHigh.connect(panner); panner.connect(fader); fader.connect(ctx.destination);
    trackInputs.set(track.id, input); activeVoicesByTrack.set(track.id, []);
  }
  return { trackInputs, activeVoicesByTrack };
}

export function scheduleOfflineStrokeHit(
  ctx: OfflineAudioContext, graph: OfflineTrackGraph, track: any, instId: string, strokeSymbol: string,
  buffer: AudioBuffer, pitchRate: number, triggerTimeSec: number, velocity: number, stepDecayNorm: number, maxEndSec: number
): void {
  const trackInput = graph.trackInputs.get(track.id);
  if (!trackInput || triggerTimeSec >= maxEndSec - 0.001) return;
  const time = Math.max(0, triggerTimeSec), voices = graph.activeVoicesByTrack.get(track.id) || [];

  if (strokeSymbol === 'p' || strokeSymbol === 'P') {
    for (const v of voices) {
      if (v.gainNode && v.time < time && time < v.expectedEnd) {
        const gAt = computeAnalyticalVoiceGainAtTime(v, time);
        v.gainNode.gain.cancelScheduledValues(time); v.gainNode.gain.setValueAtTime(gAt, time);
        v.gainNode.gain.linearRampToValueAtTime(0.0001, time + 0.008); v.gainNode.gain.setValueAtTime(0, time + 0.009);
        v.expectedEnd = time + 0.010; try { v.source.stop(time + 0.010); } catch (_) {}
      }
    }
  }

  const isLeftHandRufada = strokeSymbol === 'r';
  const normVel = (velocity > 3.0 ? velocity / 100 : velocity) * (isLeftHandRufada ? 0.88 : 1.0);
  const peakGain = Math.pow(Math.max(0, Math.min(2.0, normVel * 1.142857)), 1.8);
  if (peakGain <= 0.0001) return;

  const effectiveRate = Math.max(0.25, pitchRate * (isLeftHandRufada ? 0.985 : 1.0));
  const realWorldDur = buffer.duration / effectiveRate;
  const env = computeProgressiveDecayEnvelope(realWorldDur, computeEffectiveDecayNorm(stepDecayNorm, track.trackDecay, false));
  const holdEnd = time + env.holdSec, releaseEnd = env.isFullBuffer ? time + realWorldDur : holdEnd + env.releaseSec;
  const expectedEnd = Math.min(maxEndSec, env.isFullBuffer ? releaseEnd : releaseEnd + 0.01);

  const src = ctx.createBufferSource(), gainNode = ctx.createGain();
  src.buffer = buffer; src.playbackRate.value = effectiveRate;
  src.connect(gainNode); gainNode.connect(trackInput);

  gainNode.gain.setValueAtTime(peakGain, time);
  gainNode.gain.setValueAtTime(peakGain, Math.min(expectedEnd, holdEnd));
  if (!env.isFullBuffer && holdEnd < expectedEnd) {
    gainNode.gain.linearRampToValueAtTime(peakGain * 0.35, Math.min(expectedEnd, holdEnd + env.releaseSec * 0.5));
    gainNode.gain.exponentialRampToValueAtTime(0.0001, Math.min(expectedEnd, releaseEnd));
  }
  gainNode.gain.linearRampToValueAtTime(0, expectedEnd);
  src.start(time); src.stop(expectedEnd);
  voices.push({ source: src, gainNode, time, holdEnd, releaseEnd, expectedEnd, velocity: peakGain, isFullBuffer: env.isFullBuffer, instrumentId: instId });
}
