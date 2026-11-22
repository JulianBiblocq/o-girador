import { TrackGroup } from '../../types';
import { instrumentsConfig } from '../../data';
import { isToadaBus } from './trackVisibilityHelpers';
import { expandGridMeasures, cloneTracksForTimeline } from './timelineGridExpandHelper';
import { copyAutomations, duplicateVoiceMeasure } from './timelineDuplicateMeasureHelpers';
import { isSlaveTrack, resolveMasterTrack } from '../../utils/trackMasterResolver';
import { syncMasterPatternsToLinkedFamily } from '../../utils/trackLinkingSync';

export const duplicateSelectedCellsState = (
  curr: {
    totalMeasures: number;
    tracks: TrackGroup[];
    measureTimeSigs: any[];
    measureBpms: number[];
    measureBpmTransitions: any[];
    measureVols: number[];
    measureVolTransitions: any[];
    measureSignals: any[];
    timeSig: any;
    bpm: number;
    tracksVersion: number;
    activeTimelineCell: any;
    [key: string]: any;
  },
  cells: Array<{ trackId: number; mIdx: number }>
): Record<string, any> => {
  if (cells.length === 0) return {};

  const mIndices = cells.map(c => c.mIdx);
  const mMin = Math.min(...mIndices);
  const mMax = Math.max(...mIndices);
  const L = mMax - mMin + 1;
  const maxTargetIdx = mMax + L;

  let nextTotal = curr.totalMeasures;
  let nextTracks = [...curr.tracks];
  let nextTimeSigs = [...curr.measureTimeSigs];
  let nextBpms = [...curr.measureBpms];
  let nextBpmTransitions = [...curr.measureBpmTransitions];
  let nextVols = [...curr.measureVols];
  let nextVolTransitions = [...curr.measureVolTransitions];
  let nextSignals = [...curr.measureSignals];

  if (maxTargetIdx >= nextTotal) {
    const exp = expandGridMeasures(curr, maxTargetIdx + 1);
    nextTotal = exp.nextTotal;
    nextTracks = exp.nextTracks;
    nextTimeSigs = exp.nextTimeSigs;
    nextBpms = exp.nextBpms;
    nextBpmTransitions = exp.nextBpmTransitions;
    nextVols = exp.nextVols;
    nextVolTransitions = exp.nextVolTransitions;
    nextSignals = exp.nextSignals;
  }

  const updatedTracks = cloneTracksForTimeline(nextTracks);

  const uniqueTrackIds = Array.from(new Set(cells.map(c => c.trackId)));
  const pux = updatedTracks.find(t => instrumentsConfig[t.instrumentIdx]?.id === 'puxador');
  const coro = updatedTracks.find(t => instrumentsConfig[t.instrumentIdx]?.id === 'coro');

  for (const trackId of uniqueTrackIds) {
    const clk = updatedTracks.find(t => t.id === trackId);
    if (!clk) continue;

    const isToada = isToadaBus(clk);
    const isPux = Boolean(pux && clk.id === pux.id);
    const isCoro = Boolean(coro && clk.id === coro.id);
    const isVoice = isToada || isPux || isCoro;
    const isSlave = isSlaveTrack(clk, updatedTracks);
    const resolvedOwner = isSlave ? (resolveMasterTrack(clk.id, updatedTracks) || clk) : clk;
    const targetTrackId = resolvedOwner.id;
    const srcOwner = resolvedOwner;

    for (let m = mMin; m <= mMax; m++) {
      const targetIdx = m + L;

      if (isVoice) {
        duplicateVoiceMeasure(pux, coro, m, targetIdx, isToada, isPux, nextTotal);
      } else {
        const dest = updatedTracks.find(t => t.id === targetTrackId);
        if (dest) {
          copyAutomations(dest, m, targetIdx);
          const activePat = srcOwner.patterns.find(p => p.measureAssignments?.[m]);
          const activeId = activePat?.id ?? null;
          const allowVar = activePat?.measureAllowVariations?.[m];

          dest.patterns.forEach(p => {
            while (p.measureAssignments.length < nextTotal) p.measureAssignments.push(false);
            p.measureAssignments[targetIdx] = Boolean(activeId !== null && p.id === activeId);
            if (p.measureAllowVariations && allowVar !== undefined && p.id === activeId) {
              while (p.measureAllowVariations.length < nextTotal) p.measureAllowVariations.push(true);
              p.measureAllowVariations[targetIdx] = allowVar;
            }
          });
        }
      }
    }
  }

  let finalTracks = updatedTracks;
  uniqueTrackIds.forEach((tid) => {
    const rawTr = finalTracks.find((t) => t.id === tid);
    const tr = rawTr && isSlaveTrack(rawTr, finalTracks) ? resolveMasterTrack(rawTr.id, finalTracks) : rawTr;
    if (tr?.isLinkMaster && !tr.isBusFolder && !tr.isLinkFolder) {
      finalTracks = syncMasterPatternsToLinkedFamily(finalTracks, tr.id).tracks;
    }
  });

  const nextSelected = cells.map(c => ({ trackId: c.trackId, mIdx: c.mIdx + L }));
  return {
    totalMeasures: nextTotal,
    measureTimeSigs: nextTimeSigs,
    measureBpms: nextBpms,
    measureBpmTransitions: nextBpmTransitions,
    measureVols: nextVols,
    measureVolTransitions: nextVolTransitions,
    measureSignals: nextSignals,
    tracks: finalTracks,
    selectedTimelineCells: nextSelected,
    selectionAnchorCell: nextSelected[0] || null,
    activeTimelineCell: nextSelected[0] ? { trackId: nextSelected[0].trackId, measureIdx: nextSelected[0].mIdx } : curr.activeTimelineCell,
    tracksVersion: curr.tracksVersion + 1
  };
};
