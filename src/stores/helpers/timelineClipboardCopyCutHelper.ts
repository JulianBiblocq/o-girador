import { TrackGroup } from '../../types';
import { instrumentsConfig } from '../../data';
import { resolveTrackInstrumentId } from '../../utils/instrumentCompatibility';
import { resolveMasterTrack } from '../../utils/trackMasterResolver';
import { deleteSelectedTimelineCellsState } from './timelineCellDeleteHelper';
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

  const mIndices = cells.map((c) => c.mIdx);
  const minM = Math.min(...mIndices), maxM = Math.max(...mIndices);
  const spanMeasures = maxM - minM + 1;
  const uniqueTrackIds = Array.from(new Set(cells.map((c) => c.trackId)));
  const entries: TimelineClipboardEntry[] = [];
  const puxTrack = state.tracks.find((t) => instrumentsConfig[t.instrumentIdx]?.id === 'puxador');
  const coroTrack = state.tracks.find((t) => instrumentsConfig[t.instrumentIdx]?.id === 'coro');

  for (const trackId of uniqueTrackIds) {
    const track = state.tracks.find((t) => t.id === trackId);
    if (!track) continue;
    const isToadaBusTrack = isToadaBus(track);
    const isLinkedSlave = Boolean(track.linkedToTrackId && !track.isLinkFolder && !track.isLinkMaster);
    const sourceInstId = resolveTrackInstrumentId(track, state.tracks);

    for (let m = minM; m <= maxM; m++) {
      if (!cells.some((c) => c.trackId === trackId && c.mIdx === m)) continue;
      const relativeM = m - minM;
      if (isLinkedSlave) {
        const master = resolveMasterTrack(track.id, state.tracks);
        const mPat = master?.patterns.find((p) => p.measureAssignments?.[m]) || track.patterns.find((p) => p.measureAssignments?.[m]) || null;
        entries.push({ trackId, relativeM, patternId: mPat ? mPat.id : null, sourceInstId, sourcePattern: mPat ? JSON.parse(JSON.stringify(mPat)) : null });
        continue;
      }
      if (isToadaBusTrack) {
        const puxPat = puxTrack?.patterns.find((p) => p.measureAssignments?.[m]) || null;
        const coroPat = coroTrack?.patterns.find((p) => p.measureAssignments?.[m]) || null;
        const activePat = coroPat || puxPat || null;
        entries.push({
          trackId, relativeM, patternId: activePat ? activePat.id : null, sourceInstId: sourceInstId || 'puxador',
          sourcePattern: activePat ? JSON.parse(JSON.stringify(activePat)) : null, isToadaBusEntry: true,
          puxPatternId: puxPat ? puxPat.id : null, coroPatternId: coroPat ? coroPat.id : null,
          puxSourcePattern: puxPat ? JSON.parse(JSON.stringify(puxPat)) : null,
          coroSourcePattern: coroPat ? JSON.parse(JSON.stringify(coroPat)) : null,
        });
        continue;
      }
      const pat = track.patterns.find((p) => p.measureAssignments?.[m]) || null;
      entries.push({ trackId, relativeM, patternId: pat ? pat.id : null, allowVariations: pat?.measureAllowVariations?.[m], sourceInstId, sourcePattern: pat ? JSON.parse(JSON.stringify(pat)) : null });
    }
  }
  return { timelineClipboard: { spanMeasures, entries }, copiedSection: null };
};

export const cutTimelineSelectionState = (
  curr: { tracks: TrackGroup[]; tracksVersion: number; [key: string]: any },
  cells: Array<{ trackId: number; mIdx: number }>
): Record<string, any> => deleteSelectedTimelineCellsState(curr, cells);
