import { TrackGroup } from '../../types';
import { getVisibleTimelineTrackIds } from './trackVisibilityHelpers';

export const selectTimelineCellState = (
  state: {
    selectedTimelineCells: Array<{ trackId: number; mIdx: number }>;
    selectionAnchorCell: { trackId: number; mIdx: number } | null;
    tracks: TrackGroup[];
    [key: string]: any;
  },
  trackId: number,
  mIdx: number,
  mode: 'single' | 'toggle' | 'range'
): Record<string, any> => {
  if (mode === 'single') {
    return {
      selectedTimelineCells: [{ trackId, mIdx }],
      selectionAnchorCell: { trackId, mIdx },
      activeTimelineCell: { trackId, measureIdx: mIdx }
    };
  }

  if (mode === 'toggle') {
    const exists = state.selectedTimelineCells.some(c => c.trackId === trackId && c.mIdx === mIdx);
    const next = exists
      ? state.selectedTimelineCells.filter(c => !(c.trackId === trackId && c.mIdx === mIdx))
      : [...state.selectedTimelineCells, { trackId, mIdx }];
    return {
      selectedTimelineCells: next,
      selectionAnchorCell: { trackId, mIdx },
      activeTimelineCell: { trackId, measureIdx: mIdx }
    };
  }

  if (mode === 'range') {
    const anchor = state.selectionAnchorCell || { trackId, mIdx };
    const startM = Math.min(anchor.mIdx, mIdx);
    const endM = Math.max(anchor.mIdx, mIdx);

    const tracks = state.tracks;
    const anchorTrackIdx = tracks.findIndex(t => t.id === anchor.trackId);
    const currentTrackIdx = tracks.findIndex(t => t.id === trackId);

    const rangeCells: Array<{ trackId: number; mIdx: number }> = [];
    if (anchorTrackIdx !== -1 && currentTrackIdx !== -1) {
      const minT = Math.min(anchorTrackIdx, currentTrackIdx);
      const maxT = Math.max(anchorTrackIdx, currentTrackIdx);
      for (let t = minT; t <= maxT; t++) {
        const trkId = tracks[t].id;
        for (let m = startM; m <= endM; m++) {
          rangeCells.push({ trackId: trkId, mIdx: m });
        }
      }
    } else {
      for (let m = startM; m <= endM; m++) {
        rangeCells.push({ trackId, mIdx: m });
      }
    }

    return {
      selectedTimelineCells: rangeCells,
      activeTimelineCell: { trackId, measureIdx: mIdx }
    };
  }

  return state;
};

export const selectAllTimelineCellsState = (
  state: {
    totalMeasures: number;
    tracks: TrackGroup[];
    [key: string]: any;
  }
): Record<string, any> => {
  const totalMeasures = state.totalMeasures;
  if (totalMeasures <= 0) return {};

  const visibleTrackIds = getVisibleTimelineTrackIds(state);
  const allCells: Array<{ trackId: number; mIdx: number }> = [];

  for (const trackId of visibleTrackIds) {
    for (let m = 0; m < totalMeasures; m++) {
      allCells.push({ trackId, mIdx: m });
    }
  }

  return {
    selectedTimelineCells: allCells,
    selectionAnchorCell: allCells[0] || null,
    activeTimelineCell: allCells[0] ? { trackId: allCells[0].trackId, measureIdx: allCells[0].mIdx } : null,
  };
};

export const selectTrackTimelineCellsState = (
  curr: {
    totalMeasures: number;
    selectedTimelineCells: Array<{ trackId: number; mIdx: number }>;
    [key: string]: any;
  },
  trackId: number,
  additive = false
): Record<string, any> => {
  const totalMeasures = curr.totalMeasures;
  if (totalMeasures <= 0) return {};

  const trackCells: Array<{ trackId: number; mIdx: number }> = [];
  for (let m = 0; m < totalMeasures; m++) {
    trackCells.push({ trackId, mIdx: m });
  }

  if (additive) {
    const isTrackFullySelected = trackCells.every(tc =>
      curr.selectedTimelineCells.some(c => c.trackId === tc.trackId && c.mIdx === tc.mIdx)
    );
    const filtered = curr.selectedTimelineCells.filter(c => c.trackId !== trackId);
    const next = isTrackFullySelected ? filtered : [...filtered, ...trackCells];
    return {
      selectedTimelineCells: next,
      selectionAnchorCell: { trackId, mIdx: 0 },
      activeTimelineCell: { trackId, measureIdx: 0 },
    };
  }

  return {
    selectedTimelineCells: trackCells,
    selectionAnchorCell: { trackId, mIdx: 0 },
    activeTimelineCell: { trackId, measureIdx: 0 },
  };
};
