/**
 * Helper pur de décalage rapide de cases ([ ◀ ] / [ ▶ ]) (< 120 lignes).
 */
import { Pattern, TrackGroup } from '../../types';
import { syncPatternAcrossLinkedFamily } from './patternStepLinkedTracksSync';

export interface StepShiftRange {
  startStep: number;
  endStep: number;
  isPreRoll?: boolean;
}

function shiftArrayRange<T>(arr: T[], minStep: number, maxStep: number, direction: -1 | 1, emptyVal: T): T[] {
  const next = [...arr];
  if (direction === 1) {
    for (let i = maxStep; i > minStep; i--) {
      next[i] = next[i - 1];
    }
    next[minStep] = emptyVal;
  } else {
    for (let i = minStep; i < maxStep; i++) {
      next[i] = next[i + 1];
    }
    next[maxStep] = emptyVal;
  }
  return next;
}

function shiftPatternData(pattern: Pattern, minStep: number, maxStep: number, direction: -1 | 1, isPreRoll: boolean): Pattern {
  if (isPreRoll) {
    const preCount = pattern.preRollActiveSteps?.length || 16;
    const baseActives = pattern.preRollActiveSteps || Array(preCount).fill('0');
    const baseNotes = pattern.preRollNotes || Array(preCount).fill('');
    const baseLyrics = pattern.preRollLyrics || Array(preCount).fill('');
    return {
      ...pattern,
      preRollActiveSteps: shiftArrayRange(baseActives, minStep, maxStep, direction, '0'),
      preRollNotes: shiftArrayRange(baseNotes, minStep, maxStep, direction, ''),
      preRollLyrics: shiftArrayRange(baseLyrics, minStep, maxStep, direction, ''),
      preRollVolumes: pattern.preRollVolumes ? shiftArrayRange(pattern.preRollVolumes, minStep, maxStep, direction, 80) : undefined,
      preRollDecays: pattern.preRollDecays ? shiftArrayRange(pattern.preRollDecays, minStep, maxStep, direction, 100) : undefined,
      preRollMicrotimings: pattern.preRollMicrotimings ? shiftArrayRange(pattern.preRollMicrotimings, minStep, maxStep, direction, 0) : undefined,
    };
  }

  const stepsCount = pattern.steps || 16;
  const baseActives = pattern.activeSteps || Array(stepsCount).fill('0');
  const baseNotes = pattern.notes || Array(stepsCount).fill('');
  const baseLyrics = pattern.lyrics || Array(stepsCount).fill('');

  return {
    ...pattern,
    activeSteps: shiftArrayRange(baseActives, minStep, maxStep, direction, '0'),
    notes: shiftArrayRange(baseNotes, minStep, maxStep, direction, ''),
    lyrics: shiftArrayRange(baseLyrics, minStep, maxStep, direction, ''),
    volumes: pattern.volumes ? shiftArrayRange(pattern.volumes, minStep, maxStep, direction, 80) : undefined,
    decays: pattern.decays ? shiftArrayRange(pattern.decays, minStep, maxStep, direction, 100) : undefined,
    microtimings: pattern.microtimings ? shiftArrayRange(pattern.microtimings, minStep, maxStep, direction, 0) : undefined,
  };
}

export function shiftPatternStepsState(
  state: {
    tracks: TrackGroup[];
    selectedStepIdx: number | null;
    selectedStepIsPreRoll: boolean;
    selectedStepRange: any;
    tracksVersion: number;
  },
  trackId: number,
  patternId: number,
  direction: -1 | 1,
  rangeOverride?: StepShiftRange | null
): { tracks: TrackGroup[]; selectedStepIdx: number | null; tracksVersion: number } {
  const track = state.tracks.find((t) => t.id === trackId);
  const pattern = track?.patterns.find((p) => p.id === patternId);
  if (!pattern) return { tracks: state.tracks, selectedStepIdx: state.selectedStepIdx, tracksVersion: state.tracksVersion };

  let isPreRoll = false;
  let minStep = 0;
  let maxStep = (pattern.steps || 16) - 1;
  let nextSelectedStepIdx = state.selectedStepIdx;

  if (rangeOverride) {
    isPreRoll = Boolean(rangeOverride.isPreRoll);
    const limit = (isPreRoll ? (pattern.preRollActiveSteps?.length || 16) : (pattern.steps || 16)) - 1;
    minStep = Math.max(0, Math.min(rangeOverride.startStep, rangeOverride.endStep));
    maxStep = Math.min(limit, Math.max(rangeOverride.startStep, rangeOverride.endStep));
  } else if (state.selectedStepRange && (state.selectedStepRange.patternId === undefined || state.selectedStepRange.patternId === patternId)) {
    isPreRoll = Boolean(state.selectedStepRange.start?.isPreRoll);
    const limit = (isPreRoll ? (pattern.preRollActiveSteps?.length || 16) : (pattern.steps || 16)) - 1;
    minStep = Math.max(0, Math.min(state.selectedStepRange.start.step, state.selectedStepRange.end.step));
    maxStep = Math.min(limit, Math.max(state.selectedStepRange.start.step, state.selectedStepRange.end.step));
  } else if (state.selectedStepIdx !== null && state.selectedStepIdx !== undefined && state.selectedStepIdx >= 0) {
    isPreRoll = Boolean(state.selectedStepIsPreRoll);
    const limit = (isPreRoll ? (pattern.preRollActiveSteps?.length || 16) : (pattern.steps || 16)) - 1;
    minStep = Math.max(0, Math.min(state.selectedStepIdx, limit));
    maxStep = limit;
    nextSelectedStepIdx = Math.max(0, Math.min(limit, minStep + direction));
  }

  const updatedTracks = syncPatternAcrossLinkedFamily(state.tracks, trackId, patternId, (p) =>
    shiftPatternData(p, minStep, maxStep, direction, isPreRoll)
  );

  return {
    tracks: updatedTracks,
    selectedStepIdx: nextSelectedStepIdx,
    tracksVersion: state.tracksVersion + 1,
  };
}
