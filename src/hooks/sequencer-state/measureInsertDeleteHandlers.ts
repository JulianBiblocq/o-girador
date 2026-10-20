import { TimeSignature, SongMarker, SongSection, TrackGroup, Pattern } from '../../types';

export interface MeasureInsertDeleteContext {
  pushUndoState: () => void;
  timeSig: TimeSignature;
  bpm: number;
  totalMeasuresRef: { current: number };
  measureTimeSigsRef: { current: TimeSignature[] };
  measureBpms: number[];
  measureVols: number[];
  pendingStructureActionRef: { current: { type: 'insert' | 'delete'; measureIdx: number } | null };
  setTotalMeasures: (updater: number | ((prev: number) => number)) => void;
  setMeasureTimeSigs: (updater: (prev: TimeSignature[]) => TimeSignature[]) => void;
  setMeasureBpms: (updater: number[] | ((prev: number[]) => number[])) => void;
  setMeasureBpmTransitions: (updater: ('immediate' | 'ramp' | 'bezier')[] | ((prev: ('immediate' | 'ramp' | 'bezier')[]) => ('immediate' | 'ramp' | 'bezier')[])) => void;
  setMeasureVols: (updater: number[] | ((prev: number[]) => number[])) => void;
  setMeasureVolTransitions: (updater: ('immediate' | 'ramp' | 'bezier')[] | ((prev: ('immediate' | 'ramp' | 'bezier')[]) => ('immediate' | 'ramp' | 'bezier')[])) => void;
  setMeasureSignals: (updater: (prev: (string | null)[]) => (string | null)[]) => void;
  setSongMarkers: (updater: (prev: SongMarker[]) => SongMarker[]) => void;
  setSongSections: (updater: (prev: SongSection[]) => SongSection[]) => void;
  setLoopStartMeasure: (updater: number | null | ((prev: number | null) => number | null)) => void;
  setLoopEndMeasure: (updater: number | null | ((prev: number | null) => number | null)) => void;
  setTracks: (updater: (prev: TrackGroup[]) => TrackGroup[]) => void;
}

export function createMeasureInsertDeleteHandlers(ctx: MeasureInsertDeleteContext) {
  const { pushUndoState, setTotalMeasures, setMeasureTimeSigs, setMeasureBpms, setMeasureBpmTransitions, setMeasureVols, setMeasureVolTransitions, setMeasureSignals, setSongMarkers, setSongSections, setLoopStartMeasure, setLoopEndMeasure, setTracks } = ctx;

  const handleDeleteMeasure = (measureIdx: number) => {
    pushUndoState();
    if (ctx.totalMeasuresRef.current <= 1) return;
    ctx.pendingStructureActionRef.current = { type: 'delete', measureIdx };
    setTotalMeasures((prev: number) => prev - 1);
    setMeasureTimeSigs((prev: TimeSignature[]) => prev.filter((_, idx: number) => idx !== measureIdx));
    setMeasureBpms((prev: number[]) => prev.filter((_, idx: number) => idx !== measureIdx));
    setMeasureBpmTransitions((prev: ('immediate' | 'ramp' | 'bezier')[]) => prev.filter((_, idx: number) => idx !== measureIdx));
    setMeasureVols((prev: number[]) => prev.filter((_, idx: number) => idx !== measureIdx));
    setMeasureVolTransitions((prev: ('immediate' | 'ramp' | 'bezier')[]) => prev.filter((_, idx: number) => idx !== measureIdx));
    setMeasureSignals((prev: (string | null)[]) => prev.filter((_, idx: number) => idx !== measureIdx));
    setSongMarkers((prev: SongMarker[]) => (prev || []).filter((m: SongMarker) => m.measure !== measureIdx).map((m: SongMarker) => m.measure > measureIdx ? { ...m, measure: m.measure - 1 } : m));
    setLoopStartMeasure((prev: number | null) => prev === null ? null : (prev === measureIdx ? Math.max(0, Math.min(ctx.totalMeasuresRef.current - 2, prev)) : (prev > measureIdx ? prev - 1 : prev)));
    setLoopEndMeasure((prev: number | null) => prev === null ? null : (prev === measureIdx ? Math.max(0, Math.min(ctx.totalMeasuresRef.current - 2, prev)) : (prev > measureIdx ? prev - 1 : prev)));
    setSongSections((prev: SongSection[]) => prev.filter((s: SongSection) => !(s.startMeasure === measureIdx && s.endMeasure === measureIdx)).map((s: SongSection) => s.startMeasure > measureIdx ? { ...s, startMeasure: s.startMeasure - 1, endMeasure: s.endMeasure - 1 } : (s.endMeasure >= measureIdx ? { ...s, endMeasure: s.endMeasure - 1 } : s)));
    setTracks((prev: TrackGroup[]) => prev.map((t: TrackGroup) => ({ ...t, patterns: t.patterns.map((p: Pattern) => ({ ...p, measureAssignments: p.measureAssignments.filter((_, idx: number) => idx !== measureIdx) })) })));
  };

  const handleInsertMeasure = (measureIdx: number, amount = 1) => {
    pushUndoState();
    ctx.pendingStructureActionRef.current = { type: 'insert', measureIdx };
    setTotalMeasures((prev: number) => prev + amount);
    const prevIdx = Math.max(0, measureIdx - 1);
    const refSig = ctx.measureTimeSigsRef.current[prevIdx] || ctx.timeSig;
    const refBpm = ctx.measureBpms[prevIdx] || ctx.bpm;
    const refVol = ctx.measureVols[prevIdx] !== undefined ? ctx.measureVols[prevIdx] : 100;

    setMeasureTimeSigs((prev: TimeSignature[]) => { const arr = [...prev]; arr.splice(measureIdx, 0, ...Array(amount).fill(refSig)); return arr; });
    setMeasureBpms((prev: number[]) => { const arr = [...prev]; arr.splice(measureIdx, 0, ...Array(amount).fill(refBpm)); return arr; });
    setMeasureBpmTransitions((prev: ('immediate' | 'ramp' | 'bezier')[]) => { const arr = [...prev]; arr.splice(measureIdx, 0, ...Array(amount).fill('immediate')); return arr; });
    setMeasureVols((prev: number[]) => { const arr = [...prev]; arr.splice(measureIdx, 0, ...Array(amount).fill(refVol)); return arr; });
    setMeasureVolTransitions((prev: ('immediate' | 'ramp' | 'bezier')[]) => { const arr = [...prev]; arr.splice(measureIdx, 0, ...Array(amount).fill('immediate')); return arr; });
    setMeasureSignals((prev: (string | null)[]) => { const arr = [...prev]; arr.splice(measureIdx, 0, ...Array(amount).fill(null)); return arr; });
    setSongMarkers((prev: SongMarker[]) => (prev || []).map((m: SongMarker) => m.measure >= measureIdx ? { ...m, measure: m.measure + amount } : m));
    setLoopStartMeasure((prev: number | null) => (prev !== null && prev >= measureIdx) ? prev + amount : prev);
    setLoopEndMeasure((prev: number | null) => (prev !== null && prev >= measureIdx) ? prev + amount : prev);
    setSongSections((prev: SongSection[]) => prev.map((s: SongSection) => s.startMeasure >= measureIdx ? { ...s, startMeasure: s.startMeasure + amount, endMeasure: s.endMeasure + amount } : (s.endMeasure >= measureIdx ? { ...s, endMeasure: s.endMeasure + amount } : s)));
    setTracks((prev: TrackGroup[]) => prev.map((t: TrackGroup) => ({
      ...t, patterns: t.patterns.map((p: Pattern) => { const arr = [...p.measureAssignments]; arr.splice(measureIdx, 0, ...Array(amount).fill(false)); return { ...p, measureAssignments: arr }; })
    })));
  };

  return { handleDeleteMeasure, handleInsertMeasure };
}
