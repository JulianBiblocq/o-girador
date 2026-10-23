import { StateCreator } from 'zustand';
import type { SequencerStore } from '../types/sequencerStoreTypes';
import type { HistorySlice } from './historySliceTypes';
import {
  captureStructureSnapshot,
  popHistoryState,
  scheduleUndoIdle,
  cancelUndoIdle,
  deepCloneTracks,
  getPendingUndoSnapshot,
  setPendingUndoSnapshot,
  getIdleUndoId,
  setIdleUndoId,
} from '../helpers/undoHistoryHelpers';

export type { HistorySlice };

export const createHistorySlice: StateCreator<SequencerStore, [], [], HistorySlice> = (set, get) => {
  const flushPendingUndo = () => {
    const idleId = getIdleUndoId();
    if (idleId !== null) {
      cancelUndoIdle(idleId);
      setIdleUndoId(null);
    }
    const snapshot = getPendingUndoSnapshot();
    if (!snapshot) return;
    setPendingUndoSnapshot(null);

    const clonedTracks = deepCloneTracks(snapshot.tracks);

    set((prev) => {
      const nextTracksHistory = [...prev.tracksHistory, clonedTracks];
      if (nextTracksHistory.length > 10) nextTracksHistory.shift();

      const nextStructureHistory = [...prev.songStructureHistory, snapshot.structure];
      if (nextStructureHistory.length > 10) nextStructureHistory.shift();

      return {
        tracksRedoHistory: [],
        songStructureRedoHistory: [],
        tracksHistory: nextTracksHistory,
        songStructureHistory: nextStructureHistory,
      };
    });
  };

  return {
    tracksHistory: [],
    tracksRedoHistory: [],
    songStructureHistory: [],
    songStructureRedoHistory: [],

    pushUndoState: (customTracksState) => {
      const state = get();
      const tracksToSave = customTracksState || state.tracks;
      const snapStructure = captureStructureSnapshot(state);

      if (!getPendingUndoSnapshot()) {
        setPendingUndoSnapshot({
          tracks: tracksToSave,
          structure: snapStructure
        });
      }

      const idleId = getIdleUndoId();
      if (idleId !== null) {
        cancelUndoIdle(idleId);
      }

      setIdleUndoId(scheduleUndoIdle(() => {
        flushPendingUndo();
      }));
    },

    handleUndo: () => {
      flushPendingUndo();
      const state = get();
      if (state.tracksHistory.length === 0) return;
      set((prev) => (popHistoryState(prev, 'undo') as Partial<SequencerStore>) || {});
    },

    handleRedo: () => {
      flushPendingUndo();
      const state = get();
      if (state.tracksRedoHistory.length === 0) return;
      set((prev) => (popHistoryState(prev, 'redo') as Partial<SequencerStore>) || {});
    },

    clearHistory: () => {
      const idleId = getIdleUndoId();
      if (idleId !== null) {
        cancelUndoIdle(idleId);
        setIdleUndoId(null);
      }
      setPendingUndoSnapshot(null);
      set({ tracksHistory: [], tracksRedoHistory: [], songStructureHistory: [], songStructureRedoHistory: [] });
    }
  };
};
