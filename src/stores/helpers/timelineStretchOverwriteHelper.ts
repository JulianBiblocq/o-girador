import { SongSection, TrackGroup } from '../../types';

export const stretchOverwriteModeState = (
  state: {
    songSections: SongSection[];
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
    tracksVersion: number;
    [key: string]: any;
  },
  section: SongSection,
  newEndMeasure: number,
  count: number,
  blockSize: number
): Record<string, any> => {
  const origStart = section.startMeasure;
  const origEnd = section.endMeasure;
  const targetStartM = origEnd + 1;
  const newTotalMeasures = Math.max(state.totalMeasures, newEndMeasure + 1);

  if (!state.hasFullPlaybackAccess && state.maxMeasuresAllowed !== null && newTotalMeasures > (state.maxMeasuresAllowed ?? Infinity)) {
    alert(`Limite de ${state.maxMeasuresAllowed} mesures atteinte en version gratuite.`);
    return state;
  }

  const expand = <T>(arr: T[], fillVal: T): T[] => {
    const next = [...(arr || [])];
    while (next.length < newTotalMeasures) next.push(fillVal);
    return next;
  };

  const nextTimeSigs = expand(state.measureTimeSigs, state.timeSig);
  const nextBpms = expand(state.measureBpms, state.bpm);
  const nextBpmTransitions = expand(state.measureBpmTransitions, 'immediate');
  const nextVols = expand(state.measureVols, 100);
  const nextVolTransitions = expand(state.measureVolTransitions, 'immediate');
  const nextSignals = expand(state.measureSignals, null);

  const nextTracks = state.tracks.map(t => ({
    ...t,
    patternOverrides: t.patternOverrides ? { ...t.patternOverrides } : {},
    measureVols: t.measureVols ? expand(t.measureVols, 100) : undefined,
    measurePans: t.measurePans ? expand(t.measurePans, 0) : undefined,
    patterns: t.patterns.map(p => ({
      ...p,
      measureAssignments: expand(p.measureAssignments || [], false),
      measureAllowVariations: p.measureAllowVariations ? expand(p.measureAllowVariations, true) : undefined
    }))
  }));

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

  const nextSections: SongSection[] = [];
  for (const s of state.songSections) {
    if (s.id === section.id) {
      nextSections.push({ ...s, endMeasure: newEndMeasure });
      continue;
    }
    if (s.startMeasure >= targetStartM && s.endMeasure <= newEndMeasure) continue;
    let adjStart = s.startMeasure;
    let adjEnd = s.endMeasure;
    if (adjStart >= targetStartM && adjStart <= newEndMeasure) adjStart = newEndMeasure + 1;
    if (adjEnd >= targetStartM && adjEnd <= newEndMeasure) adjEnd = targetStartM - 1;
    if (s.startMeasure < targetStartM && s.endMeasure > newEndMeasure) adjEnd = targetStartM - 1;
    if (adjStart <= adjEnd) nextSections.push({ ...s, startMeasure: adjStart, endMeasure: adjEnd });
  }
  nextSections.sort((a, b) => a.startMeasure - b.startMeasure);

  return {
    totalMeasures: newTotalMeasures,
    measureTimeSigs: nextTimeSigs,
    measureBpms: nextBpms,
    measureBpmTransitions: nextBpmTransitions,
    measureVols: nextVols,
    measureVolTransitions: nextVolTransitions,
    measureSignals: nextSignals,
    songSections: nextSections,
    tracks: nextTracks,
    tracksVersion: state.tracksVersion + 1
  };
};
