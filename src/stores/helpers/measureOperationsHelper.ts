import { notifyToast } from '../../utils/toastHelper';

export const deleteMeasureState = (state: any, measureIdx: number): Record<string, any> => {
  if (state.totalMeasures <= 1) return state;

  const nextLoopStart = state.loopStartMeasure === null ? null : (
    state.loopStartMeasure === measureIdx
      ? Math.max(0, Math.min(state.totalMeasures - 2, state.loopStartMeasure))
      : (state.loopStartMeasure > measureIdx ? state.loopStartMeasure - 1 : state.loopStartMeasure)
  );

  const nextLoopEnd = state.loopEndMeasure === null ? null : (
    state.loopEndMeasure === measureIdx
      ? Math.max(0, Math.min(state.totalMeasures - 2, state.loopEndMeasure))
      : (state.loopEndMeasure > measureIdx ? state.loopEndMeasure - 1 : state.loopEndMeasure)
  );

  return {
    totalMeasures: state.totalMeasures - 1,
    loopStartMeasure: nextLoopStart,
    loopEndMeasure: nextLoopEnd,
    measureTimeSigs: state.measureTimeSigs.filter((_: any, idx: number) => idx !== measureIdx),
    measureBpms: state.measureBpms.filter((_: any, idx: number) => idx !== measureIdx),
    measureBpmTransitions: state.measureBpmTransitions.filter((_: any, idx: number) => idx !== measureIdx),
    measureVols: state.measureVols.filter((_: any, idx: number) => idx !== measureIdx),
    measureVolTransitions: state.measureVolTransitions.filter((_: any, idx: number) => idx !== measureIdx),
    measureSignals: state.measureSignals.filter((_: any, idx: number) => idx !== measureIdx),
    songSections: state.songSections
      .filter((s: any) => !(s.startMeasure === measureIdx && s.endMeasure === measureIdx))
      .map((s: any) => {
        if (s.startMeasure > measureIdx) {
          return { ...s, startMeasure: s.startMeasure - 1, endMeasure: s.endMeasure - 1 };
        } else if (s.endMeasure >= measureIdx) {
          return { ...s, endMeasure: s.endMeasure - 1 };
        }
        return s;
      }),
    songMarkers: state.songMarkers.filter((m: any) => m.measure !== measureIdx).map((m: any) => {
      if (m.measure > measureIdx) {
        return { ...m, measure: m.measure - 1 };
      }
      return m;
    }),
    tracks: state.tracks.map((t: any) => ({
      ...t,
      measureVols: t.measureVols ? t.measureVols.filter((_: any, idx: number) => idx !== measureIdx) : undefined,
      measureVolTransitions: t.measureVolTransitions ? t.measureVolTransitions.filter((_: any, idx: number) => idx !== measureIdx) : undefined,
      measurePans: t.measurePans ? t.measurePans.filter((_: any, idx: number) => idx !== measureIdx) : undefined,
      measurePanTransitions: t.measurePanTransitions ? t.measurePanTransitions.filter((_: any, idx: number) => idx !== measureIdx) : undefined,
      measureReverbSends: t.measureReverbSends ? t.measureReverbSends.filter((_: any, idx: number) => idx !== measureIdx) : undefined,
      measureReverbTransitions: t.measureReverbTransitions ? t.measureReverbTransitions.filter((_: any, idx: number) => idx !== measureIdx) : undefined,
      patterns: t.patterns.map((p: any) => ({
        ...p,
        measureAssignments: p.measureAssignments.filter((_: any, idx: number) => idx !== measureIdx),
        measureAllowVariations: p.measureAllowVariations ? p.measureAllowVariations.filter((_: any, idx: number) => idx !== measureIdx) : undefined
      }))
    })),
    tracksVersion: state.tracksVersion + 1
  };
};

export const insertMeasureState = (state: any, measureIdx: number, amount: number = 1): Record<string, any> => {
  if (!state.hasFullPlaybackAccess && state.maxMeasuresAllowed !== null && state.totalMeasures + amount > state.maxMeasuresAllowed) {
    notifyToast(state.lang === 'pt' ? `Limite de ${state.maxMeasuresAllowed} compassos atingido na versão gratuita.` : `Limite de ${state.maxMeasuresAllowed} mesures atteinte en version gratuite.`, 'error');
    return state;
  }

  const prevIdx = Math.max(0, measureIdx - 1);
  const refSig = state.measureTimeSigs[prevIdx] || state.timeSig;
  const refBpm = state.measureBpms[prevIdx] || state.bpm;
  const refVol = state.measureVols[prevIdx] !== undefined ? state.measureVols[prevIdx] : 100;

  const spliceArray = <T>(arr: T[], insertVal: T): T[] => {
    const next = [...arr];
    next.splice(measureIdx, 0, ...Array(amount).fill(insertVal));
    return next;
  };

  const nextLoopStart = (state.loopStartMeasure !== null && state.loopStartMeasure >= measureIdx)
    ? state.loopStartMeasure + amount
    : state.loopStartMeasure;
  const nextLoopEnd = (state.loopEndMeasure !== null && state.loopEndMeasure >= measureIdx)
    ? state.loopEndMeasure + amount
    : state.loopEndMeasure;

  return {
    totalMeasures: state.totalMeasures + amount,
    loopStartMeasure: nextLoopStart,
    loopEndMeasure: nextLoopEnd,
    measureTimeSigs: spliceArray(state.measureTimeSigs, refSig),
    measureBpms: spliceArray(state.measureBpms, refBpm),
    measureBpmTransitions: spliceArray(state.measureBpmTransitions, 'immediate'),
    measureVols: spliceArray(state.measureVols, refVol),
    measureVolTransitions: spliceArray(state.measureVolTransitions, 'immediate'),
    measureSignals: spliceArray(state.measureSignals, null),
    songSections: state.songSections.map((s: any) => {
      if (s.startMeasure >= measureIdx) {
        return { ...s, startMeasure: s.startMeasure + amount, endMeasure: s.endMeasure + amount };
      } else if (s.endMeasure >= measureIdx) {
        return { ...s, endMeasure: s.endMeasure + amount };
      }
      return s;
    }),
    songMarkers: state.songMarkers.map((m: any) => {
      if (m.measure >= measureIdx) {
        return { ...m, measure: m.measure + amount };
      }
      return m;
    }),
    tracks: state.tracks.map((t: any) => ({
      ...t,
      measureVols: t.measureVols ? spliceArray(t.measureVols, t.measureVols[prevIdx] ?? t.volumeVal ?? 75) : undefined,
      measureVolTransitions: t.measureVolTransitions ? spliceArray(t.measureVolTransitions, 'immediate') : undefined,
      measurePans: t.measurePans ? spliceArray(t.measurePans, t.measurePans[prevIdx] ?? t.panVal ?? t.pan ?? 0) : undefined,
      measurePanTransitions: t.measurePanTransitions ? spliceArray(t.measurePanTransitions, 'immediate') : undefined,
      measureReverbSends: t.measureReverbSends ? spliceArray(t.measureReverbSends, t.measureReverbSends[prevIdx] ?? t.fxSends?.reverb ?? t.reverbVal ?? 0) : undefined,
      measureReverbTransitions: t.measureReverbTransitions ? spliceArray(t.measureReverbTransitions, 'immediate') : undefined,
      patterns: t.patterns.map((p: any) => ({
        ...p,
        measureAssignments: spliceArray(p.measureAssignments, false),
        measureAllowVariations: p.measureAllowVariations ? spliceArray(p.measureAllowVariations, true) : undefined
      }))
    })),
    tracksVersion: state.tracksVersion + 1
  };
};
