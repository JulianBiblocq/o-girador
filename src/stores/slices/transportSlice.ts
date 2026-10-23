
import { StateCreator } from 'zustand';
import type { SequencerStore } from '../types/sequencerStoreTypes';
import type { TransportSlice } from './transportSliceTypes';
import { deleteMeasureState, insertMeasureState } from '../helpers/measureOperationsHelper';
import { resizeTotalMeasuresState } from '../helpers/measureResizeHelper';
import { notifyToast } from '../../utils/toastHelper';
import {
  applyGlobalBpmDeltaState,
  setGlobalBpmState,
  resetTempoToNominalState,
  handleMeasureBpmChangeState,
  handleMeasureVolChangeState,
} from '../helpers/bpmOperationsHelper';

export type { TransportSlice };

export const createTransportSlice: StateCreator<SequencerStore, [], [], TransportSlice> = (set, get) => ({
  totalMeasures: 8,
  maxMeasuresAllowed: null,
  bpm: 83,
  nominalPresetBpm: 83,
  nominalPresetMeasureBpms: Array(8).fill(83),
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
  applyGlobalBpmDelta: (delta) => set((state) => applyGlobalBpmDeltaState(state, delta)),
  setGlobalBpm: (targetBpm) => set((state) => setGlobalBpmState(state, targetBpm)),
  resetTempoToNominal: () => set((state) => resetTempoToNominalState(state)),
  setNominalPresetTempo: (bpm, measureBpms) => set({ nominalPresetBpm: bpm, nominalPresetMeasureBpms: [...measureBpms] }),
  setTimeSig: (sig) => set({ timeSig: sig }),
  setTotalMeasures: (updater, bypassLimit = false) => set(state => {
    const nextVal = typeof updater === 'function' ? updater(state.totalMeasures) : updater;
    if (!bypassLimit && !state.hasFullPlaybackAccess && state.maxMeasuresAllowed !== null && nextVal > state.maxMeasuresAllowed) {
      notifyToast(state.lang === 'pt' ? `Limite de ${state.maxMeasuresAllowed} compassos atingido na versão gratuita.` : `Limite de ${state.maxMeasuresAllowed} mesures atteinte en version gratuite.`, 'error');
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

  handleMeasureBpmChange: (idx, val) => handleMeasureBpmChangeState(get, set, idx, val),
  handleMeasureTransitionChange: (idx, val) => {
    get().pushUndoState();
    set((s) => {
      const arr = [...s.measureBpmTransitions];
      arr[idx] = val;
      return { measureBpmTransitions: arr };
    });
  },
  handleMeasureVolChange: (idx, val) => handleMeasureVolChangeState(get, set, idx, val),
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
