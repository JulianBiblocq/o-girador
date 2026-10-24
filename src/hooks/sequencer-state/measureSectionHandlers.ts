import { SongSection, TimeSignature, TrackGroup } from '../../types';
import { useSequencerStore } from '../../stores/useSequencerStore';

export interface MeasureSectionContext {
  pushUndoState: () => void;
  totalMeasures: number;
  totalMeasuresRef: { current: number };
  measureBpmsRef: { current: number[] };
  measureBpmTransitionsRef: { current: ('immediate' | 'ramp' | 'bezier')[] };
  measureVolsRef: { current: number[] };
  setTotalMeasures: (updater: number | ((prev: number) => number)) => void;
  setMeasureTimeSigs: (updater: (prev: TimeSignature[]) => TimeSignature[]) => void;
  setMeasureBpms: (updater: number[] | ((prev: number[]) => number[])) => void;
  setMeasureBpmTransitions: (updater: ('immediate' | 'ramp' | 'bezier')[] | ((prev: ('immediate' | 'ramp' | 'bezier')[]) => ('immediate' | 'ramp' | 'bezier')[])) => void;
  setMeasureVols: (updater: number[] | ((prev: number[]) => number[])) => void;
  setMeasureVolTransitions: (updater: ('immediate' | 'ramp' | 'bezier')[] | ((prev: ('immediate' | 'ramp' | 'bezier')[]) => ('immediate' | 'ramp' | 'bezier')[])) => void;
  setSongSections: (updater: (prev: SongSection[]) => SongSection[]) => void;
  setTracks: (updater: (prev: TrackGroup[]) => TrackGroup[]) => void;
}

export function createMeasureSectionHandlers(ctx: MeasureSectionContext) {
  const { pushUndoState, setTotalMeasures, setMeasureTimeSigs, setMeasureBpms, setMeasureBpmTransitions, setMeasureVols, setMeasureVolTransitions, setSongSections } = ctx;

  const handleCreateSongSection = (name: string, start: number, end: number, color?: string, repeatCount?: number, level?: number) => {
    pushUndoState();
    const newSection: SongSection = {
      id: Date.now().toString() + '-' + Math.random().toString(36).substring(2, 9),
      name, startMeasure: start, endMeasure: end, color: color || '#27ae60', repeatCount: repeatCount || 1, level: level !== undefined ? level : 0,
    };
    setSongSections((prev: SongSection[]) => [...prev, newSection].sort((a: SongSection, b: SongSection) => a.startMeasure - b.startMeasure));
    if (end + 1 > ctx.totalMeasures) setTotalMeasures(end + 1);
  };

  const handleUpdateSongSection = (id: string, name: string, start: number, end: number, color?: string, level?: number) => {
    pushUndoState();
    setSongSections((prev: SongSection[]) => prev.map((s: SongSection) => (s.id === id || String(s.id) === String(id)) ? { ...s, name, startMeasure: start, endMeasure: end, color, level: level !== undefined ? level : (s.level ?? 0) } : s).sort((a: SongSection, b: SongSection) => a.startMeasure - b.startMeasure));
    if (end + 1 > ctx.totalMeasures) setTotalMeasures(end + 1);
  };

  const handleUpdateSectionRepeat = (id: string, count: number) => {
    pushUndoState();
    setSongSections((prev: SongSection[]) => prev.map((s: SongSection) => (s.id === id || String(s.id) === String(id)) ? { ...s, repeatCount: count } : s));
  };

  const handleDeleteSongSection = (id: string) => {
    pushUndoState();
    setSongSections((prev: SongSection[]) => prev.filter((s: SongSection) => (s.id !== id && String(s.id) !== String(id))));
  };

  const handleMeasureTimeSigChange = (measureIdx: number, val: TimeSignature) => {
    pushUndoState();
    setMeasureTimeSigs((prev: TimeSignature[]) => { const arr = [...prev]; arr[measureIdx] = val; return arr; });
  };

  const handleMeasureBpmChange = (measureIdx: number, val: number) => {
    pushUndoState();
    const arr = [...ctx.measureBpmsRef.current];
    arr[measureIdx] = val;
    setMeasureBpms(arr);
    ctx.measureBpmsRef.current = arr;
    useSequencerStore.setState({ measureBpms: arr });
  };

  const handleMeasureBpmChangeCascade = (measureIdx: number, val: number) => {
    pushUndoState();
    const arr = [...ctx.measureBpmsRef.current];
    for (let i = measureIdx; i < arr.length; i++) arr[i] = val;
    setMeasureBpms(arr);
    ctx.measureBpmsRef.current = arr;
    useSequencerStore.setState({ measureBpms: arr });
  };

  const handleMeasureTransitionChange = (measureIdx: number, val: 'immediate' | 'ramp' | 'bezier') => {
    pushUndoState();
    const arr = [...ctx.measureBpmTransitionsRef.current];
    arr[measureIdx] = val;
    setMeasureBpmTransitions(arr);
    ctx.measureBpmTransitionsRef.current = arr;
    useSequencerStore.setState({ measureBpmTransitions: arr });
  };

  const handleMeasureVolChange = (measureIdx: number, val: number) => {
    pushUndoState();
    const arr = [...ctx.measureVolsRef.current];
    arr[measureIdx] = val;
    setMeasureVols(arr);
    ctx.measureVolsRef.current = arr;
    useSequencerStore.setState({ measureVols: arr });
  };

  const handleMeasureVolTransitionChange = (measureIdx: number, val: 'immediate' | 'ramp' | 'bezier') => {
    pushUndoState();
    setMeasureVolTransitions((prev: ('immediate' | 'ramp' | 'bezier')[]) => { const arr = [...prev]; arr[measureIdx] = val; return arr; });
  };

  const handleTotalMeasuresChange = (val: number) => {
    pushUndoState();
    setTotalMeasures(val);
  };

  return {
    handleCreateSongSection,
    handleUpdateSongSection,
    handleUpdateSectionRepeat,
    handleDeleteSongSection,
    handleMeasureTimeSigChange,
    handleMeasureBpmChange,
    handleMeasureBpmChangeCascade,
    handleMeasureTransitionChange,
    handleMeasureVolChange,
    handleMeasureVolTransitionChange,
    handleTotalMeasuresChange,
  };
}
