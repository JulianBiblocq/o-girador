import { TrackGroup } from '../../types';
import { instrumentsConfig } from '../../data';
import { isToadaBus } from './trackVisibilityHelpers';
import { expandGridMeasures, cloneTracksForTimeline } from './timelineGridExpandHelper';

const copyAutomations = (t: TrackGroup, src: number, dest: number): void => {
  if (t.measureVols) t.measureVols[dest] = t.measureVols[src] ?? (t.volumeVal ?? 75);
  if (t.measureVolTransitions) t.measureVolTransitions[dest] = t.measureVolTransitions[src] || 'immediate';
  if (t.measurePans) t.measurePans[dest] = t.measurePans[src] ?? (t.panVal ?? t.pan ?? 0);
  if (t.measurePanTransitions) t.measurePanTransitions[dest] = t.measurePanTransitions[src] || 'immediate';
  if (t.measureReverbSends) t.measureReverbSends[dest] = t.measureReverbSends[src] ?? (t.fxSends?.reverb ?? t.reverbVal ?? 0);
  if (t.measureReverbTransitions) t.measureReverbTransitions[dest] = t.measureReverbTransitions[src] || 'immediate';
};

const duplicateVoiceMeasure = (pux: TrackGroup | undefined, coro: TrackGroup | undefined, m: number, target: number, isToada: boolean, isPux: boolean, total: number) => {
  const syncTrack = (tr: TrackGroup | undefined) => {
    if (!tr) return;
    const pat = tr.patterns.find(p => p.measureAssignments?.[m]);
    tr.patterns.forEach(p => {
      while (p.measureAssignments.length < total) p.measureAssignments.push(false);
      p.measureAssignments[target] = Boolean(pat && p.id === pat.id);
    });
  };
  if (isToada) { syncTrack(pux); syncTrack(coro); }
  else if (isPux) syncTrack(pux);
  else syncTrack(coro);
};

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
    const isSlave = Boolean(clk.linkedToTrackId && !clk.isLinkFolder && !clk.isLinkMaster);
    const isMaster = Boolean(clk.linkedToTrackId && !clk.isLinkFolder && clk.isLinkMaster);

    const targetTrackId = (isMaster && clk.linkedToTrackId) ? Number(clk.linkedToTrackId) : trackId;
    const srcOwner = (isMaster && clk.linkedToTrackId) ? (updatedTracks.find(t => t.id === targetTrackId) || clk) : clk;

    for (let m = mMin; m <= mMax; m++) {
      const targetIdx = m + L;
      if (isSlave) {
        const srcOver = clk.patternOverrides?.[m];
        const overs = { ...(clk.patternOverrides || {}) };
        if (srcOver === undefined) delete overs[targetIdx];
        else overs[targetIdx] = srcOver;
        clk.patternOverrides = overs;
        continue;
      }

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

  const nextSelected = cells.map(c => ({ trackId: c.trackId, mIdx: c.mIdx + L }));
  return {
    totalMeasures: nextTotal,
    measureTimeSigs: nextTimeSigs,
    measureBpms: nextBpms,
    measureBpmTransitions: nextBpmTransitions,
    measureVols: nextVols,
    measureVolTransitions: nextVolTransitions,
    measureSignals: nextSignals,
    tracks: updatedTracks,
    selectedTimelineCells: nextSelected,
    selectionAnchorCell: nextSelected[0] || null,
    activeTimelineCell: nextSelected[0] ? { trackId: nextSelected[0].trackId, measureIdx: nextSelected[0].mIdx } : curr.activeTimelineCell,
    tracksVersion: curr.tracksVersion + 1
  };
};
