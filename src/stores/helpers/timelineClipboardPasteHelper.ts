import { TrackGroup } from '../../types';
import { instrumentsConfig } from '../../data';
import { syncMasterPatternsToLinkedFamily } from '../../utils/trackLinkingSync';
import { isSlaveTrack, resolveMasterTrack } from '../../utils/trackMasterResolver';
import { isToadaBus } from './trackVisibilityHelpers';
import { cloneTracksForTimeline } from './timelineGridExpandHelper';
import { TimelineClipboard } from './timelineClipboardTypes';
import {
  canPasteTimelineClipboard,
  ensureTimelinePatternOnDestTrack,
  assignPatternAtMeasure,
} from './timelineCrossTrackPatternHelper';

export { canPasteTimelineClipboard };

export const pasteTimelineClipboardState = (
  curr: {
    tracks: TrackGroup[];
    activeTimelineCell: any;
    selectedTimelineCells: any[];
    tracksVersion: number;
    totalMeasures?: number;
    lang?: string;
    [key: string]: any;
  },
  clipboard: TimelineClipboard,
  targetM: number
): Record<string, any> => {
  const uniqueCopiedTracks = Array.from(new Set(clipboard.entries.map((e) => e.trackId)));
  const isSingleTrackClipboard = uniqueCopiedTracks.length === 1;
  const activeTargetId = curr.activeTimelineCell?.trackId ?? curr.selectedTimelineCells?.[0]?.trackId ?? null;

  if (!canPasteTimelineClipboard(curr.tracks, clipboard, activeTargetId)) return {};

  const singleTrackTargetId = isSingleTrackClipboard ? (activeTargetId ?? uniqueCopiedTracks[0]) : null;
  let updatedTracks = cloneTracksForTimeline(curr.tracks);
  const newPuxTrack = updatedTracks.find((t) => instrumentsConfig[t.instrumentIdx]?.id === 'puxador');
  const newCoroTrack = updatedTracks.find((t) => instrumentsConfig[t.instrumentIdx]?.id === 'coro');
  const pastedCellCoords: Array<{ trackId: number; mIdx: number }> = [];
  const clonedMapsByTrack = new Map<number, Map<number, number>>();
  const touchedMasterIds = new Set<number>();
  const totalMeasures = Math.max(curr.totalMeasures || 4, targetM + clipboard.spanMeasures);
  const lang = curr.lang || 'fr';

  const getMap = (tId: number) => {
    if (!clonedMapsByTrack.has(tId)) clonedMapsByTrack.set(tId, new Map());
    return clonedMapsByTrack.get(tId)!;
  };

  for (const entry of clipboard.entries) {
    const destM = targetM + entry.relativeM;
    const targetTrackId = isSingleTrackClipboard && singleTrackTargetId !== null ? singleTrackTargetId : entry.trackId;
    const rawDest = updatedTracks.find((t) => t.id === targetTrackId);
    if (!rawDest) continue;
    const destTrack = isSlaveTrack(rawDest, updatedTracks)
      ? (resolveMasterTrack(rawDest.id, updatedTracks) || rawDest)
      : rawDest;

    pastedCellCoords.push({ trackId: destTrack.id, mIdx: destM });
    const isToada = isToadaBus(destTrack);
    const isVoicePux = Boolean(newPuxTrack && destTrack.id === newPuxTrack.id);
    const isVoiceCoro = Boolean(newCoroTrack && destTrack.id === newCoroTrack.id);

    if (isToada) {
      if (entry.isToadaBusEntry) {
        if (newPuxTrack) {
          const puxId = ensureTimelinePatternOnDestTrack(newPuxTrack, entry.puxPatternId ?? null, entry.puxSourcePattern, updatedTracks, totalMeasures, lang, getMap(newPuxTrack.id));
          assignPatternAtMeasure(newPuxTrack, puxId, destM);
        }
        if (newCoroTrack) {
          const coroId = ensureTimelinePatternOnDestTrack(newCoroTrack, entry.coroPatternId ?? null, entry.coroSourcePattern, updatedTracks, totalMeasures, lang, getMap(newCoroTrack.id));
          assignPatternAtMeasure(newCoroTrack, coroId, destM);
        }
      } else {
        const isCoroSrc = entry.sourceInstId === 'coro' || Boolean(newCoroTrack?.patterns.some((p) => p.id === entry.patternId));
        const voiceTarget = isCoroSrc ? newCoroTrack : newPuxTrack;
        if (voiceTarget) {
          const vId = ensureTimelinePatternOnDestTrack(voiceTarget, entry.patternId, entry.sourcePattern, updatedTracks, totalMeasures, lang, getMap(voiceTarget.id));
          assignPatternAtMeasure(voiceTarget, vId, destM);
        }
      }
      continue;
    }

    if (isVoicePux && newPuxTrack) {
      const srcPtn = entry.isToadaBusEntry ? (entry.puxSourcePattern || entry.sourcePattern) : entry.sourcePattern;
      const rawId = entry.isToadaBusEntry && entry.puxPatternId !== undefined ? entry.puxPatternId : entry.patternId;
      const effId = ensureTimelinePatternOnDestTrack(newPuxTrack, rawId ?? null, srcPtn, updatedTracks, totalMeasures, lang, getMap(newPuxTrack.id));
      assignPatternAtMeasure(newPuxTrack, effId, destM);
      continue;
    }

    if (isVoiceCoro && newCoroTrack) {
      const srcPtn = entry.isToadaBusEntry ? (entry.coroSourcePattern || entry.sourcePattern) : entry.sourcePattern;
      const rawId = entry.isToadaBusEntry && entry.coroPatternId !== undefined ? entry.coroPatternId : entry.patternId;
      const effId = ensureTimelinePatternOnDestTrack(newCoroTrack, rawId ?? null, srcPtn, updatedTracks, totalMeasures, lang, getMap(newCoroTrack.id));
      assignPatternAtMeasure(newCoroTrack, effId, destM);
      continue;
    }

    const effId = ensureTimelinePatternOnDestTrack(destTrack, entry.patternId, entry.sourcePattern, updatedTracks, totalMeasures, lang, getMap(destTrack.id));
    assignPatternAtMeasure(destTrack, effId, destM, entry.allowVariations);
    if (destTrack.isLinkMaster === true && !destTrack.isBusFolder && !destTrack.isLinkFolder) touchedMasterIds.add(destTrack.id);
  }

  touchedMasterIds.forEach((mId) => { updatedTracks = syncMasterPatternsToLinkedFamily(updatedTracks, mId).tracks; });
  const nextActiveCell = pastedCellCoords[0] ? { trackId: pastedCellCoords[0].trackId, measureIdx: pastedCellCoords[0].mIdx } : curr.activeTimelineCell;

  return {
    tracks: updatedTracks,
    selectedTimelineCells: pastedCellCoords,
    selectionAnchorCell: pastedCellCoords[0] || null,
    activeTimelineCell: nextActiveCell,
    tracksVersion: curr.tracksVersion + 1,
  };
};
