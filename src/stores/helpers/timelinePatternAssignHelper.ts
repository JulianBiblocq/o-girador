import { TrackGroup, TimeSignature } from '../../types';
import { instrumentsConfig } from '../../data';
import { isToadaBus } from './trackVisibilityHelpers';
import { autoExpandMeasuresState } from './timelineGridAutoExpandHelper';
import { syncMasterPatternsToLinkedFamily } from '../../utils/trackLinkingSync';
import { isSlaveTrack, resolveMasterTrack } from '../../utils/trackMasterResolver';

export const handleTimelinePatternAssignState = (
  state: {
    tracks: TrackGroup[];
    totalMeasures: number;
    measureTimeSigs: TimeSignature[];
    measureBpms: number[];
    measureBpmTransitions: ('immediate' | 'ramp' | 'bezier')[];
    measureVols: number[];
    measureVolTransitions: ('immediate' | 'ramp' | 'bezier')[];
    measureSignals: (string | null)[];
    bpm?: number;
    timeSig?: TimeSignature;
    tracksVersion: number;
  },
  trackId: number,
  patternId: number | null | undefined,
  measureIdx: number
): Record<string, any> => {
  const rawClicked = state.tracks.find((t) => t.id === trackId);
  const clickedTrack = rawClicked && isSlaveTrack(rawClicked, state.tracks)
    ? (resolveMasterTrack(rawClicked.id, state.tracks) || rawClicked)
    : rawClicked;
  const effectiveId = clickedTrack?.id ?? trackId;
  const isLinkMaster = Boolean(clickedTrack && !clickedTrack.isBusFolder && !clickedTrack.isLinkFolder && clickedTrack.isLinkMaster);

  let targetTrackId = effectiveId;
  let targetTrack = clickedTrack;
  if (clickedTrack?.patterns?.some((p) => String(p.id) === String(patternId))) {
    targetTrackId = clickedTrack.id;
    targetTrack = clickedTrack;
  } else if (!isLinkMaster && patternId !== null && patternId !== undefined) {
    const ownerTrack = state.tracks.find((t) => t.patterns?.some((p) => String(p.id) === String(patternId)));
    if (ownerTrack) {
      targetTrackId = ownerTrack.id;
      targetTrack = ownerTrack;
    }
  }

  const pattern = targetTrack?.patterns?.find((p) => String(p.id) === String(patternId));
  const stepsPerMeasure = 16;
  const spanMeasures = pattern ? Math.max(1, Math.round((pattern.steps || stepsPerMeasure) / stepsPerMeasure)) : 1;
  const requiredTotal = measureIdx + spanMeasures;

  const expanded = autoExpandMeasuresState(state, requiredTotal);
  const nextTotal = expanded.totalMeasures;
  const nextTracks = expanded.tracks;

  const isToadaTrackId = isToadaBus(clickedTrack || {});
  const puxTrack = nextTracks.find((t) => instrumentsConfig[t.instrumentIdx]?.id === 'puxador');
  const coroTrack = nextTracks.find((t) => instrumentsConfig[t.instrumentIdx]?.id === 'coro');
  const parentBusId = isLinkMaster && clickedTrack?.linkedToTrackId ? String(clickedTrack.linkedToTrackId) : null;

  const updatedTracks = nextTracks.map((t) => {
    if (isToadaTrackId && patternId === null && (t.id === puxTrack?.id || t.id === coroTrack?.id)) {
      return {
        ...t,
        patterns: t.patterns.map((p) => {
          const assign = [...p.measureAssignments];
          while (assign.length < nextTotal) assign.push(false);
          for (let offset = 0; offset < spanMeasures; offset++) assign[measureIdx + offset] = false;
          return { ...p, measureAssignments: assign };
        }),
      };
    }

    if (t.id === targetTrackId) {
      return {
        ...t,
        patternOverrides: undefined,
        patterns: t.patterns.map((p) => {
          const assign = [...p.measureAssignments];
          while (assign.length < nextTotal) assign.push(false);
          for (let offset = 0; offset < spanMeasures; offset++) {
            assign[measureIdx + offset] = patternId !== null && patternId !== undefined && String(p.id) === String(patternId);
          }
          return { ...p, measureAssignments: assign };
        }),
      };
    }

    return t;
  });

  const finalTracks = (isLinkMaster || parentBusId)
    ? syncMasterPatternsToLinkedFamily(updatedTracks, targetTrackId).tracks
    : updatedTracks;

  return {
    ...expanded,
    tracks: finalTracks,
    tracksVersion: state.tracksVersion + 1,
  };
};
