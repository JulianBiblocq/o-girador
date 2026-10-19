import { TrackGroup } from '../../types';

export const expandGridMeasures = (
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
    [key: string]: any;
  },
  newTotal: number
) => {
  const expand = <T>(arr: T[], fill: T): T[] => {
    const next = [...(arr || [])];
    while (next.length < newTotal) next.push(fill);
    return next;
  };

  return {
    nextTotal: newTotal,
    nextTimeSigs: expand(curr.measureTimeSigs, curr.timeSig),
    nextBpms: expand(curr.measureBpms, curr.bpm),
    nextBpmTransitions: expand(curr.measureBpmTransitions, 'immediate'),
    nextVols: expand(curr.measureVols, 75),
    nextVolTransitions: expand(curr.measureVolTransitions, 'immediate'),
    nextSignals: expand(curr.measureSignals, null),
    nextTracks: curr.tracks.map(t => ({
      ...t,
      measureVols: t.measureVols ? expand(t.measureVols, t.volumeVal ?? 75) : undefined,
      measureVolTransitions: t.measureVolTransitions ? expand(t.measureVolTransitions, 'immediate' as const) : undefined,
      measurePans: t.measurePans ? expand(t.measurePans, t.panVal ?? t.pan ?? 0) : undefined,
      measurePanTransitions: t.measurePanTransitions ? expand(t.measurePanTransitions, 'immediate' as const) : undefined,
      measureReverbSends: t.measureReverbSends ? expand(t.measureReverbSends, t.fxSends?.reverb ?? t.reverbVal ?? 0) : undefined,
      measureReverbTransitions: t.measureReverbTransitions ? expand(t.measureReverbTransitions, 'immediate' as const) : undefined,
      patterns: t.patterns.map(p => ({
        ...p,
        measureAssignments: expand(p.measureAssignments || [], false),
        measureAllowVariations: p.measureAllowVariations ? expand(p.measureAllowVariations, true) : undefined
      }))
    }))
  };
};

export const cloneTracksForTimeline = (tracks: TrackGroup[]): TrackGroup[] => tracks.map(t => ({
  ...t,
  patternOverrides: t.patternOverrides ? { ...t.patternOverrides } : undefined,
  measureVols: t.measureVols ? [...t.measureVols] : undefined,
  measureVolTransitions: t.measureVolTransitions ? [...t.measureVolTransitions] : undefined,
  measurePans: t.measurePans ? [...t.measurePans] : undefined,
  measurePanTransitions: t.measurePanTransitions ? [...t.measurePanTransitions] : undefined,
  measureReverbSends: t.measureReverbSends ? [...t.measureReverbSends] : undefined,
  measureReverbTransitions: t.measureReverbTransitions ? [...t.measureReverbTransitions] : undefined,
  patterns: t.patterns.map(p => ({
    ...p,
    measureAssignments: [...p.measureAssignments],
    measureAllowVariations: p.measureAllowVariations ? [...p.measureAllowVariations] : undefined,
  }))
}));
