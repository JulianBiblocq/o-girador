import { TrackGroup, TimeSignature } from '../../types';
import { instrumentsConfig } from '../../data';
import { isToadaBus } from './trackVisibilityHelpers';
import { autoExpandMeasuresState } from './timelineGridAutoExpandHelper';

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
  const clickedTrack = state.tracks.find(t => t.id === trackId);
  const isLinkedSlave = clickedTrack && clickedTrack.linkedToTrackId && !clickedTrack.isLinkFolder && !clickedTrack.isLinkMaster;
  const isLinkMaster = clickedTrack && clickedTrack.linkedToTrackId && !clickedTrack.isLinkFolder && clickedTrack.isLinkMaster;

  let targetTrackId = trackId;
  let targetTrack = clickedTrack;
  if (isLinkMaster && clickedTrack?.linkedToTrackId) {
    targetTrackId = Number(clickedTrack.linkedToTrackId);
    const master = state.tracks.find(t => t.id === targetTrackId);
    if (master) targetTrack = master;
  } else if (patternId !== null && patternId !== undefined) {
    const ownerTrack = state.tracks.find(t => t.patterns.some(p => p.id === patternId));
    if (ownerTrack) {
      targetTrackId = ownerTrack.id;
      targetTrack = ownerTrack;
    }
  }

  const pattern = targetTrack?.patterns?.find(p => p.id === patternId);
  const stepsPerMeasure = 16;
  const spanMeasures = pattern ? Math.max(1, Math.round((pattern.steps || stepsPerMeasure) / stepsPerMeasure)) : 1;
  const requiredTotal = measureIdx + spanMeasures;

  const expanded = autoExpandMeasuresState(state, requiredTotal);
  const nextTotal = expanded.totalMeasures;
  const nextTracks = expanded.tracks;

  if (isLinkedSlave) {
    return {
      ...expanded,
      tracks: nextTracks.map(t => {
        if (t.id === trackId) {
          const overrides = { ...(t.patternOverrides || {}) };
          for (let offset = 0; offset < spanMeasures; offset++) {
            const m = measureIdx + offset;
            if (patternId === undefined) delete overrides[m];
            else overrides[m] = patternId;
          }
          return { ...t, patternOverrides: overrides };
        }
        return t;
      }),
      tracksVersion: state.tracksVersion + 1
    };
  }

  const isToadaTrackId = isToadaBus(clickedTrack || {});
  const puxTrack = nextTracks.find(t => instrumentsConfig[t.instrumentIdx]?.id === 'puxador');
  const coroTrack = nextTracks.find(t => instrumentsConfig[t.instrumentIdx]?.id === 'coro');

  return {
    ...expanded,
    tracks: nextTracks.map(t => {
      if (isToadaTrackId && patternId === null && (t.id === puxTrack?.id || t.id === coroTrack?.id)) {
        return {
          ...t,
          patterns: t.patterns.map(p => {
            const assign = [...p.measureAssignments];
            while (assign.length < nextTotal) assign.push(false);
            for (let offset = 0; offset < spanMeasures; offset++) {
              assign[measureIdx + offset] = false;
            }
            return { ...p, measureAssignments: assign };
          })
        };
      }

      if (t.id === targetTrackId) {
        return {
          ...t,
          patterns: t.patterns.map(p => {
            const assign = [...p.measureAssignments];
            while (assign.length < nextTotal) assign.push(false);
            for (let offset = 0; offset < spanMeasures; offset++) {
              assign[measureIdx + offset] = p.id === patternId;
            }
            return { ...p, measureAssignments: assign };
          })
        };
      }
      return t;
    }),
    tracksVersion: state.tracksVersion + 1
  };
};
