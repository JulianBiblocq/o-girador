/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { StateCreator } from 'zustand';
import type { SequencerStore } from '../useSequencerStore';
import { TrainingSlice } from '../../types';

export const createTrainingSlice: StateCreator<SequencerStore, [], [], TrainingSlice> = (set, get) => ({
  tocarJuntoActive: false,
  tocarJuntoTrackId: null,
  tocarJuntoMuteScope: 'track',
  tocarJuntoIsMuted: true,
  isolateBaseOnly: true,
  firstPassRegistry: {},

  setTocarJuntoMuteScope: (scope: 'track' | 'family') => {
    set({ tocarJuntoMuteScope: scope });
  },

  setTocarJuntoIsMuted: (isMuted: boolean) => {
    set({ tocarJuntoIsMuted: isMuted });
  },

  setTocarJuntoTrack: (trackId: number | null, baseOnly?: boolean) => {
    if (trackId === null) {
      set({
        tocarJuntoActive: false,
        tocarJuntoTrackId: null,
      });
      return;
    }

    set((state) => ({
      tocarJuntoActive: true,
      tocarJuntoTrackId: trackId,
      isolateBaseOnly: baseOnly !== undefined ? baseOnly : state.isolateBaseOnly,
      activeAoVivoTrackId: trackId,
      tracksVersion: state.tracksVersion + 1,
    }));
  },

  setIsolateBaseOnly: (baseOnly: boolean) => {
    set((state) => ({
      isolateBaseOnly: baseOnly,
      tracksVersion: state.tracksVersion + 1,
    }));
  },

  resetFirstPassRegistry: () => {
    const current = get().firstPassRegistry;
    if (Object.keys(current).length > 0) {
      set({ firstPassRegistry: {} });
    }
  },

  markFirstPassConsumed: (key: string) => {
    const current = get().firstPassRegistry;
    if (current[key]) return; // Déjà marquée consommée
    set((state) => ({
      firstPassRegistry: {
        ...state.firstPassRegistry,
        [key]: true,
      },
    }));
  },
});
