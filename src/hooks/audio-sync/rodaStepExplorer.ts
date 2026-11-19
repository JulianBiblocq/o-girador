/**
 * Exploration pas-à-pas (← / →) sur la Roda en Pause ou Stop (< 125 lignes).
 * - Multi-signatures & beatResolutions dynamiques, balai +180° à froid, Zéro Render Thrashing intra-mesure.
 */

import { Track } from '../../types';
import { AudioEngine } from '../../AudioEngine';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { useTransportStore } from '../../stores/useTransportStore';
import { getExpandedMeasures } from '../../utils/measureHelpers';
import {
  angleToNormalizedRodaRatio, computeRodaStepAngles, getRodaMeasureGeometry, resolveActiveBeatResolutions,
} from '../../utils/rodaTimeSigGeometry';
import { resolveActivePattern } from '../../workers/compiler/patternResolver';
import { tickSubscribers } from './audioSyncTypes';
import { getAudioEngine } from './audioEngineNodes';
import { freezeAt, frozenPlaybackState, setFrozenStep } from './frozenPlaybackState';
import { getLiveVariationRodaSnapshots, syncStepExploreVariationSnapshots } from './liveVariationLookaheadEngine';
import { previewRodaStepAudio } from './stepAudioPreviewer';

export interface RodaStepExploreContext {
  audioEngine?: AudioEngine | null; tracksRef?: { current: Track[] }; totalMeasuresRef?: { current: number };
  measureCountRef: { current: number }; currentStepIndexRef: { current: number }; maxTicksRef: { current: number };
  measureTimeSigsRef?: { current: Record<number, string> }; measureBpmsRef?: { current: number[] };
  isLoopRegionActiveRef?: { current: boolean }; loopStartRef?: { current: number | null };
  loopEndRef?: { current: number | null }; isLoopExitRequestedRef?: { current: boolean };
  soloPatternPlayIdRef?: { current: number | null }; soloPatternVariationIdRef?: { current: string | null };
  activeVariationsRef?: { current: Record<number, any> }; tickEventDetailRef: { current: any };
  setCurrentMeasure: (m: number) => void;
}

export function resolveMeasureExploreGrid(measureIdx: number, timeSig: string, tracks: Track[], soloId: number | null) {
  const geom = getRodaMeasureGeometry(timeSig);
  const perBeatMax = new Array<number>(geom.beatsCount).fill(0);
  let hasActivePattern = false;
  for (let i = 0; i < tracks.length; i++) {
    const t = tracks[i];
    if (!t || t.isBusFolder || t.isLinkFolder) continue;
    const pat = resolveActivePattern(t, tracks, measureIdx, soloId !== null, soloId);
    if (!pat) continue;
    hasActivePattern = true;
    const res = resolveActiveBeatResolutions(timeSig, pat);
    for (let b = 0; b < geom.beatsCount; b++) {
      const val = Math.max(1, res[b] || geom.defaultSubdivisions);
      if (val > perBeatMax[b]) perBeatMax[b] = val;
    }
  }
  const beatRes = hasActivePattern ? perBeatMax.map((v) => (v > 0 ? v : geom.defaultSubdivisions)) : new Array<number>(geom.beatsCount).fill(geom.defaultSubdivisions);
  const stepAngles = computeRodaStepAngles(timeSig, beatRes);
  return { beatRes, totalSteps: Math.max(1, stepAngles.length), stepAngles, maxTicks: geom.maxTicks };
}

export function stepExploreRoda(direction: 'next' | 'prev', ctx: RodaStepExploreContext): void {
  const store = useSequencerStore.getState(), transport = useTransportStore.getState();
  const tracks = ctx.tracksRef?.current ?? store.tracks ?? [];
  const totalM = Math.max(1, ctx.totalMeasuresRef?.current ?? store.totalMeasures ?? 1);
  const mSigs = ctx.measureTimeSigsRef?.current ?? store.measureTimeSigs ?? {};
  const soloId = ctx.soloPatternPlayIdRef?.current ?? transport.soloPatternPlayId ?? null;
  const soloVarId = ctx.soloPatternVariationIdRef?.current ?? transport.soloPatternVariationId ?? null;
  const isLoopActive = Boolean(ctx.isLoopRegionActiveRef?.current ?? store.isLoopRegionActive);
  const loopStart = ctx.loopStartRef?.current ?? store.loopStartMeasure, loopEnd = ctx.loopEndRef?.current ?? store.loopEndMeasure;
  const isLoopExit = Boolean(ctx.isLoopExitRequestedRef?.current ?? store.isLoopExitRequested);

  const getSig = (m: number) => mSigs[m] || store.timeSig || '4/4';
  const getNextM = (m: number) => (isLoopActive && loopEnd !== null && m === loopEnd && !isLoopExit) ? (loopStart ?? 0) : (m + 1) % totalM;
  const getPrevM = (m: number) => (isLoopActive && loopStart !== null && m === loopStart) ? (loopEnd ?? (totalM - 1)) : (m - 1 + totalM) % totalM;

  const wasFrozen = frozenPlaybackState.active;
  const prevMeasure = Math.max(0, Math.min(totalM - 1, wasFrozen ? frozenPlaybackState.measure : (ctx.measureCountRef.current ?? store.currentMeasure ?? 0)));
  let targetMeasure = prevMeasure, targetStep = 0, crossed12h = false;

  if (!wasFrozen) {
    if (direction === 'prev') {
      targetMeasure = getPrevM(prevMeasure);
      targetStep = resolveMeasureExploreGrid(targetMeasure, getSig(targetMeasure), tracks, soloId).totalSteps - 1;
      crossed12h = true;
    }
  } else {
    const currGrid = resolveMeasureExploreGrid(prevMeasure, getSig(prevMeasure), tracks, soloId);
    const currStep = frozenPlaybackState.totalSteps === currGrid.totalSteps ? frozenPlaybackState.step : Math.min(currGrid.totalSteps - 1, Math.max(0, Math.floor(frozenPlaybackState.progress * currGrid.totalSteps)));
    if (direction === 'next') {
      if (currStep + 1 < currGrid.totalSteps) targetStep = currStep + 1;
      else { targetMeasure = getNextM(prevMeasure); targetStep = 0; crossed12h = true; }
    } else if (currStep - 1 >= 0) {
      targetStep = currStep - 1;
    } else {
      targetMeasure = getPrevM(prevMeasure);
      targetStep = resolveMeasureExploreGrid(targetMeasure, getSig(targetMeasure), tracks, soloId).totalSteps - 1;
      crossed12h = true;
    }
  }

  const targetSig = getSig(targetMeasure), targetGrid = resolveMeasureExploreGrid(targetMeasure, targetSig, tracks, soloId);
  setFrozenStep(targetMeasure, targetStep, targetGrid.totalSteps, targetGrid.maxTicks);
  const exactProgress = targetGrid.stepAngles[targetStep] !== undefined ? angleToNormalizedRodaRatio(targetGrid.stepAngles[targetStep]) : frozenPlaybackState.progress;
  if (Math.abs(exactProgress - frozenPlaybackState.progress) > 1e-6) {
    freezeAt({ measure: targetMeasure, step: targetStep, totalSteps: targetGrid.totalSteps, progress: exactProgress, tick: Math.round(exactProgress * targetGrid.maxTicks), maxTicks: targetGrid.maxTicks, iteration: frozenPlaybackState.iteration, loopIteration: frozenPlaybackState.loopIteration });
  }
  if (!transport.isPaused) transport.setIsPaused(true);

  const naturalPrevM = getPrevM(targetMeasure), naturalNextM = store.queuedMeasure ?? getNextM(targetMeasure);
  const prevSnapM = (crossed12h || getLiveVariationRodaSnapshots().hasPrevMeasure || (wasFrozen && direction === 'prev')) ? naturalPrevM : null;
  const currSnap = syncStepExploreVariationSnapshots({
    prevMeasureIdx: prevSnapM, currentMeasureIdx: targetMeasure, nextMeasureIdx: naturalNextM, playheadRatio: frozenPlaybackState.progress,
    tracks, measureTimeSigs: mSigs, soloPatternPlayId: soloId, soloPatternVariationId: soloVarId, activeVariationsRef: ctx.activeVariationsRef,
  });

  ctx.measureCountRef.current = targetMeasure; ctx.currentStepIndexRef.current = frozenPlaybackState.tick; ctx.maxTicksRef.current = targetGrid.maxTicks;
  const activeEngine = ctx.audioEngine ?? getAudioEngine();
  if (activeEngine) { activeEngine.currentMeasure = targetMeasure; activeEngine.currentStep = frozenPlaybackState.tick; }

  if (targetMeasure !== store.currentMeasure) {
    ctx.setCurrentMeasure(targetMeasure);
    const expanded = getExpandedMeasures(totalM, store.songSections);
    const expIdx = expanded.findIndex((item) => item.baseMeasure === targetMeasure);
    store.setCurrentExpandedMeasureIdx(expIdx !== -1 ? expIdx : targetMeasure);
  }

  const detail = ctx.tickEventDetailRef.current;
  Object.assign(detail, {
    step: frozenPlaybackState.tick, measure: targetMeasure, maxTicks: targetGrid.maxTicks, ratio: frozenPlaybackState.progress,
    visualStep16: Math.floor(frozenPlaybackState.progress * 16), visualStep12: Math.floor(frozenPlaybackState.progress * 12),
    time: 0, iteration: frozenPlaybackState.iteration, loopIteration: frozenPlaybackState.loopIteration,
    isPreRoll: false, isPaused: true, isNavigation: false, isStepPreview: true,
  });
  tickSubscribers.forEach((cb) => { try { cb(detail); } catch (err) { console.error(err); } });

  const rawBpm = ctx.measureBpmsRef?.current?.[targetMeasure] ?? store.measureBpms?.[targetMeasure];
  previewRodaStepAudio({
    measureIdx: targetMeasure, stepIdx: targetStep, measureBeatRes: targetGrid.beatRes, timeSig: targetSig,
    bpm: rawBpm && rawBpm > 0 ? rawBpm : (store.bpm || 100), tracks, soloPatternPlayId: soloId,
    activeVariationsMap: currSnap.stepsByTrackId, audioEngine: activeEngine,
  });
}
