import { TrackGroup } from '../../types';

export const selectAutomationMeasureState = (
  state: {
    selectedAutomationType: 'bpm' | 'volume' | null;
    selectedAutomationTrackId: number | null;
    automationAnchorMeasure: number | null;
    [key: string]: any;
  },
  type: 'bpm' | 'volume',
  measureIdx: number,
  isShift: boolean,
  trackId: number | null = null
): Record<string, any> => {
  const isSameTarget =
    state.selectedAutomationType === type &&
    state.selectedAutomationTrackId === trackId;

  if (!isShift || !isSameTarget || state.automationAnchorMeasure === null) {
    return {
      selectedAutomationType: type,
      selectedAutomationTrackId: trackId,
      automationAnchorMeasure: measureIdx,
      selectedAutomationRange: { start: measureIdx, end: measureIdx }
    };
  }

  const anchor = state.automationAnchorMeasure;
  return {
    selectedAutomationType: type,
    selectedAutomationTrackId: trackId,
    selectedAutomationRange: {
      start: Math.min(anchor, measureIdx),
      end: Math.max(anchor, measureIdx)
    }
  };
};

export const clearAutomationSelectionState = (): Record<string, any> => ({
  selectedAutomationType: null,
  selectedAutomationTrackId: null,
  selectedAutomationRange: null,
  automationAnchorMeasure: null
});

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
  type: 'bpm' | 'volume',
  value: number,
  trackId: number | null = null
): Record<string, any> => {
  const totalM = state.totalMeasures || 8;
  const range = state.selectedAutomationRange || { start: 0, end: totalM - 1 };
  const start = Math.max(0, Math.min(range.start, range.end));
  const end = Math.min(totalM - 1, Math.max(range.start, range.end));

  if (type === 'bpm') {
    const nextBpms = [...state.measureBpms];
    while (nextBpms.length < totalM) {
      nextBpms.push(state.bpm || 83);
    }
    for (let i = start; i <= end; i++) {
      nextBpms[i] = value;
    }
    const updates: Record<string, any> = {
      measureBpms: nextBpms,
      tracksVersion: state.tracksVersion + 1
    };
    if (start === 0) {
      updates.bpm = value;
    }
    return updates;
  }

  // type === 'volume'
  if (trackId === null || trackId === undefined) {
    // Master Volume
    const nextVols = [...state.measureVols];
    while (nextVols.length < totalM) {
      nextVols.push(100);
    }
    for (let i = start; i <= end; i++) {
      nextVols[i] = value;
    }
    return {
      measureVols: nextVols,
      tracksVersion: state.tracksVersion + 1
    };
  }

  // Track-specific Volume
  return {
    tracks: state.tracks.map((t) => {
      if (t.id === trackId) {
        const currentVols = t.measureVols ? [...t.measureVols] : Array(totalM).fill(t.volumeVal ?? 75);
        while (currentVols.length < totalM) {
          currentVols.push(t.volumeVal ?? 75);
        }
        for (let i = start; i <= end; i++) {
          currentVols[i] = value;
        }
        return { ...t, measureVols: currentVols };
      }
      return t;
    }),
    tracksVersion: state.tracksVersion + 1
  };
};
