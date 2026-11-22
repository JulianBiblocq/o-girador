import { TrackGroup, TimeSignature } from '../../types';
import { instrumentsConfig } from '../../data';
import { isToadaBus } from './trackVisibilityHelpers';
import { autoExpandMeasuresState } from './timelineGridAutoExpandHelper';
import { repeatTrackAutomationsForMeasures } from './trackAutomationRepeatHelper';
import { isSlaveTrack, resolveMasterTrack } from '../../utils/trackMasterResolver';
import { syncMasterPatternsToLinkedFamily } from '../../utils/trackLinkingSync';

export const repeatPatternRangeState = (
  curr: {
    tracks: TrackGroup[]; totalMeasures: number; measureTimeSigs: TimeSignature[]; measureBpms: number[];
    measureBpmTransitions: ('immediate' | 'ramp' | 'bezier')[]; measureVols: number[];
    measureVolTransitions: ('immediate' | 'ramp' | 'bezier')[]; measureSignals: (string | null)[];
    bpm: number; timeSig: TimeSignature; tracksVersion: number;
  },
  trackId: number,
  srcIdx: number,
  count: number
): Record<string, any> => {
  const maxTargetIdx = srcIdx + count;
  const expanded = autoExpandMeasuresState(curr, maxTargetIdx + 1);
  const nextTotal = expanded.totalMeasures;
  const nextTracks = expanded.tracks;

  const rawClicked = nextTracks.find((t) => t.id === trackId);
  if (!rawClicked) return { totalMeasures: nextTotal, tracks: nextTracks };

  const clickedTrack = isSlaveTrack(rawClicked, nextTracks)
    ? (resolveMasterTrack(rawClicked.id, nextTracks) || rawClicked)
    : rawClicked;
  const effTrackId = clickedTrack.id;
  const isLinkMaster = Boolean(!clickedTrack.isBusFolder && !clickedTrack.isLinkFolder && clickedTrack.isLinkMaster);

  const parentBusId = isLinkMaster && clickedTrack.linkedToTrackId ? String(clickedTrack.linkedToTrackId) : null;
  const isToadaTrackId = isToadaBus(clickedTrack);
  const puxTrack = nextTracks.find((t) => instrumentsConfig[t.instrumentIdx]?.id === 'puxador');
  const coroTrack = nextTracks.find((t) => instrumentsConfig[t.instrumentIdx]?.id === 'coro');
  const activePat = clickedTrack.patterns.find((p) => p.measureAssignments?.[srcIdx]);
  const activePatternId = activePat?.id ?? null;
  const allowVarVal = activePat?.measureAllowVariations?.[srcIdx];

  const mappedTracks = nextTracks.map((t) => {
    if (isToadaTrackId && (t.id === puxTrack?.id || t.id === coroTrack?.id)) {
      const tPat = t.patterns.find((p) => p.measureAssignments?.[srcIdx]);
      const tPatId = tPat?.id ?? null, tAllowVar = tPat?.measureAllowVariations?.[srcIdx];
      return {
        ...t,
        patterns: t.patterns.map((p) => {
          const assign = [...p.measureAssignments];
          while (assign.length < nextTotal) assign.push(false);
          const nextVars = p.measureAllowVariations ? [...p.measureAllowVariations] : undefined;
          if (nextVars && tAllowVar !== undefined && p.id === tPatId) {
            while (nextVars.length < nextTotal) nextVars.push(true);
          }
          for (let step = 1; step <= count; step++) {
            assign[srcIdx + step] = Boolean(tPatId !== null && p.id === tPatId);
            if (nextVars && tAllowVar !== undefined && p.id === tPatId) nextVars[srcIdx + step] = tAllowVar;
          }
          return { ...p, measureAssignments: assign, measureAllowVariations: nextVars };
        }),
      };
    }

    if (t.id === effTrackId) {
      const autoRepeats = repeatTrackAutomationsForMeasures(t, srcIdx, count, nextTotal);
      return {
        ...t,
        ...autoRepeats,
        patterns: t.patterns.map((p) => {
          const assign = [...p.measureAssignments];
          while (assign.length < nextTotal) assign.push(false);
          const nextVars = p.measureAllowVariations ? [...p.measureAllowVariations] : undefined;
          if (nextVars && allowVarVal !== undefined && p.id === activePatternId) {
            while (nextVars.length < nextTotal) nextVars.push(true);
          }
          for (let step = 1; step <= count; step++) {
            assign[srcIdx + step] = p.id === activePatternId;
            if (nextVars && allowVarVal !== undefined && p.id === activePatternId) nextVars[srcIdx + step] = allowVarVal;
          }
          return { ...p, measureAssignments: assign, measureAllowVariations: nextVars };
        }),
      };
    }

    if (parentBusId && String(t.id) === parentBusId && t.isLinkFolder) {
      const busMatchPtn = activePat
        ? t.patterns.find((bp) => bp.id === activePat.id || bp.name.trim().toLowerCase() === activePat.name.trim().toLowerCase())
        : null;
      return {
        ...t,
        patterns: t.patterns.map((bp) => {
          const assign = [...bp.measureAssignments];
          while (assign.length < nextTotal) assign.push(false);
          for (let step = 1; step <= count; step++) assign[srcIdx + step] = Boolean(busMatchPtn && bp.id === busMatchPtn.id);
          return { ...bp, measureAssignments: assign };
        }),
      };
    }
    return t;
  });

  return {
    ...expanded,
    tracks: isLinkMaster ? syncMasterPatternsToLinkedFamily(mappedTracks, effTrackId).tracks : mappedTracks,
    tracksVersion: curr.tracksVersion + 1,
  };
};
