import { StateCreator } from 'zustand';
import type { SequencerStore } from '../types/sequencerStoreTypes';
import { TrainingSlice, TrackGroup } from '../../types';
import { resolveDefaultFocusTrackId } from '../../utils/focusTrackSelector';
import { applyFocusTracksVisibility, restoreUnfocusedTracksVisibility } from '../helpers/focusVisibilityHelpers';

export const createTrainingSlice: StateCreator<SequencerStore, [], [], TrainingSlice> = (set, get) => ({
  tocarJuntoActive: false,
  tocarJuntoTrackId: null,
  tocarJuntoMuteScope: 'track',
  tocarJuntoIsMuted: true,
  isolateBaseOnly: true,
  firstPassRegistry: {},
  isFocusActive: false,
  focusTrackId: null,
  referenceTrackId: null,
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
      set({ tocarJuntoActive: false, tocarJuntoTrackId: null });
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
    set((state) => ({ isolateBaseOnly: baseOnly, tracksVersion: state.tracksVersion + 1 }));
  },

  resetFirstPassRegistry: () => {
    if (Object.keys(get().firstPassRegistry).length > 0) set({ firstPassRegistry: {} });
  },

  markFirstPassConsumed: (key: string) => {
    if (get().firstPassRegistry[key]) return;
    set((state) => ({ firstPassRegistry: { ...state.firstPassRegistry, [key]: true } }));
  },

  setFocusTrackId: (trackId: number | null, preferredName?: string) => {
    set((state) => {
      const nextRefId = state.referenceTrackId === trackId ? null : state.referenceTrackId;
      const updates: Record<string, any> = {
        focusTrackId: trackId,
        referenceTrackId: nextRefId,
        tocarJuntoTrackId: trackId,
      };
      if (preferredName !== undefined) updates.preferredInstrumentName = preferredName;
      if (state.isFocusActive && trackId !== null) {
        updates.tracks = applyFocusTracksVisibility(state.tracks, trackId, nextRefId, state.rodaTrackOrder);
        updates.activeAoVivoTrackId = trackId;
        updates.tracksVersion = state.tracksVersion + 1;
      }
      return updates;
    });
  },

  setReferenceTrackId: (refTrackId: number | null) => {
    set((state) => {
      const cleanRef = refTrackId !== null && refTrackId === state.focusTrackId ? null : refTrackId;
      if (!state.isFocusActive || state.focusTrackId === null) {
        return { referenceTrackId: cleanRef };
      }
      return {
        referenceTrackId: cleanRef,
        tracks: applyFocusTracksVisibility(state.tracks, state.focusTrackId, cleanRef, state.rodaTrackOrder),
        tracksVersion: state.tracksVersion + 1,
      };
    });
  },

  toggleFocusMode: (explicitTrackId?: number) => {
    const state = get();
    const targetId = explicitTrackId ?? state.focusTrackId ?? resolveDefaultFocusTrackId(state.tracks);
    if (targetId === null) return;

    if (state.isFocusActive) {
      set((prev) => ({
        isFocusActive: false,
        referenceTrackId: null,
        tracks: restoreUnfocusedTracksVisibility(prev.tracks, prev.rodaTrackOrder),
        activeAoVivoTrackId: null,
        tracksVersion: prev.tracksVersion + 1,
      }));
    } else {
      set((prev) => ({
        isFocusActive: true,
        focusTrackId: targetId,
        referenceTrackId: null,
        tocarJuntoTrackId: targetId,
        tracks: applyFocusTracksVisibility(prev.tracks, targetId, null, prev.rodaTrackOrder),
        activeAoVivoTrackId: targetId,
        tracksVersion: prev.tracksVersion + 1,
      }));
    }
  },

  syncFocusWithTracks: (tracks: TrackGroup[], userProfile?: any) => {
    if (!tracks || tracks.length === 0) return;
    const state = get();
    const currentId = state.focusTrackId;
    const exists = currentId !== null && tracks.some((t) => t.id === currentId);
    const refExists = state.referenceTrackId !== null && tracks.some((t) => t.id === state.referenceTrackId);
    const validRefId = refExists && state.referenceTrackId !== currentId ? state.referenceTrackId : null;

    if (!exists) {
      const resolved = resolveDefaultFocusTrackId(tracks, userProfile, state.preferredInstrumentName);
      if (resolved !== null) state.setFocusTrackId(resolved);
      return;
    }
    if (state.isFocusActive && currentId !== null) {
      const nextTracks = applyFocusTracksVisibility(tracks, currentId, validRefId, state.rodaTrackOrder);
      if (validRefId !== state.referenceTrackId || nextTracks.some((t, i) => t.isHidden !== tracks[i]?.isHidden)) {
        set((prev) => ({ referenceTrackId: validRefId, tracks: nextTracks, tracksVersion: prev.tracksVersion + 1 }));
      }
    }
  },
});
