import { TrackGroup, Pattern } from '../../types';
import { areStepValuesEqual } from '../../utils/slaveStepOpacityResolver';
import { resolveActivePattern } from '../../workers/compiler/patternResolver';
import { getLiveVariationRodaSnapshots } from '../../hooks/audio-sync/liveVariationLookaheadEngine';

export interface StepSweepBlend {
  isBlending: boolean;
  primaryState: any;
  primaryMeasureIdx: number;
  primaryBaseState: any;
  primaryAlpha: number;
  secondaryState?: any;
  secondaryMeasureIdx?: number;
  secondaryBaseState?: any;
  secondaryAlpha?: number;
}

const SWEEP_HALF_WIDTH = 0.042;

export function resolveTrackStepsForMeasure(
  track: TrackGroup,
  rawTracks: TrackGroup[],
  measureIdx: number,
  soloPatternPlayId: number | null,
  stepsSnapshot?: Record<number, any> | null
): { activeSteps: any[]; baseSteps: any[]; pattern: Pattern | null } {
  const isSolo = soloPatternPlayId !== null;
  const pattern = resolveActivePattern(track, rawTracks, measureIdx, isSolo, soloPatternPlayId) as Pattern | null;
  const baseSteps = pattern?.activeSteps || [];
  const activeSteps = (stepsSnapshot && stepsSnapshot[track.id]) ? stepsSnapshot[track.id] : baseSteps;
  return { activeSteps, baseSteps, pattern };
}

export function computeContinuousSweepRatio(
  isPlaying: boolean,
  playheadRatio: number,
  rodaSweepMode?: 'sweep6h' | 'fullMeasure'
): number | null {
  if (!isPlaying || rodaSweepMode === 'fullMeasure') return null;
  const r = ((playheadRatio % 1) + 1) % 1;
  if (r >= 0.5) return r - 0.5;
  const { hasPrevMeasure } = getLiveVariationRodaSnapshots();
  if (hasPrevMeasure) return r + 0.5;
  return null;
}

export function resolveStepSweepBlend(params: {
  stepIdx: number;
  stepAngle: number;
  isPlaying: boolean;
  playheadRatio: number;
  rodaSweepMode?: 'sweep6h' | 'fullMeasure';
  currentMeasureIdx: number;
  nextMeasureIdx: number;
  prevMeasureIdx: number | null;
  hasPrevMeasure: boolean;
  currentActiveSteps: any[];
  currentBaseSteps: any[];
  nextActiveSteps: any[];
  nextBaseSteps: any[];
  prevActiveSteps: any[];
  prevBaseSteps: any[];
}): StepSweepBlend {
  const {
    stepIdx, stepAngle, isPlaying, playheadRatio, rodaSweepMode,
    currentMeasureIdx, nextMeasureIdx, prevMeasureIdx, hasPrevMeasure,
    currentActiveSteps, currentBaseSteps, nextActiveSteps, nextBaseSteps, prevActiveSteps, prevBaseSteps,
  } = params;

  const curVal = currentActiveSteps?.[stepIdx] ?? 0;
  const curBase = currentBaseSteps?.[stepIdx] ?? 0;

  if (!isPlaying || rodaSweepMode === 'fullMeasure') {
    return { isBlending: false, primaryState: curVal, primaryMeasureIdx: currentMeasureIdx, primaryBaseState: curBase, primaryAlpha: 1.0 };
  }

  const r = ((playheadRatio % 1) + 1) % 1;
  const normAngle = (((stepAngle + Math.PI / 2) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
  const p = normAngle / (Math.PI * 2);

  // Moitié Droite (12h -> 6h, p in [0, 0.5[)
  if (p < 0.5) {
    if (r < 0.5) {
      return { isBlending: false, primaryState: curVal, primaryMeasureIdx: currentMeasureIdx, primaryBaseState: curBase, primaryAlpha: 1.0 };
    }
    const rSweep = r - 0.5;
    const nextVal = nextActiveSteps?.[stepIdx] ?? 0;
    const nextBase = nextBaseSteps?.[stepIdx] ?? 0;
    if (areStepValuesEqual(curVal, nextVal)) {
      return { isBlending: false, primaryState: curVal, primaryMeasureIdx: currentMeasureIdx, primaryBaseState: curBase, primaryAlpha: 1.0 };
    }
    const alpha = Math.max(0, Math.min(1, (rSweep - p + SWEEP_HALF_WIDTH) / (2 * SWEEP_HALF_WIDTH)));
    if (alpha <= 0.01) {
      return { isBlending: false, primaryState: curVal, primaryMeasureIdx: currentMeasureIdx, primaryBaseState: curBase, primaryAlpha: 1.0 };
    }
    if (alpha >= 0.99) {
      return { isBlending: false, primaryState: nextVal, primaryMeasureIdx: nextMeasureIdx, primaryBaseState: nextBase, primaryAlpha: 1.0 };
    }
    return {
      isBlending: true,
      primaryState: curVal, primaryMeasureIdx: currentMeasureIdx, primaryBaseState: curBase, primaryAlpha: 1 - alpha,
      secondaryState: nextVal, secondaryMeasureIdx: nextMeasureIdx, secondaryBaseState: nextBase, secondaryAlpha: alpha,
    };
  }

  // Moitié Gauche (6h -> 12h, p in [0.5, 1[)
  if (r >= 0.5 || !hasPrevMeasure || prevMeasureIdx === null) {
    return { isBlending: false, primaryState: curVal, primaryMeasureIdx: currentMeasureIdx, primaryBaseState: curBase, primaryAlpha: 1.0 };
  }

  const rSweep = r + 0.5;
  const prevVal = prevActiveSteps?.[stepIdx] ?? 0;
  const prevBase = prevBaseSteps?.[stepIdx] ?? 0;
  if (areStepValuesEqual(prevVal, curVal)) {
    return { isBlending: false, primaryState: curVal, primaryMeasureIdx: currentMeasureIdx, primaryBaseState: curBase, primaryAlpha: 1.0 };
  }
  const alpha = Math.max(0, Math.min(1, (rSweep - p + SWEEP_HALF_WIDTH) / (2 * SWEEP_HALF_WIDTH)));
  if (alpha <= 0.01) {
    return { isBlending: false, primaryState: prevVal, primaryMeasureIdx: prevMeasureIdx, primaryBaseState: prevBase, primaryAlpha: 1.0 };
  }
  if (alpha >= 0.99) {
    return { isBlending: false, primaryState: curVal, primaryMeasureIdx: currentMeasureIdx, primaryBaseState: curBase, primaryAlpha: 1.0 };
  }
  return {
    isBlending: true,
    primaryState: prevVal, primaryMeasureIdx: prevMeasureIdx, primaryBaseState: prevBase, primaryAlpha: 1 - alpha,
    secondaryState: curVal, secondaryMeasureIdx: currentMeasureIdx, secondaryBaseState: curBase, secondaryAlpha: alpha,
  };
}

