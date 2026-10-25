import { TrackGroup, TimeSignature, Pattern } from '../../types';
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
  const clickedTrack = state.tracks.find((t) => t.id === trackId);
  const isLinkedSlave = clickedTrack && clickedTrack.linkedToTrackId && !clickedTrack.isLinkFolder && !clickedTrack.isLinkMaster;
  const isLinkMaster = clickedTrack && clickedTrack.linkedToTrackId && !clickedTrack.isLinkFolder && clickedTrack.isLinkMaster;

  let targetTrackId = trackId;
  let targetTrack = clickedTrack;
  if (!isLinkMaster && patternId !== null && patternId !== undefined) {
    const ownerTrack = state.tracks.find((t) => t.patterns?.some((p) => p.id === patternId));
    if (ownerTrack) {
      targetTrackId = ownerTrack.id;
      targetTrack = ownerTrack;
    }
  }

  const pattern = targetTrack?.patterns?.find((p) => p.id === patternId);
  const stepsPerMeasure = 16;
  const spanMeasures = pattern ? Math.max(1, Math.round((pattern.steps || stepsPerMeasure) / stepsPerMeasure)) : 1;
  const requiredTotal = measureIdx + spanMeasures;

  const expanded = autoExpandMeasuresState(state, requiredTotal);
  const nextTotal = expanded.totalMeasures;
  const nextTracks = expanded.tracks;

  if (isLinkedSlave) {
    return {
      ...expanded,
      tracks: nextTracks.map((t) => {
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
      tracksVersion: state.tracksVersion + 1,
    };
  }

  const isToadaTrackId = isToadaBus(clickedTrack || {});
  const puxTrack = nextTracks.find((t) => instrumentsConfig[t.instrumentIdx]?.id === 'puxador');
  const coroTrack = nextTracks.find((t) => instrumentsConfig[t.instrumentIdx]?.id === 'coro');
  const parentBusId = isLinkMaster && clickedTrack?.linkedToTrackId ? String(clickedTrack.linkedToTrackId) : null;

  return {
    ...expanded,
    tracks: nextTracks.map((t) => {
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
          patterns: t.patterns.map((p) => {
            const assign = [...p.measureAssignments];
            while (assign.length < nextTotal) assign.push(false);
            for (let offset = 0; offset < spanMeasures; offset++) {
              assign[measureIdx + offset] = patternId !== null && patternId !== undefined && p.id === patternId;
            }
            return { ...p, measureAssignments: assign };
          }),
        };
      }

      // Synchronisation miroir de sécurité sur le dossier bus parent
      if (parentBusId && String(t.id) === parentBusId && t.isLinkFolder) {
        let busMatchPtn = pattern ? t.patterns.find((bp) => bp.id === pattern.id || bp.name.trim().toLowerCase() === pattern.name.trim().toLowerCase()) : null;
        let busPatterns = [...t.patterns];
        if (pattern && !busMatchPtn) {
          busMatchPtn = { ...pattern, measureAssignments: Array(nextTotal).fill(false) };
          busPatterns.push(busMatchPtn);
        }
        return {
          ...t,
          patterns: busPatterns.map((bp) => {
            const assign = [...bp.measureAssignments];
            while (assign.length < nextTotal) assign.push(false);
            for (let offset = 0; offset < spanMeasures; offset++) {
              assign[measureIdx + offset] = Boolean(busMatchPtn && bp.id === busMatchPtn.id);
            }
            return { ...bp, measureAssignments: assign };
          }),
        };
      }

      return t;
    }),
    tracksVersion: state.tracksVersion + 1,
  };
};
