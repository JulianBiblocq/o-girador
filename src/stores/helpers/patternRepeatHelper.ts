import { TrackGroup, TimeSignature } from '../../types';
import { instrumentsConfig } from '../../data';
import { isToadaBus } from './trackVisibilityHelpers';
import { autoExpandMeasuresState } from './timelineGridAutoExpandHelper';
import { repeatTrackAutomationsForMeasures } from './trackAutomationRepeatHelper';

export const repeatPatternRangeState = (
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
  count: number
): Record<string, any> => {
  const maxTargetIdx = srcIdx + count;
  const expanded = autoExpandMeasuresState(curr, maxTargetIdx + 1);
  const nextTotal = expanded.totalMeasures;
  const nextTracks = expanded.tracks;

  const clickedTrack = nextTracks.find(t => t.id === trackId);
  if (!clickedTrack) return { totalMeasures: nextTotal, tracks: nextTracks };

  const isLinkedSlave = clickedTrack.linkedToTrackId && !clickedTrack.isLinkFolder && !clickedTrack.isLinkMaster;
  const isLinkMaster = clickedTrack.linkedToTrackId && !clickedTrack.isLinkFolder && clickedTrack.isLinkMaster;

  if (isLinkedSlave) {
    const srcOverride = clickedTrack.patternOverrides?.[srcIdx];
    return {
      ...expanded,
      tracks: nextTracks.map(t => {
        if (t.id === trackId) {
          const overrides = { ...(t.patternOverrides || {}) };
          for (let step = 1; step <= count; step++) {
            const targetIdx = srcIdx + step;
            if (srcOverride === undefined) delete overrides[targetIdx];
            else overrides[targetIdx] = srcOverride;
          }
          return { ...t, patternOverrides: overrides };
        }
        return t;
      }),
      tracksVersion: curr.tracksVersion + 1
    };
  }

  let targetTrackId = trackId;
  let sourceOwnerTrack = clickedTrack;
  if (isLinkMaster && clickedTrack.linkedToTrackId) {
    targetTrackId = Number(clickedTrack.linkedToTrackId);
    const owner = nextTracks.find(t => t.id === targetTrackId);
    if (owner) sourceOwnerTrack = owner;
  }

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

  return {
    ...expanded,
    tracks: nextTracks.map(t => {
      if (isToadaTrackId && (t.id === puxTrack?.id || t.id === coroTrack?.id)) {
        const trackActivePat = t.patterns.find(p => p.measureAssignments?.[srcIdx]);
        const trackActivePatId = trackActivePat?.id ?? null;
        const trackAllowVarVal = trackActivePat?.measureAllowVariations?.[srcIdx];

        return {
          ...t,
          patterns: t.patterns.map(p => {
            const assign = [...p.measureAssignments];
            while (assign.length < nextTotal) assign.push(false);
            const nextVariations = p.measureAllowVariations ? [...p.measureAllowVariations] : undefined;
            if (nextVariations && trackAllowVarVal !== undefined && p.id === trackActivePatId) {
              while (nextVariations.length < nextTotal) nextVariations.push(true);
            }
            for (let step = 1; step <= count; step++) {
              const targetIdx = srcIdx + step;
              assign[targetIdx] = Boolean(trackActivePatId !== null && p.id === trackActivePatId);
              if (nextVariations && trackAllowVarVal !== undefined && p.id === trackActivePatId) {
                nextVariations[targetIdx] = trackAllowVarVal;
              }
            }
            return { ...p, measureAssignments: assign, measureAllowVariations: nextVariations };
          })
        };
      }

      if (t.id === targetTrackId) {
        const autoRepeats = repeatTrackAutomationsForMeasures(t, srcIdx, count, nextTotal);
        return {
          ...t,
          ...autoRepeats,
          patterns: t.patterns.map(p => {
            const assign = [...p.measureAssignments];
            while (assign.length < nextTotal) assign.push(false);
            const nextVariations = p.measureAllowVariations ? [...p.measureAllowVariations] : undefined;
            if (nextVariations && allowVarVal !== undefined && p.id === activePatternId) {
              while (nextVariations.length < nextTotal) nextVariations.push(true);
            }
            for (let step = 1; step <= count; step++) {
              const targetIdx = srcIdx + step;
              assign[targetIdx] = p.id === activePatternId;
              if (nextVariations && allowVarVal !== undefined && p.id === activePatternId) {
                nextVariations[targetIdx] = allowVarVal;
              }
            }
            return { ...p, measureAssignments: assign, measureAllowVariations: nextVariations };
          })
        };
      }
      return t;
    }),
    tracksVersion: curr.tracksVersion + 1
  };
};
