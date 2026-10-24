import { TrackGroup } from '../../types';
import { syncPatternAcrossLinkedFamily } from './patternStepLinkedTracksSync';

function applyStepParamUpdate<T extends number>(
  currentValues: (T | [T, T])[] | undefined,
  stepsCount: number,
  defaultValue: T,
  stepIdx: number | number[],
  val: T,
  subIndex?: 0 | 1,
  activeSteps?: any[]
): (T | [T, T])[] {
  const copy = [...(currentValues || Array(stepsCount).fill(defaultValue))];
  const updateIdx = (idx: number) => {
    const isSplit = activeSteps ? Array.isArray(activeSteps[idx]) : Array.isArray(copy[idx]);
    if (subIndex === undefined) {
      copy[idx] = isSplit ? [val, val] : val;
    } else {
      const cur = copy[idx];
      const base0 = Array.isArray(cur) ? cur[0] : (cur ?? defaultValue);
      const base1 = Array.isArray(cur) ? cur[1] : (cur ?? defaultValue);
      copy[idx] = subIndex === 0 ? [val, base1] : [base0, val];
    }
  };
  if (Array.isArray(stepIdx)) {
    stepIdx.forEach((idx) => updateIdx(idx));
  } else {
    updateIdx(stepIdx);
  }
  return copy;
}

export const handleTrackStepVolumeChangeState = (
  tracks: TrackGroup[],
  trackId: number,
  patternId: number,
  stepIdx: number | number[],
  val: number,
  subIndex?: 0 | 1
): TrackGroup[] => syncPatternAcrossLinkedFamily(tracks, trackId, patternId, (p) => ({
  ...p,
  volumes: applyStepParamUpdate(p.volumes, p.steps, 80, stepIdx, val, subIndex, p.activeSteps),
}));

export const handleTrackStepDecayChangeState = (
  tracks: TrackGroup[],
  trackId: number,
  patternId: number,
  stepIdx: number | number[],
  val: number,
  subIndex?: 0 | 1
): TrackGroup[] => syncPatternAcrossLinkedFamily(tracks, trackId, patternId, (p) => ({
  ...p,
  decays: applyStepParamUpdate(p.decays, p.steps, 100, stepIdx, val, subIndex, p.activeSteps),
}));

export const handleTrackStepMicrotimingChangeState = (
  tracks: TrackGroup[],
  trackId: number,
  patternId: number,
  stepIdx: number | number[],
  val: number,
  subIndex?: 0 | 1
): TrackGroup[] => syncPatternAcrossLinkedFamily(tracks, trackId, patternId, (p) => ({
  ...p,
  microtimings: applyStepParamUpdate(p.microtimings, p.steps, 0, stepIdx, val, subIndex, p.activeSteps),
}));

export const handleVocalLatencyChangeState = (
  tracks: TrackGroup[],
  trackId: number,
  patternId: number,
  latencyMs: number
): TrackGroup[] => tracks.map((t) => {
  if (t.id === trackId) {
    return {
      ...t,
      patterns: t.patterns.map((p) => (p.id === patternId ? { ...p, vocalLatency: latencyMs } : p))
    };
  }
  return t;
});
