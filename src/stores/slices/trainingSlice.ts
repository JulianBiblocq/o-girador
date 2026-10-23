
import { StateCreator } from 'zustand';
import type { SequencerStore } from '../types/sequencerStoreTypes';
import { TrainingSlice, TrackGroup } from '../../types';
import { resolveDefaultFocusTrackId } from '../../utils/focusTrackSelector';

export const createTrainingSlice: StateCreator<SequencerStore, [], [], TrainingSlice> = (set, get) => ({
  tocarJuntoActive: false,
  tocarJuntoTrackId: null,
  tocarJuntoMuteScope: 'track',
  tocarJuntoIsMuted: true,
  isolateBaseOnly: true,
  firstPassRegistry: {},
  isFocusActive: false,
  focusTrackId: null,
  preferredInstrumentName: null,

  setTocarJuntoMuteScope: (scope: 'track' | 'family') => {
    set({ tocarJuntoMuteScope: scope });
  },

  setTocarJuntoIsMuted: (isMuted: boolean) => {
    set((state) => ({
      tocarJuntoIsMuted: isMuted,
      tocarJuntoActive: isMuted,
      tocarJuntoTrackId: isMuted ? (state.tocarJuntoTrackId ?? state.focusTrackId) : state.tocarJuntoTrackId,
    }));
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
    if (current[key]) return;
    set((state) => ({
      firstPassRegistry: {
        ...state.firstPassRegistry,
        [key]: true,
      },
    }));
  },

  setFocusTrackId: (trackId: number | null, preferredName?: string) => {
    set((state) => {
      const updates: Partial<TrainingSlice> & { tracks?: TrackGroup[]; activeAoVivoTrackId?: number | null; tracksVersion?: number } = {
        focusTrackId: trackId,
        tocarJuntoTrackId: trackId,
      };
      if (preferredName !== undefined) {
        updates.preferredInstrumentName = preferredName;
      }
      if (state.isFocusActive && trackId !== null) {
        updates.tracks = state.tracks.map((t) => ({ ...t, isHidden: t.id !== trackId }));
        updates.activeAoVivoTrackId = trackId;
        updates.tracksVersion = state.tracksVersion + 1;
      }
      return updates as any;
    });
  },

  toggleFocusMode: (explicitTrackId?: number) => {
    const state = get();
    const targetId = explicitTrackId ?? state.focusTrackId ?? resolveDefaultFocusTrackId(state.tracks);
    if (targetId === null) return;

    if (state.isFocusActive) {
      // Deactivating Focus: restore nominal visibility (masters visible, linked slaves hidden)
      set((prev) => ({
        isFocusActive: false,
        tracks: prev.tracks.map((t) => {
          const isLinkedSlave = Boolean(t.linkedToTrackId && !t.isLinkFolder && !t.isLinkMaster);
          return { ...t, isHidden: isLinkedSlave };
        }),
        activeAoVivoTrackId: null,
        tracksVersion: prev.tracksVersion + 1,
      }));
    } else {
      // Activating Focus: hide others, keep only target visible
      set((prev) => ({
        isFocusActive: true,
        focusTrackId: targetId,
        tocarJuntoTrackId: targetId,
        tracks: prev.tracks.map((t) => ({ ...t, isHidden: t.id !== targetId })),
        activeAoVivoTrackId: targetId,
        tracksVersion: prev.tracksVersion + 1,
      }));
    }
  },

  syncFocusWithTracks: (tracks: TrackGroup[], userProfile?: any) => {
    const state = get();
    const currentId = state.focusTrackId;
    const exists = currentId !== null && tracks.some((t) => t.id === currentId);
    if (!exists) {
      const resolved = resolveDefaultFocusTrackId(tracks, userProfile, state.preferredInstrumentName);
      if (resolved !== null) {
        state.setFocusTrackId(resolved);
      }
    }
  },
});
