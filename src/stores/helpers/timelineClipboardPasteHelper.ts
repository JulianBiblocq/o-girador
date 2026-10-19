import { TrackGroup } from '../../types';
import { instrumentsConfig } from '../../data';
import { isToadaBus } from './trackVisibilityHelpers';
import { cloneTracksForTimeline } from './timelineGridExpandHelper';
import { TimelineClipboard } from './timelineClipboardTypes';

export const pasteTimelineClipboardState = (
  curr: {
    tracks: TrackGroup[];
    activeTimelineCell: any;
    selectedTimelineCells: any[];
    tracksVersion: number;
    [key: string]: any;
  },
  clipboard: TimelineClipboard,
  targetM: number
): Record<string, any> => {
  const uniqueCopiedTracks = Array.from(new Set(clipboard.entries.map(e => e.trackId)));
  const isSingleTrackClipboard = uniqueCopiedTracks.length === 1;

  let singleTrackTargetId: number | null = null;
  if (isSingleTrackClipboard && curr.activeTimelineCell) {
    const sourceTrackId = uniqueCopiedTracks[0];
    const sourceTrack = curr.tracks.find(t => t.id === sourceTrackId);
    const activeTrack = curr.tracks.find(t => t.id === curr.activeTimelineCell.trackId);

    const isSameInstrument = Boolean(
      sourceTrack && activeTrack && (
        sourceTrack.instrumentIdx === activeTrack.instrumentIdx ||
        instrumentsConfig[sourceTrack.instrumentIdx]?.id === instrumentsConfig[activeTrack.instrumentIdx]?.id
      )
    );
    singleTrackTargetId = isSameInstrument && activeTrack ? activeTrack.id : sourceTrackId;
  }

  const updatedTracks = cloneTracksForTimeline(curr.tracks);
  const newPuxTrack = updatedTracks.find(t => instrumentsConfig[t.instrumentIdx]?.id === 'puxador');
  const newCoroTrack = updatedTracks.find(t => instrumentsConfig[t.instrumentIdx]?.id === 'coro');
  const pastedCellCoords: Array<{ trackId: number; mIdx: number }> = [];

  for (const entry of clipboard.entries) {
    const destM = targetM + entry.relativeM;
    const targetTrackId = isSingleTrackClipboard && singleTrackTargetId !== null
      ? singleTrackTargetId
      : entry.trackId;

    const destTrack = updatedTracks.find(t => t.id === targetTrackId);
    if (!destTrack) continue;

    pastedCellCoords.push({ trackId: targetTrackId, mIdx: destM });

    const isToada = isToadaBus(destTrack);
    const isVoicePux = Boolean(newPuxTrack && destTrack.id === newPuxTrack.id);
    const isVoiceCoro = Boolean(newCoroTrack && destTrack.id === newCoroTrack.id);
    const isVoice = isToada || isVoicePux || isVoiceCoro;
    const isSlave = Boolean(destTrack.linkedToTrackId && !destTrack.isLinkFolder && !destTrack.isLinkMaster);

    if (isSlave) {
      const overrides = { ...(destTrack.patternOverrides || {}) };
      if (entry.overridePatternId === null || entry.overridePatternId === undefined) {
        delete overrides[destM];
      } else {
        overrides[destM] = entry.overridePatternId;
      }
      destTrack.patternOverrides = overrides;
      continue;
    }

    if (isVoice) {
      if (isToada) {
        const isPuxPtn = newPuxTrack?.patterns.some(p => p.id === entry.patternId);
        const isCoroPtn = newCoroTrack?.patterns.some(p => p.id === entry.patternId);
        if (newPuxTrack) {
          newPuxTrack.patterns.forEach(p => {
            while (p.measureAssignments.length <= destM) p.measureAssignments.push(false);
            p.measureAssignments[destM] = Boolean(isPuxPtn && p.id === entry.patternId);
          });
        }
        if (newCoroTrack) {
          newCoroTrack.patterns.forEach(p => {
            while (p.measureAssignments.length <= destM) p.measureAssignments.push(false);
            p.measureAssignments[destM] = Boolean(isCoroPtn && p.id === entry.patternId);
          });
        }
      } else if (isVoicePux && newPuxTrack) {
        newPuxTrack.patterns.forEach(p => {
          while (p.measureAssignments.length <= destM) p.measureAssignments.push(false);
          p.measureAssignments[destM] = Boolean(entry.patternId !== null && p.id === entry.patternId);
        });
      } else if (isVoiceCoro && newCoroTrack) {
        newCoroTrack.patterns.forEach(p => {
          while (p.measureAssignments.length <= destM) p.measureAssignments.push(false);
          p.measureAssignments[destM] = Boolean(entry.patternId !== null && p.id === entry.patternId);
        });
      }
    } else {
      destTrack.patterns.forEach(p => {
        while (p.measureAssignments.length <= destM) p.measureAssignments.push(false);
        p.measureAssignments[destM] = Boolean(entry.patternId !== null && p.id === entry.patternId);
        const nextVariations = p.measureAllowVariations ? [...p.measureAllowVariations] : undefined;
        if (nextVariations && entry.allowVariations !== undefined && p.id === entry.patternId) {
          while (nextVariations.length <= destM) nextVariations.push(true);
          nextVariations[destM] = entry.allowVariations;
        }
        p.measureAllowVariations = nextVariations;
      });
    }
  }

  const nextActiveCell = pastedCellCoords[0]
    ? { trackId: pastedCellCoords[0].trackId, measureIdx: pastedCellCoords[0].mIdx }
    : curr.activeTimelineCell;

  return {
    tracks: updatedTracks,
    selectedTimelineCells: pastedCellCoords,
    selectionAnchorCell: pastedCellCoords[0] || null,
    activeTimelineCell: nextActiveCell,
    tracksVersion: curr.tracksVersion + 1
  };
};
