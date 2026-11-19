import { StateCreator } from 'zustand';
import type { SequencerStore } from '../types/sequencerStoreTypes';
import { TrainingSlice, TrackGroup } from '../../types';
import { resolveDefaultFocusTrackId } from '../../utils/focusTrackSelector';
import { getStoredLastFocusInstrument, getStoredWorkingInstrument, setStoredLastFocusInstrument } from '../../utils/userPreferencesStorage';
import { applyFocusTracksVisibility, restoreUnfocusedTracksVisibility } from '../helpers/focusVisibilityHelpers';
import {
  executeSyncFocusWithTracks,
  getPendingUrlRoleOverride,
  recordManualFocusChoice,
  setPendingUrlRoleOverride,
} from '../helpers/trainingFocusSyncHelper';
import { syncAoVivoOnTrackSwitch } from '../../components/AoVivo/resolveAoVivoFamily';
import { setFocusBalancoDrawerOpen } from '../../audio/groove/liveBalancoMorph';

export { setPendingUrlRoleOverride };

const readInitialPreferred = (): string | null => {
  const s = getStoredWorkingInstrument();
  return s !== 'auto' ? s : getStoredLastFocusInstrument();
};

export const createTrainingSlice: StateCreator<SequencerStore, [], [], TrainingSlice> = (set, get) => ({
  tocarJuntoActive: false,
  tocarJuntoTrackId: null,
  tocarJuntoMuteScope: 'track',
  tocarJuntoIsMuted: false,
  isRestOfEnsembleMuted: false,
  isolateBaseOnly: false,
  firstPassRegistry: {},
  isFocusActive: false,
  focusTrackId: null,
  referenceTrackId: null,
  preferredInstrumentName: readInitialPreferred(),
  hasManualFocusSelection: false,

  setTocarJuntoMuteScope: (scope) => set({ tocarJuntoMuteScope: scope }),
  setTocarJuntoIsMuted: (isMuted) => set((s) => ({
    tocarJuntoIsMuted: isMuted,
    tocarJuntoActive: isMuted,
    tocarJuntoTrackId: isMuted ? (s.tocarJuntoTrackId ?? s.focusTrackId) : s.tocarJuntoTrackId,
  })),
  setIsRestOfEnsembleMuted: (isMuted) => set({ isRestOfEnsembleMuted: isMuted }),
  setTocarJuntoTrack: (trackId) => {
    if (trackId === null) { set({ tocarJuntoActive: false, tocarJuntoTrackId: null }); return; }
    set((s) => ({
      tocarJuntoActive: s.tocarJuntoIsMuted, tocarJuntoTrackId: trackId,
      isolateBaseOnly: false, activeAoVivoTrackId: trackId, tracksVersion: s.tracksVersion + 1,
    }));
  },
  setIsolateBaseOnly: () => set((s) => ({ isolateBaseOnly: false, tracksVersion: s.tracksVersion + 1 })),
  resetFirstPassRegistry: () => { if (Object.keys(get().firstPassRegistry).length > 0) set({ firstPassRegistry: {} }); },
  markFirstPassConsumed: (key) => { if (!get().firstPassRegistry[key]) set((s) => ({ firstPassRegistry: { ...s.firstPassRegistry, [key]: true } })); },

  setFocusTrackId: (trackId, preferredName, isManual = false) => set((s) => {
    const nextRefId = s.referenceTrackId === trackId ? null : s.referenceTrackId;
    const instId = isManual ? recordManualFocusChoice(trackId, s) : undefined;
    const updates: Record<string, any> = {
      focusTrackId: trackId, referenceTrackId: nextRefId, tocarJuntoTrackId: trackId, hasManualFocusSelection: isManual,
      preferredInstrumentName: preferredName !== undefined ? preferredName : (instId || s.preferredInstrumentName),
    };
    if (s.isFocusActive && trackId !== null) {
      updates.tracks = applyFocusTracksVisibility(s.tracks, trackId, nextRefId, s.rodaTrackOrder);
      updates.activeAoVivoTrackId = trackId;
      updates.tracksVersion = s.tracksVersion + 1;
    } else if (trackId !== null && s.activeAoVivoTrackId !== null) {
      Object.assign(updates, syncAoVivoOnTrackSwitch(trackId, s));
    }
    return updates;
  }),

  activateFocusOnTrack: (trackId) => set((s) => {
    const nextRefId = s.referenceTrackId === trackId ? null : s.referenceTrackId;
    const instId = recordManualFocusChoice(trackId, s);
    return {
      isFocusActive: true, focusTrackId: trackId, referenceTrackId: nextRefId,
      tocarJuntoTrackId: trackId, activeAoVivoTrackId: trackId, hasManualFocusSelection: true,
      preferredInstrumentName: instId || s.preferredInstrumentName,
      tracks: applyFocusTracksVisibility(s.tracks, trackId, nextRefId, s.rodaTrackOrder),
      tracksVersion: s.tracksVersion + 1,
    };
  }),

  setPreferredInstrumentName: (name, userProfile) => {
    const clean = name && name !== 'auto' ? name : null;
    if (clean) setStoredLastFocusInstrument(clean);
    set({ preferredInstrumentName: clean, hasManualFocusSelection: false });
    const s = get(), resolved = resolveDefaultFocusTrackId(s.tracks, userProfile, clean, getPendingUrlRoleOverride());
    if (resolved !== null) s.setFocusTrackId(resolved, clean ?? undefined, false);
  },

  setReferenceTrackId: (refTrackId) => set((s) => {
    const cleanRef = refTrackId !== null && refTrackId === s.focusTrackId ? null : refTrackId;
    if (!s.isFocusActive || s.focusTrackId === null) return { referenceTrackId: cleanRef };
    return { referenceTrackId: cleanRef, tracks: applyFocusTracksVisibility(s.tracks, s.focusTrackId, cleanRef, s.rodaTrackOrder), tracksVersion: s.tracksVersion + 1 };
  }),

  toggleFocusMode: (explicitTrackId) => {
    const s = get();
    const targetId = explicitTrackId ?? s.focusTrackId ?? resolveDefaultFocusTrackId(s.tracks, null, s.preferredInstrumentName, getPendingUrlRoleOverride());
    if (targetId === null) return;
    if (s.isFocusActive) {
      setFocusBalancoDrawerOpen(false);
      set((p) => ({ isFocusActive: false, referenceTrackId: null, activeAoVivoTrackId: null, tracks: restoreUnfocusedTracksVisibility(p.tracks, p.rodaTrackOrder), tracksVersion: p.tracksVersion + 1 }));
    } else {
      set((p) => ({ isFocusActive: true, focusTrackId: targetId, referenceTrackId: null, tocarJuntoTrackId: targetId, activeAoVivoTrackId: targetId, tracks: applyFocusTracksVisibility(p.tracks, targetId, null, p.rodaTrackOrder), tracksVersion: p.tracksVersion + 1 }));
    }
  },

  syncFocusWithTracks: (tracks: TrackGroup[], userProfile?: any) => {
    executeSyncFocusWithTracks(tracks, userProfile, get, set);
  },
});
