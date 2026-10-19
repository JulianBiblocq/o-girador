import { SongSection, SongMarker, TrackGroup } from '../../types';

export const stretchInsertModeState = (
  state: {
    songSections: SongSection[];
    songMarkers?: SongMarker[];
    totalMeasures: number;
    measureTimeSigs: any[];
    measureBpms: number[];
    measureBpmTransitions: any[];
    measureVols: number[];
    measureVolTransitions: any[];
    measureSignals: any[];
    tracks: TrackGroup[];
    timeSig: any;
    bpm: number;
    hasFullPlaybackAccess?: boolean;
    maxMeasuresAllowed?: number | null;
    loopStartMeasure?: number | null;
    loopEndMeasure?: number | null;
    tracksVersion: number;
    [key: string]: any;
  },
  section: SongSection,
  count: number,
  blockSize: number
): Record<string, any> => {
  const origStart = section.startMeasure;
  const origEnd = section.endMeasure;
  const targetStartM = origEnd + 1;
  const newTotalMeasures = state.totalMeasures + count;

  if (!state.hasFullPlaybackAccess && state.maxMeasuresAllowed !== null && newTotalMeasures > (state.maxMeasuresAllowed ?? Infinity)) {
    alert(`Limite de ${state.maxMeasuresAllowed} mesures atteinte en version gratuite.`);
    return state;
  }

  const prevIdx = Math.max(0, targetStartM - 1);
  const refSig = state.measureTimeSigs[prevIdx] || state.timeSig;
  const refBpm = state.measureBpms[prevIdx] || state.bpm;
  const refVol = state.measureVols[prevIdx] !== undefined ? state.measureVols[prevIdx] : 75;

  const spliceArr = <T>(arr: T[], fillVal: T): T[] => {
    const next = [...(arr || [])];
    next.splice(targetStartM, 0, ...Array(count).fill(fillVal));
    return next;
  };

  const nextTimeSigs = spliceArr(state.measureTimeSigs, refSig);
  const nextBpms = spliceArr(state.measureBpms, refBpm);
  const nextBpmTransitions = spliceArr(state.measureBpmTransitions, 'immediate');
  const nextVols = spliceArr(state.measureVols, refVol);
  const nextVolTransitions = spliceArr(state.measureVolTransitions, 'immediate');
  const nextSignals = spliceArr(state.measureSignals, null);

  const nextMarkers = (state.songMarkers || []).map(m =>
    m.measure >= targetStartM ? { ...m, measure: m.measure + count } : m
  );

  const nextSections = state.songSections.map(s => {
    if (s.id === section.id) return { ...s, endMeasure: origEnd + count };
    if (s.startMeasure >= targetStartM) return { ...s, startMeasure: s.startMeasure + count, endMeasure: s.endMeasure + count };
    if (s.endMeasure >= targetStartM) return { ...s, endMeasure: s.endMeasure + count };
    return s;
  }).sort((a, b) => a.startMeasure - b.startMeasure);

  const nextTracks = state.tracks.map(t => {
    let nextOverrides: Record<number, number | null> | undefined;
    if (t.patternOverrides) {
      nextOverrides = {};
      for (const [keyStr, val] of Object.entries(t.patternOverrides)) {
        const m = Number(keyStr);
        nextOverrides[m >= targetStartM ? m + count : m] = val;
      }
    }
    return {
      ...t,
      measureVols: t.measureVols ? spliceArr(t.measureVols, t.measureVols[prevIdx] ?? t.volumeVal ?? 75) : undefined,
      measureVolTransitions: t.measureVolTransitions ? spliceArr(t.measureVolTransitions, 'immediate' as const) : undefined,
      measurePans: t.measurePans ? spliceArr(t.measurePans, t.measurePans[prevIdx] ?? t.panVal ?? t.pan ?? 0) : undefined,
      measurePanTransitions: t.measurePanTransitions ? spliceArr(t.measurePanTransitions, 'immediate' as const) : undefined,
      measureReverbSends: t.measureReverbSends ? spliceArr(t.measureReverbSends, t.measureReverbSends[prevIdx] ?? t.fxSends?.reverb ?? t.reverbVal ?? 0) : undefined,
      measureReverbTransitions: t.measureReverbTransitions ? spliceArr(t.measureReverbTransitions, 'immediate' as const) : undefined,
      patternOverrides: nextOverrides,
      patterns: t.patterns.map(p => ({
        ...p,
        measureAssignments: spliceArr(p.measureAssignments, false),
        measureAllowVariations: p.measureAllowVariations ? spliceArr(p.measureAllowVariations, true) : undefined
      }))
    };
  });

  for (let i = 0; i < count; i++) {
    const srcM = origStart + (i % blockSize);
    const destM = targetStartM + i;
    nextTimeSigs[destM] = nextTimeSigs[srcM];
    nextBpms[destM] = nextBpms[srcM];
    nextBpmTransitions[destM] = nextBpmTransitions[srcM];
    nextVols[destM] = nextVols[srcM];
    nextVolTransitions[destM] = nextVolTransitions[srcM];
    nextSignals[destM] = nextSignals[srcM];

    for (const t of nextTracks) {
      if (t.measureVols && t.measureVols[srcM] !== undefined) t.measureVols[destM] = t.measureVols[srcM];
      if (t.measurePans && t.measurePans[srcM] !== undefined) t.measurePans[destM] = t.measurePans[srcM];
      if (t.patternOverrides) {
        if (t.patternOverrides[srcM] !== undefined) t.patternOverrides[destM] = t.patternOverrides[srcM];
        else delete t.patternOverrides[destM];
      }
      for (const p of t.patterns) {
        p.measureAssignments[destM] = Boolean(p.measureAssignments[srcM]);
        if (p.measureAllowVariations && p.measureAllowVariations[srcM] !== undefined) {
          p.measureAllowVariations[destM] = p.measureAllowVariations[srcM];
        }
      }
    }
  }

  return {
    totalMeasures: newTotalMeasures,
    loopStartMeasure: (state.loopStartMeasure !== null && state.loopStartMeasure !== undefined && state.loopStartMeasure >= targetStartM) ? state.loopStartMeasure + count : state.loopStartMeasure,
    loopEndMeasure: (state.loopEndMeasure !== null && state.loopEndMeasure !== undefined && state.loopEndMeasure >= targetStartM) ? state.loopEndMeasure + count : state.loopEndMeasure,
    measureTimeSigs: nextTimeSigs,
    measureBpms: nextBpms,
    measureBpmTransitions: nextBpmTransitions,
    measureVols: nextVols,
    measureVolTransitions: nextVolTransitions,
    measureSignals: nextSignals,
    songSections: nextSections,
    songMarkers: nextMarkers,
    tracks: nextTracks,
    tracksVersion: state.tracksVersion + 1
  };
};
