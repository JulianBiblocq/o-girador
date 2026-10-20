import { StateCreator } from 'zustand';
import type { SequencerStore } from '../useSequencerStore';
import { TrackCoreSlice } from './trackCoreSliceTypes';
import {
  handleTrackDeleteState,
  duplicateTrackState,
  handleTrackMuteToggleState,
  handleTrackSoloToggleState,
  handleTrackHideToggleState,
  handleTrackInstrumentIdxChangeState
} from '../helpers/trackLifecycleHelpers';
import {
  toggleArmPatternState,
  updatePatternStepState,
  setSelectedPatternIdState
} from '../helpers/trackRecordArmHelper';
import { deployToadaCycle } from '../../utils/toadaArrangement';
import { applyRadii } from '../helpers/trackRodaGeometryHelpers';

export const createTrackCoreSlice: StateCreator<SequencerStore, [], [], TrackCoreSlice> = (set, get) => ({
  tracks: [],
  rodaTrackOrder: [],
  activeAoVivoTrackId: null,
  isLetraActive: false,
  tracksVersion: 0,
  armedTrackId: null,
  armedPatternId: null,
  isPatternRecording: false,
  toadaConductorSlots: [],
  pendingToadaQuickDeploy: null,

  setToadaConductorSlots: (slots) => set({ toadaConductorSlots: slots }),
  setPendingToadaQuickDeploy: (val) => set({ pendingToadaQuickDeploy: val }),
  deployToadaCycleAtMeasure: (startMeasureIdx) => {
    get().pushUndoState();
    set((state) => deployToadaCycle(state, startMeasureIdx));
  },

  toggleArmPattern: (trackId, patternId) => set(state => toggleArmPatternState(state, trackId, patternId)),
  disarmAllPatterns: () => set({ armedTrackId: null, armedPatternId: null, isPatternRecording: false }),
  setIsPatternRecording: (updater) => set(state => ({
    isPatternRecording: typeof updater === 'function' ? updater(state.isPatternRecording) : updater
  })),
  togglePatternRecording: () => set(state => {
    if (!state.isPatternRecording) {
      if (state.armedPatternId === null || state.armedTrackId === null) return { isPatternRecording: false };
      return { isPatternRecording: true };
    }
    return { isPatternRecording: false };
  }),

  updatePatternStep: (trackId, patternId, stepIdx, char) => set(state => {
    const { tracks: nextTracks, changed } = updatePatternStepState(state.tracks, trackId, patternId, stepIdx, char);
    if (!changed) return state;
    return { tracks: nextTracks, tracksVersion: state.tracksVersion + 1 };
  }),

  setTracks: (updater) => set(state => {
    const nextTracks = typeof updater === 'function' ? updater(state.tracks) : updater;
    return { tracks: applyRadii(nextTracks, state.rodaTrackOrder), tracksVersion: state.tracksVersion + 1 };
  }),

  setSelectedPatternId: (trackIdOrPatternId, patternId) => set(state => {
    const res = setSelectedPatternIdState(state, trackIdOrPatternId, patternId);
    return { selectedPatternId: res.selectedPatternId, tracks: res.tracks, tracksVersion: state.tracksVersion + 1 };
  }),

  setRodaTrackOrder: (updater) => set(state => {
    const nextOrder = typeof updater === 'function' ? updater(state.rodaTrackOrder) : updater;
    return { rodaTrackOrder: nextOrder, tracks: applyRadii(state.tracks, nextOrder), tracksVersion: state.tracksVersion + 1 };
  }),

  setActiveAoVivoTrackId: (id) => set({ activeAoVivoTrackId: id }),
  setIsLetraActive: (val) => set(state => ({ isLetraActive: typeof val === 'function' ? val(state.isLetraActive) : val })),
  toggleLetraActive: () => set(state => ({ isLetraActive: !state.isLetraActive })),

  handleTrackInstrumentIdxChange: (id, targetInstIdx) => {
    get().pushUndoState();
    set(state => ({ tracks: handleTrackInstrumentIdxChangeState(state.tracks, id, targetInstIdx), tracksVersion: state.tracksVersion + 1 }));
  },

  handleTrackMuteToggle: (id) => {
    set(state => ({ tracks: handleTrackMuteToggleState(state.tracks, id) }));
  },

  handleTrackSoloToggle: (id) => {
    set(state => ({ tracks: handleTrackSoloToggleState(state.tracks, id) }));
  },

  handleTrackHideToggle: (id) => {
    set(state => ({ tracks: handleTrackHideToggleState(state.tracks, id) }));
  },

  handleTrackDelete: (id) => {
    get().pushUndoState();
    set(state => handleTrackDeleteState(state, id));
  },

  duplicateTrack: (trackId) => {
    get().pushUndoState();
    const res = duplicateTrackState(get(), trackId);
    if (!res) return null;
    set(prev => ({ tracks: res.tracks, rodaTrackOrder: res.rodaTrackOrder, tracksVersion: prev.tracksVersion + 1 }));
    return res.newTrackId;
  }
});
