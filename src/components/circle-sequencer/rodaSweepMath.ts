import { TrackGroup, Pattern } from '../../types';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { useTransportStore } from '../../stores/useTransportStore';
import { areStepValuesEqual } from '../../utils/slaveStepOpacityResolver';
import { resolveEffectivePatternStepsForSoloOrLive } from '../../utils/soloVariationMatcher';
import {
  angleToNormalizedRodaRatio, computeMeasurePatternStepOffset, computeRodaStepAngles,
  findStepIndexAtNormalizedP, normalizeTimeSig, resolveActiveBeatResolutions,
} from '../../utils/rodaTimeSigGeometry';
import { resolveActivePattern } from '../../workers/compiler/patternResolver';
import { getLiveVariationRodaSnapshots } from '../../hooks/audio-sync/liveVariationLookaheadEngine';

export interface StepSweepBlend {
  isBlending: boolean; primaryState: any; primaryMeasureIdx: number; primaryBaseState: any;
  primaryStepIdx: number; primaryStepCount: number; primaryAlpha: number;
  secondaryState?: any; secondaryMeasureIdx?: number; secondaryBaseState?: any;
  secondaryStepIdx?: number; secondaryStepCount?: number; secondaryAlpha?: number;
}

const SWEEP_TRANSITION_WIDTH = 0.045;

export function resolveTrackStepsForMeasure(
  track: TrackGroup, rawTracks: TrackGroup[], measureIdx: number, soloPatternPlayId: number | null,
  stepsSnapshot?: Record<number, any> | null, measureTimeSigs?: Record<number, string>, defaultTimeSig?: string
): { activeSteps: any[]; baseSteps: any[]; pattern: Pattern | null; stepAngles: number[]; stepCount: number; timeSig: string } {
  const isSolo = soloPatternPlayId !== null;
  const soloVarId = isSolo ? useTransportStore.getState().soloPatternVariationId : null;
  const pattern = resolveActivePattern(track, rawTracks, measureIdx, isSolo, soloPatternPlayId) as Pattern | null;
  const rawBase = pattern?.activeSteps || [];
  const canVary = Boolean(pattern?.variations?.length && (isSolo || pattern.measureAllowVariations?.[measureIdx] !== false));
  const { steps: rawActive, beatResolutions: varBeatRes } = resolveEffectivePatternStepsForSoloOrLive({
    pattern, trackId: track.id, tracks: rawTracks, soloPatternPlayId, soloPatternVariationId: soloVarId,
    liveStepsMap: stepsSnapshot, canUseLiveVariation: canVary,
  });
  const timeSig = normalizeTimeSig(measureTimeSigs?.[measureIdx] || defaultTimeSig || '4/4');
  const beatRes = resolveActiveBeatResolutions(timeSig, pattern ? { ...pattern, beatResolutions: varBeatRes } : null);
  const stepAngles = computeRodaStepAngles(timeSig, beatRes), stepCount = stepAngles.length;
  const offset = computeMeasurePatternStepOffset(pattern, stepCount, measureIdx);
  const activeSteps = offset > 0 ? rawActive.slice(offset, offset + stepCount) : rawActive;
  const baseSteps = offset > 0 ? rawBase.slice(offset, offset + stepCount) : rawBase;
  return { activeSteps, baseSteps, pattern, stepAngles, stepCount, timeSig };
}

export const angleToNormalizedP = angleToNormalizedRodaRatio;

export function buildCandidateAnglesForSweep(
  currAngles: number[], nextAngles: number[], prevAngles: number[],
  isPlaying: boolean, rodaSweepMode?: 'sweep6h' | 'fullMeasure', canSweepNext = true, canSweepPrev = true
): { p: number; angle: number }[] {
  const list: { p: number; angle: number }[] = currAngles.map((angle) => ({ p: angleToNormalizedP(angle), angle }));
  if (!isPlaying || rodaSweepMode === 'fullMeasure') return list;
  const addUnique = (angles: number[]) => {
    for (let i = 0; i < angles.length; i++) {
      const p = angleToNormalizedP(angles[i]);
      if (!list.some((item) => Math.abs(item.p - p) < 1e-4)) list.push({ p, angle: -Math.PI / 2 + p * Math.PI * 2 });
    }
  };
  if (canSweepNext) addUnique(nextAngles);
  if (canSweepPrev) addUnique(prevAngles);
  return list.sort((a, b) => a.p - b.p);
}

function resolveAtNormalizedP(p: number, stepAngles: readonly number[], stepCount: number, activeSteps: any[], baseSteps: any[]) {
  if (stepCount <= 0) return { state: 0, baseState: 0, stepIdx: 0, stepCount: 16 };
  const idx = stepAngles.length > 0
    ? findStepIndexAtNormalizedP(stepAngles, p)
    : (Math.abs(p * stepCount - Math.round(p * stepCount)) < 1e-4 ? Math.round(p * stepCount) : -1);
  return (idx >= 0 && idx < stepCount)
    ? { state: activeSteps?.[idx] ?? 0, baseState: baseSteps?.[idx] ?? 0, stepIdx: idx, stepCount }
    : { state: 0, baseState: 0, stepIdx: -1, stepCount };
}

export function computeContinuousSweepRatio(
  isPlaying: boolean, playheadRatio: number, rodaSweepMode?: 'sweep6h' | 'fullMeasure',
  currentMeasureIdx?: number, nextMeasureIdx?: number | null, measureTimeSigs?: Record<number, string>, defaultTimeSig?: string
): number | null {
  if (!isPlaying || rodaSweepMode === 'fullMeasure' || playheadRatio < 0) return null;
  const st = useSequencerStore.getState(), mSigs = measureTimeSigs ?? st.measureTimeSigs, defSig = defaultTimeSig ?? st.timeSig ?? '4/4';
  const currM = currentMeasureIdx ?? st.currentMeasure ?? 0, currSig = normalizeTimeSig(mSigs?.[currM] || defSig);
  const r = ((playheadRatio % 1) + 1) % 1;
  if (r >= 0.5) {
    const totalM = st.totalMeasures || 1;
    const atEnd = st.isLoopRegionActive && st.loopEndMeasure !== null && currM === st.loopEndMeasure && !st.isLoopExitRequested;
    const nextM = nextMeasureIdx ?? (st.queuedMeasure ?? (atEnd ? (st.loopStartMeasure ?? 0) : (currM + 1) % totalM));
    return currSig === normalizeTimeSig(mSigs?.[nextM] || defSig) ? r - 0.5 : null;
  }
  const snaps = getLiveVariationRodaSnapshots();
  if (!snaps.hasPrevMeasure || snaps.prevMeasureIdx === null) return null;
  return currSig === normalizeTimeSig(mSigs?.[snaps.prevMeasureIdx] || defSig) ? r + 0.5 : null;
}

export function resolveStepSweepBlend(params: {
  p: number; isPlaying: boolean; playheadRatio: number; rodaSweepMode?: 'sweep6h' | 'fullMeasure';
  currentMeasureIdx: number; nextMeasureIdx: number; prevMeasureIdx: number | null; hasPrevMeasure: boolean;
  currStepCount: number; currentActiveSteps: any[]; currentBaseSteps: any[]; currStepAngles?: readonly number[]; currTimeSig?: string;
  nextStepCount: number; nextActiveSteps: any[]; nextBaseSteps: any[]; nextStepAngles?: readonly number[]; nextTimeSig?: string;
  prevStepCount: number; prevActiveSteps: any[]; prevBaseSteps: any[]; prevStepAngles?: readonly number[]; prevTimeSig?: string;
}): StepSweepBlend {
  const {
    p, isPlaying, playheadRatio, rodaSweepMode, currentMeasureIdx, nextMeasureIdx, prevMeasureIdx, hasPrevMeasure,
    currStepCount, currentActiveSteps, currentBaseSteps, currStepAngles = [],
    nextStepCount, nextActiveSteps, nextBaseSteps, nextStepAngles = [],
    prevStepCount, prevActiveSteps, prevBaseSteps, prevStepAngles = [],
  } = params;
  const cur = resolveAtNormalizedP(p, currStepAngles, currStepCount, currentActiveSteps, currentBaseSteps);
  const makeSingle = (slot: typeof cur, mIdx: number): StepSweepBlend => ({
    isBlending: false, primaryState: slot.state, primaryMeasureIdx: mIdx, primaryBaseState: slot.baseState,
    primaryStepIdx: Math.max(0, slot.stepIdx), primaryStepCount: slot.stepCount, primaryAlpha: 1.0,
  });
  if (!isPlaying || rodaSweepMode === 'fullMeasure' || playheadRatio < 0) return makeSingle(cur, currentMeasureIdx);
  const st = useSequencerStore.getState(), mSigs = st.measureTimeSigs, defSig = st.timeSig || '4/4';
  const cSig = normalizeTimeSig(params.currTimeSig ?? (mSigs?.[currentMeasureIdx] || defSig));
  const nSig = normalizeTimeSig(params.nextTimeSig ?? (mSigs?.[nextMeasureIdx] || defSig));
  const pSig = prevMeasureIdx !== null ? normalizeTimeSig(params.prevTimeSig ?? (mSigs?.[prevMeasureIdx] || defSig)) : cSig;
  const r = ((playheadRatio % 1) + 1) % 1;

  if (p < 0.5) {
    if (r < 0.5 || cSig !== nSig) return makeSingle(cur, currentMeasureIdx);
    const rSweep = r - 0.5, nxt = resolveAtNormalizedP(p, nextStepAngles, nextStepCount, nextActiveSteps, nextBaseSteps);
    const alpha = Math.max(0, Math.min(1, (rSweep - p) / SWEEP_TRANSITION_WIDTH));
    if (areStepValuesEqual(cur.state, nxt.state) && cur.stepCount === nxt.stepCount) return makeSingle(alpha >= 0.5 ? nxt : cur, alpha >= 0.5 ? nextMeasureIdx : currentMeasureIdx);
    if (alpha <= 0.01) return makeSingle(cur, currentMeasureIdx);
    if (alpha >= 0.99) return makeSingle(nxt, nextMeasureIdx);
    return {
      isBlending: true, primaryState: cur.state, primaryMeasureIdx: currentMeasureIdx, primaryBaseState: cur.baseState,
      primaryStepIdx: Math.max(0, cur.stepIdx), primaryStepCount: cur.stepCount, primaryAlpha: 1 - alpha,
      secondaryState: nxt.state, secondaryMeasureIdx: nextMeasureIdx, secondaryBaseState: nxt.baseState,
      secondaryStepIdx: Math.max(0, nxt.stepIdx), secondaryStepCount: nxt.stepCount, secondaryAlpha: alpha,
    };
  }
  if (r >= 0.5 || !hasPrevMeasure || prevMeasureIdx === null || cSig !== pSig) return makeSingle(cur, currentMeasureIdx);
  const rSweep = r + 0.5, prv = resolveAtNormalizedP(p, prevStepAngles, prevStepCount, prevActiveSteps, prevBaseSteps);
  const alpha = Math.max(0, Math.min(1, (rSweep - p) / SWEEP_TRANSITION_WIDTH));
  if (areStepValuesEqual(prv.state, cur.state) && prv.stepCount === cur.stepCount) return makeSingle(cur, currentMeasureIdx);
  if (alpha <= 0.01) return makeSingle(prv, prevMeasureIdx);
  if (alpha >= 0.99) return makeSingle(cur, currentMeasureIdx);
  return {
    isBlending: true, primaryState: prv.state, primaryMeasureIdx: prevMeasureIdx, primaryBaseState: prv.baseState,
    primaryStepIdx: Math.max(0, prv.stepIdx), primaryStepCount: prv.stepCount, primaryAlpha: 1 - alpha,
    secondaryState: cur.state, secondaryMeasureIdx: currentMeasureIdx, secondaryBaseState: cur.baseState,
    secondaryStepIdx: Math.max(0, cur.stepIdx), secondaryStepCount: cur.stepCount, secondaryAlpha: alpha,
  };
}
