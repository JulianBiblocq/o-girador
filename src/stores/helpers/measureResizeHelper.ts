import { notifyToast } from '../../utils/toastHelper';

export const resizeTotalMeasuresState = (state: any, val: number): Record<string, any> => {
  if (val === state.totalMeasures) return state;
  if (!state.hasFullPlaybackAccess && state.maxMeasuresAllowed !== null && val > state.totalMeasures && val > state.maxMeasuresAllowed) {
    notifyToast(state.lang === 'pt' ? `Limite de ${state.maxMeasuresAllowed} compassos atingido na versão gratuita.` : `Limite de ${state.maxMeasuresAllowed} mesures atteinte en version gratuite.`, 'error');
    return state;
  }
  const expand = <T>(arr: T[], fill: T): T[] => {
    if (arr.length === val) return arr;
    if (arr.length > val) return arr.slice(0, val);
    const next = [...arr];
    while (next.length < val) next.push(fill);
    return next;
  };
  return {
    totalMeasures: val,
    measureTimeSigs: expand(state.measureTimeSigs, state.timeSig),
    measureBpms: expand(state.measureBpms, state.bpm),
    measureBpmTransitions: expand(state.measureBpmTransitions, 'immediate'),
    measureVols: expand(state.measureVols, 100),
    measureVolTransitions: expand(state.measureVolTransitions, 'immediate'),
    measureSignals: expand(state.measureSignals, null),
    tracks: state.tracks.map((t: any) => ({
      ...t,
      measureVols: t.measureVols ? expand(t.measureVols, t.volumeVal ?? 75) : undefined,
      measureVolTransitions: t.measureVolTransitions ? expand(t.measureVolTransitions, 'immediate' as const) : undefined,
      measurePans: t.measurePans ? expand(t.measurePans, t.panVal ?? t.pan ?? 0) : undefined,
      measurePanTransitions: t.measurePanTransitions ? expand(t.measurePanTransitions, 'immediate' as const) : undefined,
      measureReverbSends: t.measureReverbSends ? expand(t.measureReverbSends, t.fxSends?.reverb ?? t.reverbVal ?? 0) : undefined,
      measureReverbTransitions: t.measureReverbTransitions ? expand(t.measureReverbTransitions, 'immediate' as const) : undefined,
      patterns: t.patterns.map((p: any) => ({
        ...p,
        measureAssignments: expand(p.measureAssignments || [], false),
        measureAllowVariations: p.measureAllowVariations ? expand(p.measureAllowVariations, true) : undefined
      }))
    })),
    tracksVersion: state.tracksVersion + 1
  };
};
