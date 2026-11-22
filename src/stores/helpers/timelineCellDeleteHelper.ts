import { TrackGroup } from '../../types';
import { instrumentsConfig } from '../../data';
import { isToadaBus } from './trackVisibilityHelpers';
import { isSlaveTrack, resolveMasterTrack } from '../../utils/trackMasterResolver';
import { syncMasterPatternsToLinkedFamily } from '../../utils/trackLinkingSync';

export const deleteSelectedTimelineCellsState = (
  curr: { tracks: TrackGroup[]; tracksVersion: number; [key: string]: any },
  cells: Array<{ trackId: number; mIdx: number }>
): Record<string, any> => {
  if (cells.length === 0) return {};

  const normalizedCells = cells.map((c) => {
    const tr = curr.tracks.find((t) => t.id === c.trackId);
    if (tr && isSlaveTrack(tr, curr.tracks)) {
      const m = resolveMasterTrack(tr.id, curr.tracks);
      if (m) return { trackId: m.id, mIdx: c.mIdx };
    }
    return c;
  });

  const puxTrack = curr.tracks.find((t) => instrumentsConfig[t.instrumentIdx]?.id === 'puxador');
  const coroTrack = curr.tracks.find((t) => instrumentsConfig[t.instrumentIdx]?.id === 'coro');
  const touchedMasterIds = new Set<number>();

  let updatedTracks = curr.tracks.map((t) => {
    const directTrackCells = normalizedCells.filter((c) => c.trackId === t.id);
    const toadaBusCells =
      t.id === puxTrack?.id || t.id === coroTrack?.id
        ? normalizedCells.filter((c) => {
            const selTrack = curr.tracks.find((st) => st.id === c.trackId);
            return selTrack && isToadaBus(selTrack);
          })
        : [];

    const isCurrentToadaBus = isToadaBus(t);
    const toadaChildCells = isCurrentToadaBus
      ? normalizedCells.filter((c) => c.trackId === puxTrack?.id || c.trackId === coroTrack?.id)
      : [];

    const measuresToClear = new Set([
      ...directTrackCells.map((c) => c.mIdx),
      ...toadaBusCells.map((c) => c.mIdx),
      ...toadaChildCells.map((c) => c.mIdx),
    ]);

    if (measuresToClear.size === 0) return t;

    if (t.isLinkMaster && !t.isBusFolder && !t.isLinkFolder) {
      touchedMasterIds.add(t.id);
    }

    return {
      ...t,
      patternOverrides: undefined,
      patterns: t.patterns.map((p) => {
        const assign = [...p.measureAssignments];
        measuresToClear.forEach((m) => { assign[m] = false; });
        return { ...p, measureAssignments: assign };
      }),
    };
  });

  touchedMasterIds.forEach((mId) => {
    updatedTracks = syncMasterPatternsToLinkedFamily(updatedTracks, mId).tracks;
  });

  return {
    tracks: updatedTracks,
    tracksVersion: curr.tracksVersion + 1,
  };
};
