import type { TrackGroup } from '../../types';
import { instrumentsConfig } from '../../data';
import { resolveDefaultFocusTrackId } from '../../utils/focusTrackSelector';
import { setStoredLastFocusInstrument } from '../../utils/userPreferencesStorage';
import { applyFocusTracksVisibility } from './focusVisibilityHelpers';
import { syncAoVivoOnTrackSwitch } from '../../components/AoVivo/resolveAoVivoFamily';
import { resetLiveBalancoMorphToUnity } from '../../audio/groove/liveBalancoMorph';

let lastSyncedSongKey = '', lastSyncedToada = '', lastSyncedProfileKey = '';
let pendingUrlRole: string | null = typeof window !== 'undefined'
  ? (new URLSearchParams(window.location.search).get('role') || new URLSearchParams(window.location.search).get('targetTrack'))
  : null;

export function getPendingUrlRoleOverride(): string | null { return pendingUrlRole; }
export function setPendingUrlRoleOverride(role: string | null): void { pendingUrlRole = role; }

export const computeSongFocusKey = (toada: string, tracks: TrackGroup[]): string =>
  `${toada}|${tracks.map((t) => `${t.id}:${t.instrumentIdx}`).join(',')}`;

export function recordManualFocusChoice(trackId: number | null, s: { tracks: TrackGroup[]; metadata?: { toada?: string } }): string | undefined {
  pendingUrlRole = null;
  const trackObj = trackId !== null ? s.tracks.find((t) => t.id === trackId) : undefined;
  const instId = trackObj ? instrumentsConfig[trackObj.instrumentIdx]?.id : undefined;
  if (instId) setStoredLastFocusInstrument(instId);
  lastSyncedToada = s.metadata?.toada || '';
  lastSyncedSongKey = computeSongFocusKey(lastSyncedToada, s.tracks);
  return instId;
}

export function executeSyncFocusWithTracks(
  tracks: TrackGroup[],
  userProfile: any,
  get: () => any,
  set: (updater: (prev: any) => any) => void
): void {
  if (!tracks || tracks.length === 0) return;
  const s = get(), curToada = s.metadata?.toada || '', songKey = computeSongFocusKey(curToada, tracks);
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
      set((p: any) => ({ ...aoVivoPatch, referenceTrackId: validRefId, tracks: nextTracks, tracksVersion: p.tracksVersion + 1 }));
    }
  }
}
