import { TrackGroup, TimeSignature } from '../../types';

export const autoExpandMeasuresState = (
  curr: {
    totalMeasures: number;
    tracks: TrackGroup[];
    measureTimeSigs: TimeSignature[];
    measureBpms: number[];
    measureBpmTransitions: ('immediate' | 'ramp' | 'bezier')[];
    measureVols: number[];
    measureVolTransitions: ('immediate' | 'ramp' | 'bezier')[];
    measureSignals: (string | null)[];
    bpm?: number;
    timeSig?: TimeSignature;
  },
  requiredTotal: number
): {
  totalMeasures: number;
  tracks: TrackGroup[];
  measureTimeSigs: TimeSignature[];
  measureBpms: number[];
  measureBpmTransitions: ('immediate' | 'ramp' | 'bezier')[];
  measureVols: number[];
  measureVolTransitions: ('immediate' | 'ramp' | 'bezier')[];
  measureSignals: (string | null)[];
} => {
  if (requiredTotal <= curr.totalMeasures) {
    return {
      totalMeasures: curr.totalMeasures,
      tracks: [...curr.tracks],
      measureTimeSigs: [...curr.measureTimeSigs],
      measureBpms: [...curr.measureBpms],
      measureBpmTransitions: [...curr.measureBpmTransitions],
      measureVols: [...curr.measureVols],
      measureVolTransitions: [...curr.measureVolTransitions],
      measureSignals: [...curr.measureSignals]
    };
  }

  const nextTotal = requiredTotal;
  const expandArray = <T>(arr: T[], fillValue: T): T[] => {
    const next = [...(arr || [])];
    while (next.length < nextTotal) next.push(fillValue);
    return next;
  };

  const nextTimeSigs = expandArray(curr.measureTimeSigs, curr.timeSig || '4/4');
  const nextBpms = expandArray(curr.measureBpms, curr.bpm || 100);
  const nextBpmTransitions = expandArray(curr.measureBpmTransitions, 'immediate');
  const nextVols = expandArray(curr.measureVols, 100);
  const nextVolTransitions = expandArray(curr.measureVolTransitions, 'immediate');
  const nextSignals = expandArray(curr.measureSignals, null);

  const nextTracks = curr.tracks.map(t => ({
    ...t,
    measureVols: t.measureVols ? expandArray(t.measureVols, t.volumeVal ?? 75) : undefined,
    measureVolTransitions: t.measureVolTransitions ? expandArray(t.measureVolTransitions, 'immediate' as const) : undefined,
    measurePans: t.measurePans ? expandArray(t.measurePans, t.panVal ?? t.pan ?? 0) : undefined,
    measurePanTransitions: t.measurePanTransitions ? expandArray(t.measurePanTransitions, 'immediate' as const) : undefined,
    measureReverbSends: t.measureReverbSends ? expandArray(t.measureReverbSends, t.fxSends?.reverb ?? t.reverbVal ?? 0) : undefined,
    measureReverbTransitions: t.measureReverbTransitions ? expandArray(t.measureReverbTransitions, 'immediate' as const) : undefined,
    patterns: t.patterns.map(p => ({
      ...p,
      measureAssignments: expandArray(p.measureAssignments || [], false),
      measureAllowVariations: p.measureAllowVariations ? expandArray(p.measureAllowVariations, true) : undefined
    }))
  }));

  return {
    totalMeasures: nextTotal,
    tracks: nextTracks,
    measureTimeSigs: nextTimeSigs,
    measureBpms: nextBpms,
    measureBpmTransitions: nextBpmTransitions,
    measureVols: nextVols,
    measureVolTransitions: nextVolTransitions,
    measureSignals: nextSignals
  };
};
