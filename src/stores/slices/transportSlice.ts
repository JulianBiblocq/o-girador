import { StateCreator } from 'zustand';
import type { SequencerStore } from '../useSequencerStore';
import { TimeSignature } from '../../types';
import { deleteMeasureState, insertMeasureState } from '../helpers/measureOperationsHelper';
import { resizeTotalMeasuresState } from '../helpers/measureResizeHelper';

export interface TransportSlice {
  totalMeasures: number;
  maxMeasuresAllowed: number | null;
  bpm: number;
  timeSig: TimeSignature;
  measureTimeSigs: TimeSignature[];
  measureBpms: number[];
  measureBpmTransitions: ('immediate' | 'ramp' | 'bezier')[];
  measureVols: number[];
  measureVolTransitions: ('immediate' | 'ramp' | 'bezier')[];
  measureSignals: (string | null)[];
  isMasterVolumeBypassed?: boolean;

  setTotalMeasures: (val: number | ((prev: number) => number), bypassLimit?: boolean) => void;
  setMaxMeasuresAllowed: (val: number | null) => void;
  setBpm: (bpm: number) => void;
  setTimeSig: (sig: TimeSignature) => void;
  setMeasureSignals: (updater: (string | null)[] | ((prev: (string | null)[]) => (string | null)[])) => void;
  setMeasureBpms: (updater: number[] | ((prev: number[]) => number[])) => void;
  setMeasureTimeSigs: (updater: TimeSignature[] | ((prev: TimeSignature[]) => TimeSignature[])) => void;
  setMeasureBpmTransitions: (updater: ('immediate' | 'ramp' | 'bezier')[] | ((prev: ('immediate' | 'ramp' | 'bezier')[]) => ('immediate' | 'ramp' | 'bezier')[])) => void;
  setMeasureVols: (updater: number[] | ((prev: number[]) => number[])) => void;
  setMeasureVolTransitions: (updater: ('immediate' | 'ramp' | 'bezier')[] | ((prev: ('immediate' | 'ramp' | 'bezier')[]) => ('immediate' | 'ramp' | 'bezier')[])) => void;
  toggleMasterVolumeBypass: () => void;
  handleTotalMeasuresChange: (val: number) => void;
  handleMeasureTimeSigChange: (measureIdx: number, val: TimeSignature) => void;
  handleMeasureBpmChange: (measureIdx: number, val: number) => void;
  handleMeasureTransitionChange: (measureIdx: number, val: 'immediate' | 'ramp' | 'bezier') => void;
  handleMeasureVolChange: (measureIdx: number, val: number) => void;
  handleMeasureVolTransitionChange: (measureIdx: number, val: 'immediate' | 'ramp' | 'bezier') => void;
  handleDeleteMeasure: (measureIdx: number) => void;
  handleInsertMeasure: (measureIdx: number, amount?: number) => void;
}

export const createTransportSlice: StateCreator<SequencerStore, [], [], TransportSlice> = (set, get) => ({
  totalMeasures: 8,
  maxMeasuresAllowed: null,
  bpm: 83,
  timeSig: '4/4',
  measureTimeSigs: Array(8).fill('4/4'),
  setMeasureTimeSigs: (updater) => set(state => ({ 
    measureTimeSigs: typeof updater === 'function' ? (updater as any)(state.measureTimeSigs) : updater,
    tracksVersion: state.tracksVersion + 1
  })),
  measureBpms: Array(8).fill(83),
  measureBpmTransitions: Array(8).fill('immediate'),
  measureVols: Array(8).fill(100),
  measureVolTransitions: Array(8).fill('immediate'),
  measureSignals: Array(8).fill(null),
  isMasterVolumeBypassed: false,

  setBpm: (bpm) => set({ bpm }),
  setTimeSig: (sig) => set({ timeSig: sig }),
  setTotalMeasures: (updater, bypassLimit = false) => set(state => {
    const nextVal = typeof updater === 'function' ? updater(state.totalMeasures) : updater;
    if (!bypassLimit && !state.hasFullPlaybackAccess && state.maxMeasuresAllowed !== null && nextVal > state.maxMeasuresAllowed) {
      alert(`Limite de ${state.maxMeasuresAllowed} mesures atteinte en version gratuite.`);
      return state;
    }
    return { totalMeasures: nextVal, tracksVersion: state.tracksVersion + 1 };
  }),
  setMaxMeasuresAllowed: (val) => set({ maxMeasuresAllowed: val }),
  setMeasureSignals: (updater) => set((state) => ({ measureSignals: typeof updater === 'function' ? updater(state.measureSignals) : updater })),
  setMeasureBpms: (updater) => set((state) => ({ measureBpms: typeof updater === 'function' ? updater(state.measureBpms) : updater })),
  setMeasureBpmTransitions: (updater) => set((state) => ({ measureBpmTransitions: typeof updater === 'function' ? updater(state.measureBpmTransitions) : updater })),
  setMeasureVols: (updater) => set((state) => ({ measureVols: typeof updater === 'function' ? updater(state.measureVols) : updater })),
  setMeasureVolTransitions: (updater) => set((state) => ({ measureVolTransitions: typeof updater === 'function' ? updater(state.measureVolTransitions) : updater })),

  toggleMasterVolumeBypass: () => {
    get().pushUndoState();
    set(state => ({ isMasterVolumeBypassed: !state.isMasterVolumeBypassed }));
  },

  handleTotalMeasuresChange: (val) => {
    get().pushUndoState();
    set((state) => resizeTotalMeasuresState(state, val));
  },

  handleMeasureTimeSigChange: (idx, val) => {
    get().pushUndoState();
    set((state) => {
      const arr = [...state.measureTimeSigs];
      arr[idx] = val;
      return { measureTimeSigs: arr, tracksVersion: state.tracksVersion + 1 };
    });
  },

  handleMeasureBpmChange: (idx, val) => {
    const state = get();
    if (state.selectedAutomationType === 'bpm' && state.selectedAutomationRange && idx >= state.selectedAutomationRange.start && idx <= state.selectedAutomationRange.end) {
      state.setGroupedAutomationValue('bpm', val, null);
      return;
    }
    get().pushUndoState();
    set((s) => {
      const arr = [...s.measureBpms];
      arr[idx] = val;
      return { measureBpms: arr, bpm: idx === 0 ? val : s.bpm, tracksVersion: s.tracksVersion + 1 };
    });
  },

  handleMeasureTransitionChange: (idx, val) => {
    get().pushUndoState();
    set((s) => {
      const arr = [...s.measureBpmTransitions];
      arr[idx] = val;
      return { measureBpmTransitions: arr };
    });
  },
  handleMeasureVolChange: (idx, val) => {
    const state = get();
    if (state.selectedAutomationType === 'volume' && (state.selectedAutomationTrackId === null || state.selectedAutomationTrackId === undefined) && state.selectedAutomationRange && idx >= state.selectedAutomationRange.start && idx <= state.selectedAutomationRange.end) {
      state.setGroupedAutomationValue('volume', val, null);
      return;
    }
    get().pushUndoState();
    set((s) => {
      const arr = [...s.measureVols];
      arr[idx] = val;
      return { measureVols: arr, tracksVersion: s.tracksVersion + 1 };
    });
  },
  handleMeasureVolTransitionChange: (idx, val) => {
    get().pushUndoState();
    set((s) => {
      const arr = [...s.measureVolTransitions];
      arr[idx] = val;
      return { measureVolTransitions: arr };
    });
  },
  handleDeleteMeasure: (measureIdx) => {
    get().pushUndoState();
    set((s) => deleteMeasureState(s, measureIdx));
  },
  handleInsertMeasure: (measureIdx, amount = 1) => {
    get().pushUndoState();
    set((s) => insertMeasureState(s, measureIdx, amount));
  },
});
