import { StateCreator } from 'zustand';
import type { SequencerStore } from '../types/sequencerStoreTypes';
import { TrainingSlice, TrackGroup } from '../../types';
import { instrumentsConfig } from '../../data';
import { resolveDefaultFocusTrackId } from '../../utils/focusTrackSelector';
import { getStoredLastFocusInstrument, getStoredWorkingInstrument, setStoredLastFocusInstrument } from '../../utils/userPreferencesStorage';
import { applyFocusTracksVisibility, restoreUnfocusedTracksVisibility } from '../helpers/focusVisibilityHelpers';
import { syncAoVivoOnTrackSwitch } from '../../components/AoVivo/resolveAoVivoFamily';
import { setFocusBalancoDrawerOpen, resetLiveBalancoMorphToUnity } from '../../audio/groove/liveBalancoMorph';

let lastSyncedSongKey = '', lastSyncedToada = '', lastSyncedProfileKey = '';
let pendingUrlRole: string | null = typeof window !== 'undefined'
  ? (new URLSearchParams(window.location.search).get('role') || new URLSearchParams(window.location.search).get('targetTrack'))
  : null;

export function setPendingUrlRoleOverride(role: string | null): void { pendingUrlRole = role; }

const readInitialPreferred = (): string | null => {
  const s = getStoredWorkingInstrument();
  return s !== 'auto' ? s : getStoredLastFocusInstrument();
};
const computeSongKey = (toada: string, tracks: TrackGroup[]): string =>
  `${toada}|${tracks.map((t) => `${t.id}:${t.instrumentIdx}`).join(',')}`;

function recordManualChoice(trackId: number | null, s: { tracks: TrackGroup[]; metadata?: { toada?: string } }): string | undefined {
  pendingUrlRole = null;
  const trackObj = trackId !== null ? s.tracks.find((t) => t.id === trackId) : undefined;
  const instId = trackObj ? instrumentsConfig[trackObj.instrumentIdx]?.id : undefined;
  if (instId) setStoredLastFocusInstrument(instId);
  lastSyncedToada = s.metadata?.toada || '';
  lastSyncedSongKey = computeSongKey(lastSyncedToada, s.tracks);
  return instId;
}

export const createTrainingSlice: StateCreator<SequencerStore, [], [], TrainingSlice> = (set, get) => ({
  tocarJuntoActive: false, tocarJuntoTrackId: null, tocarJuntoMuteScope: 'track',
  tocarJuntoIsMuted: false, isolateBaseOnly: false, firstPassRegistry: {},
  isFocusActive: false, focusTrackId: null, referenceTrackId: null,
  preferredInstrumentName: readInitialPreferred(), hasManualFocusSelection: false,

  setTocarJuntoMuteScope: (scope) => set({ tocarJuntoMuteScope: scope }),
  setTocarJuntoIsMuted: (isMuted) => set((s) => ({
    tocarJuntoIsMuted: isMuted, tocarJuntoActive: isMuted,
    tocarJuntoTrackId: isMuted ? (s.tocarJuntoTrackId ?? s.focusTrackId) : s.tocarJuntoTrackId,
  })),
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
    const instId = isManual ? recordManualChoice(trackId, s) : undefined;
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
    const instId = recordManualChoice(trackId, s);
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
    const s = get(), resolved = resolveDefaultFocusTrackId(s.tracks, userProfile, clean, pendingUrlRole);
    if (resolved !== null) s.setFocusTrackId(resolved, clean ?? undefined, false);
  },

  setReferenceTrackId: (refTrackId) => set((s) => {
    const cleanRef = refTrackId !== null && refTrackId === s.focusTrackId ? null : refTrackId;
    if (!s.isFocusActive || s.focusTrackId === null) return { referenceTrackId: cleanRef };
    return { referenceTrackId: cleanRef, tracks: applyFocusTracksVisibility(s.tracks, s.focusTrackId, cleanRef, s.rodaTrackOrder), tracksVersion: s.tracksVersion + 1 };
  }),

  toggleFocusMode: (explicitTrackId) => {
    const s = get();
    const targetId = explicitTrackId ?? s.focusTrackId ?? resolveDefaultFocusTrackId(s.tracks, null, s.preferredInstrumentName, pendingUrlRole);
    if (targetId === null) return;
    if (s.isFocusActive) {
      setFocusBalancoDrawerOpen(false);
      set((p) => ({ isFocusActive: false, referenceTrackId: null, activeAoVivoTrackId: null, tracks: restoreUnfocusedTracksVisibility(p.tracks, p.rodaTrackOrder), tracksVersion: p.tracksVersion + 1 }));
    } else {
      set((p) => ({ isFocusActive: true, focusTrackId: targetId, referenceTrackId: null, tocarJuntoTrackId: targetId, activeAoVivoTrackId: targetId, tracks: applyFocusTracksVisibility(p.tracks, targetId, null, p.rodaTrackOrder), tracksVersion: p.tracksVersion + 1 }));
    }
  },

  syncFocusWithTracks: (tracks: TrackGroup[], userProfile?: any) => {
    if (!tracks || tracks.length === 0) return;
    const s = get(), curToada = s.metadata?.toada || '', songKey = computeSongKey(curToada, tracks);
    const profileKey = `${userProfile?.uid || ''}|${userProfile?.instrument || ''}|${userProfile?.preferredInstrument || ''}`;
    const currentId = s.focusTrackId, exists = currentId !== null && tracks.some((t) => t.id === currentId);
    const isSameManualSong = s.hasManualFocusSelection && exists && Boolean(lastSyncedSongKey) && (curToada ? curToada === lastSyncedToada : songKey === lastSyncedSongKey);
    const songChanged = !isSameManualSong && songKey !== lastSyncedSongKey, profileChanged = profileKey !== lastSyncedProfileKey;
    lastSyncedSongKey = songKey; lastSyncedToada = curToada; lastSyncedProfileKey = profileKey;
    if (songChanged) resetLiveBalancoMorphToUnity();
    if (!exists || songChanged || (profileChanged && !s.hasManualFocusSelection)) {
      const resolved = resolveDefaultFocusTrackId(tracks, userProfile, s.preferredInstrumentName, pendingUrlRole);
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
