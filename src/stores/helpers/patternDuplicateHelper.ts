import { TrackGroup, TimeSignature } from '../../types';
import { instrumentsConfig } from '../../data';
import { isToadaBus } from './trackVisibilityHelpers';
import { cloneTrackAutomationsForMeasure } from './trackAutomationCloneHelper';
import { autoExpandMeasuresState } from './timelineGridAutoExpandHelper';
import { isSlaveTrack, resolveMasterTrack } from '../../utils/trackMasterResolver';
import { syncMasterPatternsToLinkedFamily } from '../../utils/trackLinkingSync';

export const duplicateMeasurePatternState = (
  curr: {
    tracks: TrackGroup[];
    totalMeasures: number;
    measureTimeSigs: TimeSignature[];
    measureBpms: number[];
    measureBpmTransitions: ('immediate' | 'ramp' | 'bezier')[];
    measureVols: number[];
    measureVolTransitions: ('immediate' | 'ramp' | 'bezier')[];
    measureSignals: (string | null)[];
    bpm: number;
    timeSig: TimeSignature;
    tracksVersion: number;
  },
  trackId: number,
  srcIdx: number,
  targetIdx: number
): Record<string, any> => {
  const expanded = autoExpandMeasuresState(curr, targetIdx + 1);
  const nextTotal = expanded.totalMeasures;
  const nextTracks = expanded.tracks;

  const rawClicked = nextTracks.find(t => t.id === trackId);
  if (!rawClicked) return { totalMeasures: nextTotal, tracks: nextTracks };

  const clickedTrack = isSlaveTrack(rawClicked, nextTracks)
    ? (resolveMasterTrack(rawClicked.id, nextTracks) || rawClicked)
    : rawClicked;
  const isLinkMaster = Boolean(!clickedTrack.isBusFolder && !clickedTrack.isLinkFolder && clickedTrack.isLinkMaster);

  let targetTrackId = clickedTrack.id;
  let sourceOwnerTrack = clickedTrack;
  const parentBusId = isLinkMaster && clickedTrack.linkedToTrackId ? String(clickedTrack.linkedToTrackId) : null;

  const isToadaTrackId = isToadaBus(clickedTrack);
  const puxTrack = nextTracks.find(t => instrumentsConfig[t.instrumentIdx]?.id === 'puxador');
  const coroTrack = nextTracks.find(t => instrumentsConfig[t.instrumentIdx]?.id === 'coro');

  let activePatternId: number | null = null;
  let allowVarVal: boolean | undefined = undefined;
  const activePat = sourceOwnerTrack.patterns.find(p => p.measureAssignments?.[srcIdx]);
  if (activePat) {
    activePatternId = activePat.id;
    allowVarVal = activePat.measureAllowVariations?.[srcIdx];
  }

  const mappedTracks = nextTracks.map(t => {
      if (isToadaTrackId && (t.id === puxTrack?.id || t.id === coroTrack?.id)) {
        const trackActivePat = t.patterns.find(p => p.measureAssignments?.[srcIdx]);
        const trackActivePatId = trackActivePat?.id ?? null;
        const trackAllowVarVal = trackActivePat?.measureAllowVariations?.[srcIdx];

        return {
          ...t,
          patterns: t.patterns.map(p => {
            const assign = [...p.measureAssignments];
            while (assign.length < nextTotal) assign.push(false);
            assign[targetIdx] = Boolean(trackActivePatId !== null && p.id === trackActivePatId);
            const nextVariations = p.measureAllowVariations ? [...p.measureAllowVariations] : undefined;
            if (nextVariations && trackAllowVarVal !== undefined && p.id === trackActivePatId) {
              while (nextVariations.length < nextTotal) nextVariations.push(true);
              nextVariations[targetIdx] = trackAllowVarVal;
            }
            return { ...p, measureAssignments: assign, measureAllowVariations: nextVariations };
          })
        };
      }

      if (t.id === targetTrackId) {
        const autoClones = cloneTrackAutomationsForMeasure(t, srcIdx, targetIdx, nextTotal);
        return {
          ...t,
          ...autoClones,
          patterns: t.patterns.map(p => {
            const assign = [...p.measureAssignments];
            while (assign.length < nextTotal) assign.push(false);
            assign[targetIdx] = p.id === activePatternId;
            const nextVariations = p.measureAllowVariations ? [...p.measureAllowVariations] : undefined;
            if (nextVariations && allowVarVal !== undefined && p.id === activePatternId) {
              while (nextVariations.length < nextTotal) nextVariations.push(true);
              nextVariations[targetIdx] = allowVarVal;
            }
            return { ...p, measureAssignments: assign, measureAllowVariations: nextVariations };
          })
        };
      }
      if (parentBusId && String(t.id) === parentBusId && t.isLinkFolder) {
        const busMatchPtn = activePat ? t.patterns.find((bp) => bp.id === activePat.id || bp.name.trim().toLowerCase() === activePat.name.trim().toLowerCase()) : null;
        return {
          ...t,
          patterns: t.patterns.map((bp) => {
            const assign = [...bp.measureAssignments];
            while (assign.length < nextTotal) assign.push(false);
            assign[targetIdx] = Boolean(busMatchPtn && bp.id === busMatchPtn.id);
            return { ...bp, measureAssignments: assign };
          }),
        };
      }
      return t;
    });
  return {
    ...expanded,
    tracks: isLinkMaster ? syncMasterPatternsToLinkedFamily(mappedTracks, targetTrackId).tracks : mappedTracks,
    tracksVersion: curr.tracksVersion + 1
  };
};
