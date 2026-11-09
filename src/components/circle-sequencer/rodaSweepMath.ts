import { TrackGroup, Pattern } from '../../types';
import { areStepValuesEqual } from '../../utils/slaveStepOpacityResolver';
import { resolveActivePattern } from '../../workers/compiler/patternResolver';
import { getLiveVariationRodaSnapshots } from '../../hooks/audio-sync/liveVariationLookaheadEngine';
import { resolveBeatsFromTimeSig, computeStepAngles } from './circleGeometry';

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
): { activeSteps: any[]; baseSteps: any[]; pattern: Pattern | null; stepAngles: number[]; stepCount: number } {
  const isSolo = soloPatternPlayId !== null;
  const pattern = resolveActivePattern(track, rawTracks, measureIdx, isSolo, soloPatternPlayId) as Pattern | null;
  const baseSteps = pattern?.activeSteps || [];
  const activeSteps = (stepsSnapshot && stepsSnapshot[track.id]) ? stepsSnapshot[track.id] : baseSteps;
  const sig = measureTimeSigs?.[measureIdx] || defaultTimeSig || '4/4';
  const beats = resolveBeatsFromTimeSig(String(sig), pattern?.steps || 16);
  const stepAngles = computeStepAngles(beats, pattern?.beatResolutions);
  return { activeSteps, baseSteps, pattern, stepAngles, stepCount: stepAngles.length };
}

export function angleToNormalizedP(angle: number): number {
  return ((((angle + Math.PI / 2) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)) / (Math.PI * 2);
}

export function buildCandidateAnglesForSweep(
  currAngles: number[], nextAngles: number[], prevAngles: number[],
  isPlaying: boolean, rodaSweepMode?: 'sweep6h' | 'fullMeasure'
): { p: number; angle: number }[] {
  const list: { p: number; angle: number }[] = currAngles.map((angle) => ({ p: angleToNormalizedP(angle), angle }));
  if (!isPlaying || rodaSweepMode === 'fullMeasure') return list;
  const addUnique = (angles: number[]) => {
    for (let i = 0; i < angles.length; i++) {
      const p = angleToNormalizedP(angles[i]);
      if (!list.some((item) => Math.abs(item.p - p) < 1e-4)) list.push({ p, angle: -Math.PI / 2 + p * Math.PI * 2 });
    }
  };
  addUnique(nextAngles); addUnique(prevAngles);
  return list.sort((a, b) => a.p - b.p);
}

function resolveAtNormalizedP(p: number, stepCount: number, activeSteps: any[], baseSteps: any[]) {
  if (stepCount <= 0) return { state: 0, baseState: 0, stepIdx: 0, stepCount: 16 };
  const rawIdx = p * stepCount, idx = Math.round(rawIdx);
  if (Math.abs(rawIdx - idx) < 1e-4 && idx >= 0 && idx < stepCount) {
    return { state: activeSteps?.[idx] ?? 0, baseState: baseSteps?.[idx] ?? 0, stepIdx: idx, stepCount };
  }
  return { state: 0, baseState: 0, stepIdx: -1, stepCount };
}

export function computeContinuousSweepRatio(
  isPlaying: boolean, playheadRatio: number, rodaSweepMode?: 'sweep6h' | 'fullMeasure'
): number | null {
  if (!isPlaying || rodaSweepMode === 'fullMeasure') return null;
  const r = ((playheadRatio % 1) + 1) % 1;
  if (r >= 0.5) return r - 0.5;
  return getLiveVariationRodaSnapshots().hasPrevMeasure ? r + 0.5 : null;
}

export function resolveStepSweepBlend(params: {
  p: number; isPlaying: boolean; playheadRatio: number; rodaSweepMode?: 'sweep6h' | 'fullMeasure';
  currentMeasureIdx: number; nextMeasureIdx: number; prevMeasureIdx: number | null; hasPrevMeasure: boolean;
  currStepCount: number; currentActiveSteps: any[]; currentBaseSteps: any[];
  nextStepCount: number; nextActiveSteps: any[]; nextBaseSteps: any[];
  prevStepCount: number; prevActiveSteps: any[]; prevBaseSteps: any[];
}): StepSweepBlend {
  const {
    p, isPlaying, playheadRatio, rodaSweepMode, currentMeasureIdx, nextMeasureIdx, prevMeasureIdx, hasPrevMeasure,
    currStepCount, currentActiveSteps, currentBaseSteps, nextStepCount, nextActiveSteps, nextBaseSteps,
    prevStepCount, prevActiveSteps, prevBaseSteps,
  } = params;

  const cur = resolveAtNormalizedP(p, currStepCount, currentActiveSteps, currentBaseSteps);
  const makeSingle = (slot: typeof cur, mIdx: number): StepSweepBlend => ({
    isBlending: false, primaryState: slot.state, primaryMeasureIdx: mIdx, primaryBaseState: slot.baseState,
    primaryStepIdx: Math.max(0, slot.stepIdx), primaryStepCount: slot.stepCount, primaryAlpha: 1.0,
  });

  if (!isPlaying || rodaSweepMode === 'fullMeasure') return makeSingle(cur, currentMeasureIdx);
  const r = ((playheadRatio % 1) + 1) % 1;

  if (p < 0.5) {
    if (r < 0.5) return makeSingle(cur, currentMeasureIdx);
    const rSweep = r - 0.5, nxt = resolveAtNormalizedP(p, nextStepCount, nextActiveSteps, nextBaseSteps);
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

  if (r >= 0.5 || !hasPrevMeasure || prevMeasureIdx === null) return makeSingle(cur, currentMeasureIdx);
  const rSweep = r + 0.5, prv = resolveAtNormalizedP(p, prevStepCount, prevActiveSteps, prevBaseSteps);
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

