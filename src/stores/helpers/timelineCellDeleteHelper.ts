import { TrackGroup } from '../../types';
import { instrumentsConfig } from '../../data';
import { isToadaBus } from './trackVisibilityHelpers';

export const deleteSelectedTimelineCellsState = (
  curr: { tracks: TrackGroup[]; tracksVersion: number; [key: string]: any },
  cells: Array<{ trackId: number; mIdx: number }>
): Record<string, any> => {
  if (cells.length === 0) return {};

  const puxTrack = curr.tracks.find(t => instrumentsConfig[t.instrumentIdx]?.id === 'puxador');
  const coroTrack = curr.tracks.find(t => instrumentsConfig[t.instrumentIdx]?.id === 'coro');

  const updatedTracks = curr.tracks.map(t => {
    const directTrackCells = cells.filter(c => c.trackId === t.id);
    const toadaBusCells = (t.id === puxTrack?.id || t.id === coroTrack?.id)
      ? cells.filter(c => {
          const selTrack = curr.tracks.find(st => st.id === c.trackId);
          return selTrack && isToadaBus(selTrack);
        })
      : [];

    const isCurrentToadaBus = isToadaBus(t);
    const toadaChildCells = isCurrentToadaBus
      ? cells.filter(c => c.trackId === puxTrack?.id || c.trackId === coroTrack?.id)
      : [];

    const measuresToClear = new Set([
      ...directTrackCells.map(c => c.mIdx),
      ...toadaBusCells.map(c => c.mIdx),
      ...toadaChildCells.map(c => c.mIdx)
    ]);

    if (measuresToClear.size === 0) return t;

    const isLinkedSlave = Boolean(t.linkedToTrackId && !t.isLinkFolder && !t.isLinkMaster);
    if (isLinkedSlave) {
      const overrides = { ...(t.patternOverrides || {}) };
      measuresToClear.forEach(m => { overrides[m] = null; });
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
