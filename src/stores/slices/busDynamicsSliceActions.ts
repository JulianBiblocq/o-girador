/**
 * busDynamicsSliceActions.ts — Slice Zustand Dynamique de Bus & Polarité avec support Undo/Redo (< 60 lignes).
 * Chaque action discrète pousse un point d'Undo (`pushUndoState`) avant mutation immuable des pistes.
 */
import { StateCreator } from 'zustand';
import type { SequencerStore } from '../types/sequencerStoreTypes';
import type { BusDynamicsSlice } from './busDynamicsSliceTypes';
import {
  applyBusCompressorArchetypeState,
  findTrackById,
  isBusDynamicsTarget,
  toggleBusCompressorState,
  togglePhaseInvertState,
  updateBusCompressorState,
} from '../helpers/busDynamicsStateHelpers';

export type { BusDynamicsSlice };

export const createBusDynamicsSlice: StateCreator<SequencerStore, [], [], BusDynamicsSlice> = (set, get) => ({
  toggleTrackPhaseInvert: (trackId) => {
    if (!findTrackById(get().tracks, trackId)) return;
    get().pushUndoState();
    set((s) => ({ tracks: togglePhaseInvertState(s.tracks, trackId) }));
  },

  toggleBusCompressor: (busTrackId) => {
    if (!isBusDynamicsTarget(findTrackById(get().tracks, busTrackId))) return;
    get().pushUndoState();
    set((s) => ({ tracks: toggleBusCompressorState(s.tracks, busTrackId) }));
  },

  updateBusCompressor: (busTrackId, patch, opts) => {
    if (!patch || !isBusDynamicsTarget(findTrackById(get().tracks, busTrackId))) return;
    if (!opts?.skipUndo) get().pushUndoState();
    set((s) => ({ tracks: updateBusCompressorState(s.tracks, busTrackId, patch) }));
  },

  applyBusCompressorArchetype: (busTrackId, archetype) => {
    if (!isBusDynamicsTarget(findTrackById(get().tracks, busTrackId))) return;
    get().pushUndoState();
    set((s) => ({ tracks: applyBusCompressorArchetypeState(s.tracks, busTrackId, archetype) }));
  },
});

