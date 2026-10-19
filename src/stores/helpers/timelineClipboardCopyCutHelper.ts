import { TrackGroup } from '../../types';
import { instrumentsConfig } from '../../data';
import { isToadaBus } from './trackVisibilityHelpers';
import { TimelineClipboard, TimelineClipboardEntry } from './timelineClipboardTypes';

export const copyTimelineSelectionState = (
  state: {
    selectedTimelineCells: Array<{ trackId: number; mIdx: number }>;
    activeTimelineCell: { trackId: number; measureIdx: number } | null;
    tracks: TrackGroup[];
    [key: string]: any;
  }
): { timelineClipboard: TimelineClipboard; copiedSection: null } | null => {
  const cells = state.selectedTimelineCells.length > 0
    ? state.selectedTimelineCells
    : (state.activeTimelineCell ? [{ trackId: state.activeTimelineCell.trackId, mIdx: state.activeTimelineCell.measureIdx }] : []);

  if (cells.length === 0) return null;

  const mIndices = cells.map(c => c.mIdx);
  const minM = Math.min(...mIndices);
  const maxM = Math.max(...mIndices);
  const spanMeasures = maxM - minM + 1;

  const uniqueTrackIds = Array.from(new Set(cells.map(c => c.trackId)));
  const entries: TimelineClipboardEntry[] = [];

  const puxTrack = state.tracks.find(t => instrumentsConfig[t.instrumentIdx]?.id === 'puxador');
  const coroTrack = state.tracks.find(t => instrumentsConfig[t.instrumentIdx]?.id === 'coro');

  for (const trackId of uniqueTrackIds) {
    const track = state.tracks.find(t => t.id === trackId);
    if (!track) continue;

    const isToadaBusTrack = isToadaBus(track);
    const isLinkedSlave = Boolean(track.linkedToTrackId && !track.isLinkFolder && !track.isLinkMaster);

    for (let m = minM; m <= maxM; m++) {
      const isCellSelected = cells.some(c => c.trackId === trackId && c.mIdx === m);
      if (!isCellSelected) continue;

      const relativeM = m - minM;

      if (isLinkedSlave) {
        const overrideId = track.patternOverrides?.[m] ?? null;
        entries.push({
          trackId,
          relativeM,
          patternId: overrideId,
          overridePatternId: overrideId
        });
        continue;
      }

      if (isToadaBusTrack) {
        const puxPat = puxTrack?.patterns.find(p => p.measureAssignments?.[m]);
        const coroPat = coroTrack?.patterns.find(p => p.measureAssignments?.[m]);
        const activePat = coroPat || puxPat || null;
        entries.push({
          trackId,
          relativeM,
          patternId: activePat ? activePat.id : null
        });
        continue;
      }

      const pat = track.patterns.find(p => p.measureAssignments?.[m]);
      entries.push({
        trackId,
        relativeM,
        patternId: pat ? pat.id : null,
        allowVariations: pat?.measureAllowVariations?.[m]
      });
    }
  }

  return {
    timelineClipboard: { spanMeasures, entries },
    copiedSection: null
  };
};

export const cutTimelineSelectionState = (
  curr: { tracks: TrackGroup[]; tracksVersion: number; [key: string]: any },
  cells: Array<{ trackId: number; mIdx: number }>
): Record<string, any> => {
  const puxTrack = curr.tracks.find(t => instrumentsConfig[t.instrumentIdx]?.id === 'puxador');
  const coroTrack = curr.tracks.find(t => instrumentsConfig[t.instrumentIdx]?.id === 'coro');

  const updatedTracks = curr.tracks.map(t => {
    const directTrackCells = cells.filter(c => c.trackId === t.id);
    const toadaCutCells = (t.id === puxTrack?.id || t.id === coroTrack?.id)
      ? cells.filter(c => {
          const selTrack = curr.tracks.find(st => st.id === c.trackId);
          return selTrack && isToadaBus(selTrack);
        })
      : [];

    const measuresToClear = new Set([
      ...directTrackCells.map(c => c.mIdx),
      ...toadaCutCells.map(c => c.mIdx)
    ]);

    if (measuresToClear.size === 0) return t;

    const isLinkedSlave = Boolean(t.linkedToTrackId && !t.isLinkFolder && !t.isLinkMaster);
    if (isLinkedSlave) {
      const overrides = { ...(t.patternOverrides || {}) };
      measuresToClear.forEach(m => { delete overrides[m]; });
      return { ...t, patternOverrides: overrides };
    }

    return {
      ...t,
      patterns: t.patterns.map(p => {
        const assign = [...p.measureAssignments];
        measuresToClear.forEach(m => { assign[m] = false; });
        return { ...p, measureAssignments: assign };
      })
    };
  });

  return {
    tracks: updatedTracks,
    tracksVersion: curr.tracksVersion + 1
  };
};
