import { StateCreator } from 'zustand';
import type { SequencerStore } from '../types/sequencerStoreTypes';
import { TrainingSlice, TrackGroup } from '../../types';
import { resolveDefaultFocusTrackId } from '../../utils/focusTrackSelector';
import { getStoredWorkingInstrument } from '../../utils/userPreferencesStorage';
import { applyFocusTracksVisibility, restoreUnfocusedTracksVisibility } from '../helpers/focusVisibilityHelpers';
import { syncAoVivoOnTrackSwitch } from '../../components/AoVivo/resolveAoVivoFamily';

let lastSyncedSongKey = '';
let lastSyncedProfileKey = '';

const readInitialPreferred = (): string | null => {
  const s = getStoredWorkingInstrument();
  return s !== 'auto' ? s : null;
};

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
  preferredInstrumentName: readInitialPreferred(),
  hasManualFocusSelection: false,

  setTocarJuntoMuteScope: (scope) => set({ tocarJuntoMuteScope: scope }),
  setTocarJuntoIsMuted: (isMuted) =>
    set((s) => ({
      tocarJuntoIsMuted: isMuted,
      tocarJuntoActive: isMuted,
      tocarJuntoTrackId: isMuted ? (s.tocarJuntoTrackId ?? s.focusTrackId) : s.tocarJuntoTrackId,
    })),

  setTocarJuntoTrack: (trackId, baseOnly) => {
    if (trackId === null) { set({ tocarJuntoActive: false, tocarJuntoTrackId: null }); return; }
    set((s) => ({
      tocarJuntoActive: true, tocarJuntoTrackId: trackId,
      isolateBaseOnly: baseOnly !== undefined ? baseOnly : s.isolateBaseOnly,
      activeAoVivoTrackId: trackId, tracksVersion: s.tracksVersion + 1,
    }));
  },

  setIsolateBaseOnly: (baseOnly) => set((s) => ({ isolateBaseOnly: baseOnly, tracksVersion: s.tracksVersion + 1 })),
  resetFirstPassRegistry: () => { if (Object.keys(get().firstPassRegistry).length > 0) set({ firstPassRegistry: {} }); },
  markFirstPassConsumed: (key) => { if (!get().firstPassRegistry[key]) set((s) => ({ firstPassRegistry: { ...s.firstPassRegistry, [key]: true } })); },

  setFocusTrackId: (trackId, preferredName, isManual = false) =>
    set((s) => {
      const nextRefId = s.referenceTrackId === trackId ? null : s.referenceTrackId;
      const updates: Record<string, any> = {
        focusTrackId: trackId, referenceTrackId: nextRefId, tocarJuntoTrackId: trackId, hasManualFocusSelection: isManual,
      };
      if (preferredName !== undefined) updates.preferredInstrumentName = preferredName;
      if (s.isFocusActive && trackId !== null) {
        updates.tracks = applyFocusTracksVisibility(s.tracks, trackId, nextRefId, s.rodaTrackOrder);
        updates.activeAoVivoTrackId = trackId;
        updates.tracksVersion = s.tracksVersion + 1;
      } else if (trackId !== null && s.activeAoVivoTrackId !== null) {
        Object.assign(updates, syncAoVivoOnTrackSwitch(trackId, s));
      }
      return updates;
    }),

  setPreferredInstrumentName: (name, userProfile) => {
    const clean = name && name !== 'auto' ? name : null;
    set({ preferredInstrumentName: clean, hasManualFocusSelection: false });
    const s = get();
    const resolved = resolveDefaultFocusTrackId(s.tracks, userProfile, clean);
    if (resolved !== null) s.setFocusTrackId(resolved, clean ?? undefined, false);
  },

  setReferenceTrackId: (refTrackId) =>
    set((s) => {
      const cleanRef = refTrackId !== null && refTrackId === s.focusTrackId ? null : refTrackId;
      if (!s.isFocusActive || s.focusTrackId === null) return { referenceTrackId: cleanRef };
      return {
        referenceTrackId: cleanRef,
        tracks: applyFocusTracksVisibility(s.tracks, s.focusTrackId, cleanRef, s.rodaTrackOrder),
        tracksVersion: s.tracksVersion + 1,
      };
    }),

  toggleFocusMode: (explicitTrackId) => {
    const s = get();
    const targetId = explicitTrackId ?? s.focusTrackId ?? resolveDefaultFocusTrackId(s.tracks, null, s.preferredInstrumentName);
    if (targetId === null) return;
    if (s.isFocusActive) {
      set((p) => ({
        isFocusActive: false, referenceTrackId: null, activeAoVivoTrackId: null,
        tracks: restoreUnfocusedTracksVisibility(p.tracks, p.rodaTrackOrder), tracksVersion: p.tracksVersion + 1,
      }));
    } else {
      set((p) => ({
        isFocusActive: true, focusTrackId: targetId, referenceTrackId: null, tocarJuntoTrackId: targetId,
        activeAoVivoTrackId: targetId, tracks: applyFocusTracksVisibility(p.tracks, targetId, null, p.rodaTrackOrder),
        tracksVersion: p.tracksVersion + 1,
      }));
    }
  },

  syncFocusWithTracks: (tracks: TrackGroup[], userProfile?: any) => {
    if (!tracks || tracks.length === 0) return;
    const s = get();
    const songKey = `${s.metadata?.toada || ''}|${tracks.map((t) => `${t.id}:${t.instrumentIdx}`).join(',')}`;
    const profileKey = `${userProfile?.uid || ''}|${userProfile?.instrument || ''}|${userProfile?.preferredInstrument || ''}|${s.preferredInstrumentName || ''}`;
    const songChanged = songKey !== lastSyncedSongKey, profileChanged = profileKey !== lastSyncedProfileKey;
    lastSyncedSongKey = songKey; lastSyncedProfileKey = profileKey;

    const currentId = s.focusTrackId;
    const exists = currentId !== null && tracks.some((t) => t.id === currentId);
    if (!exists || songChanged || (profileChanged && !s.hasManualFocusSelection)) {
      const resolved = resolveDefaultFocusTrackId(tracks, userProfile, s.preferredInstrumentName);
      if (resolved !== null) s.setFocusTrackId(resolved, undefined, false);
      return;
    }
    const validRefId = s.referenceTrackId !== null && s.referenceTrackId !== currentId && tracks.some((t) => t.id === s.referenceTrackId) ? s.referenceTrackId : null;
    if (s.isFocusActive && currentId !== null) {
      const nextTracks = applyFocusTracksVisibility(tracks, currentId, validRefId, s.rodaTrackOrder);
      const aoVivoPatch = s.activeAoVivoTrackId !== null && s.activeAoVivoTrackId !== currentId ? syncAoVivoOnTrackSwitch(currentId, { activeAoVivoTrackId: s.activeAoVivoTrackId, tracks }) : {};
      if (validRefId !== s.referenceTrackId || Object.keys(aoVivoPatch).length > 0 || nextTracks.some((t, i) => t.isHidden !== tracks[i]?.isHidden)) {
        set((p) => ({ ...aoVivoPatch, referenceTrackId: validRefId, tracks: nextTracks, tracksVersion: p.tracksVersion + 1 }));
      }
    }
  },
});
