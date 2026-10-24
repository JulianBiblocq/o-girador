
import { TrackGroup } from '../../types';

export type AutomationTargetType = 'bpm' | 'volume' | 'pan' | 'reverb';

export const selectAutomationMeasureState = (
  state: {
    selectedAutomationType: AutomationTargetType | null;
    selectedAutomationTrackId: number | null;
    automationAnchorMeasure: number | null;
    [key: string]: any;
  },
  type: AutomationTargetType,
  measureIdx: number,
  isShift: boolean,
  trackId: number | null = null
): Record<string, any> => {
  const isSameTarget = state.selectedAutomationType === type && state.selectedAutomationTrackId === trackId;
  if (!isShift || !isSameTarget || state.automationAnchorMeasure === null) {
    return {
      selectedAutomationType: type,
      selectedAutomationTrackId: trackId,
      automationAnchorMeasure: measureIdx,
      selectedAutomationRange: { start: measureIdx, end: measureIdx },
    };
  }

  const anchor = state.automationAnchorMeasure;
  return {
    selectedAutomationType: type,
    selectedAutomationTrackId: trackId,
    selectedAutomationRange: { start: Math.min(anchor, measureIdx), end: Math.max(anchor, measureIdx) },
  };
};

export const clearAutomationSelectionState = (): Record<string, any> => ({
  selectedAutomationType: null,
  selectedAutomationTrackId: null,
  selectedAutomationRange: null,
  automationAnchorMeasure: null,
});

function updateTrackArray(
  tracks: TrackGroup[], trackId: number | null, prop: 'measureVols' | 'measurePans' | 'measureReverbSends',
  fallbackProp: 'volumeVal' | 'panVal' | 'reverbVal', defVal: number,
  totalM: number, start: number, end: number, val: number
): TrackGroup[] {
  return tracks.map(t => {
    if (t.id !== trackId) return t;
    const current = (t as any)[prop] ? [...(t as any)[prop]] : Array(totalM).fill((t as any)[fallbackProp] ?? defVal);
    while (current.length < totalM) current.push((t as any)[fallbackProp] ?? defVal);
    for (let i = start; i <= end; i++) current[i] = val;
    return { ...t, [prop]: current };
  });
}

export const setGroupedAutomationValueState = (
  state: {
    totalMeasures: number;
    selectedAutomationRange: { start: number; end: number } | null;
    measureBpms: number[];
    bpm: number;
    measureVols: number[];
    tracks: TrackGroup[];
    tracksVersion: number;
    [key: string]: any;
  },
  type: AutomationTargetType,
  value: number,
  trackId: number | null = null
): Record<string, any> => {
  const totalM = state.totalMeasures || 8;
  const range = state.selectedAutomationRange || { start: 0, end: totalM - 1 };
  const start = Math.max(0, Math.min(range.start, range.end));
  const end = Math.min(totalM - 1, Math.max(range.start, range.end));

  if (type === 'bpm') {
    const nextBpms = [...state.measureBpms];
    while (nextBpms.length < totalM) nextBpms.push(state.bpm || 83);
    for (let i = start; i <= end; i++) nextBpms[i] = value;
    return { measureBpms: nextBpms, bpm: start === 0 ? value : state.bpm, tracksVersion: state.tracksVersion + 1 };
  }

  if (type === 'volume' && (trackId === null || trackId === undefined)) {
    const nextVols = [...state.measureVols];
    while (nextVols.length < totalM) nextVols.push(100);
    for (let i = start; i <= end; i++) nextVols[i] = value;
    return { measureVols: nextVols, tracksVersion: state.tracksVersion + 1 };
  }

  if (type === 'volume') {
    return { tracks: updateTrackArray(state.tracks, trackId, 'measureVols', 'volumeVal', 75, totalM, start, end, value), tracksVersion: state.tracksVersion + 1 };
  }
  if (type === 'pan') {
    return { tracks: updateTrackArray(state.tracks, trackId, 'measurePans', 'panVal', 0, totalM, start, end, value), tracksVersion: state.tracksVersion + 1 };
  }
  if (type === 'reverb') {
    return { tracks: updateTrackArray(state.tracks, trackId, 'measureReverbSends', 'reverbVal', 0, totalM, start, end, value), tracksVersion: state.tracksVersion + 1 };
  }

  return { tracksVersion: state.tracksVersion };
};
