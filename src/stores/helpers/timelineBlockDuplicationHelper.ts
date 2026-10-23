import { TrackGroup } from '../../types';
import { notifyToast } from '../../utils/toastHelper';

export const duplicateSectionBlockState = (
  state: {
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
  startIdx: number,
  endIdx: number,
  targetIdx: number,
  copiesCount: number
): Record<string, any> => {
  const blockSize = endIdx - startIdx + 1;
  if (blockSize <= 0 || copiesCount <= 0) return {};

  const totalNewMeasures = copiesCount * blockSize;
  const newTotalMeasures = Math.max(state.totalMeasures, targetIdx + totalNewMeasures);

  if (!state.hasFullPlaybackAccess && state.maxMeasuresAllowed !== null && newTotalMeasures > (state.maxMeasuresAllowed ?? Infinity)) {
    notifyToast(state.lang === 'pt' ? `Limite de ${state.maxMeasuresAllowed} compassos atingido na versão gratuita.` : `Limite de ${state.maxMeasuresAllowed} mesures atteinte en version gratuite.`, 'error');
    return state;
  }

  const expand = <T>(arr: T[], fillValue: T, targetLength: number): T[] => {
    if (!arr) return [];
    if (arr.length >= targetLength) return arr;
    const next = [...arr];
    while (next.length < targetLength) next.push(fillValue);
    return next;
  };

  const nextTimeSigs = expand(state.measureTimeSigs, state.timeSig, newTotalMeasures);
  const nextBpms = expand(state.measureBpms, state.bpm, newTotalMeasures);
  const nextBpmTransitions = expand(state.measureBpmTransitions, 'immediate', newTotalMeasures);
  const nextVols = expand(state.measureVols, 100, newTotalMeasures);
  const nextVolTransitions = expand(state.measureVolTransitions, 'immediate', newTotalMeasures);
  const nextSignals = expand(state.measureSignals, null, newTotalMeasures);

  for (let copy = 0; copy < copiesCount; copy++) {
    for (let i = 0; i < blockSize; i++) {
      const src = startIdx + i;
      const dest = targetIdx + (copy * blockSize) + i;
      nextTimeSigs[dest] = nextTimeSigs[src];
      nextBpms[dest] = nextBpms[src];
      nextBpmTransitions[dest] = nextBpmTransitions[src];
      nextVols[dest] = nextVols[src];
      nextVolTransitions[dest] = nextVolTransitions[src];
      nextSignals[dest] = nextSignals[src];
    }
  }

  const nextTracks = state.tracks.map(t => {
    const nextOverrides = t.patternOverrides ? { ...t.patternOverrides } : {};

    for (let copy = 0; copy < copiesCount; copy++) {
      for (let i = 0; i < blockSize; i++) {
        const src = startIdx + i;
        const dest = targetIdx + (copy * blockSize) + i;
        if (nextOverrides[src] !== undefined) {
          nextOverrides[dest] = nextOverrides[src];
        } else {
          delete nextOverrides[dest];
        }
      }
    }

    return {
      ...t,
      patternOverrides: nextOverrides,
      patterns: t.patterns.map(p => {
        const nextAssignments = expand(p.measureAssignments || [], false, newTotalMeasures);
        const nextVariations = p.measureAllowVariations ? expand(p.measureAllowVariations, true, newTotalMeasures) : undefined;

        for (let copy = 0; copy < copiesCount; copy++) {
          for (let i = 0; i < blockSize; i++) {
            const src = startIdx + i;
            const dest = targetIdx + (copy * blockSize) + i;
            nextAssignments[dest] = nextAssignments[src];
            if (nextVariations) {
              nextVariations[dest] = nextVariations[src];
            }
          }
        }

        return {
          ...p,
          measureAssignments: nextAssignments,
          measureAllowVariations: nextVariations
        };
      })
    };
  });

  return {
    totalMeasures: newTotalMeasures,
    measureTimeSigs: nextTimeSigs,
    measureBpms: nextBpms,
    measureBpmTransitions: nextBpmTransitions,
    measureVols: nextVols,
    measureVolTransitions: nextVolTransitions,
    measureSignals: nextSignals,
    tracks: nextTracks,
    tracksVersion: state.tracksVersion + 1
  };
};
