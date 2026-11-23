import { instrumentsConfig } from '../data';
import { getTrackFamilyIds } from '../stores/helpers/trackMixerSelectors';
import { computeEffectiveMuteStatePro } from '../stores/helpers/trackSoloProHelpers';
import type { TrackGroup } from '../types';
import { getPlayableFocusTracks } from './focusTrackSelector';

export interface PracticeMuteStateLike {
  mobileViewMode?: string;
  tocarJuntoActive?: boolean;
  tocarJuntoIsMuted?: boolean;
  tocarJuntoTrackId?: number | null;
  tocarJuntoMuteScope?: 'track' | 'family';
  isRestOfEnsembleMuted?: boolean;
  focusTrackId?: number | null;
  referenceTrackId?: number | null;
  isLetraActive?: boolean;
}

function isVocalTrack(track: TrackGroup): boolean {
  const inst = instrumentsConfig[track.instrumentIdx];
  return Boolean(inst && (inst.type === 'voice' || inst.id === 'puxador' || inst.id === 'coro' || inst.id === 'toada'));
}

function isTargetMutedByTocarJunto(
  numId: number,
  tracks: readonly TrackGroup[],
  state: PracticeMuteStateLike,
  cachedFamilySet?: Set<string> | null
): boolean {
  if (!state.tocarJuntoActive || state.tocarJuntoIsMuted === false || state.tocarJuntoTrackId == null) {
    return false;
  }
  if (state.tocarJuntoMuteScope === 'family') {
    if (cachedFamilySet) {
      if (cachedFamilySet.size === 0) {
        getTrackFamilyIds(state.tocarJuntoTrackId, tracks as TrackGroup[]).forEach((id) => cachedFamilySet.add(String(id)));
      }
      return cachedFamilySet.has(String(numId));
    }
    return getTrackFamilyIds(state.tocarJuntoTrackId, tracks as TrackGroup[]).some((id) => String(id) === String(numId));
  }
  return Number(state.tocarJuntoTrackId) === numId;
}

export function isTrackMutedByPracticeMode(
  trackId: number | string,
  tracks: readonly TrackGroup[],
  state: PracticeMuteStateLike | null | undefined,
  cachedFamilySet?: Set<string> | null
): boolean {
  if (!state || state.mobileViewMode === 'danse' || state.mobileViewMode === 'editeur') {
    return false;
  }
  const numId = Number(trackId);
  if (!Number.isFinite(numId)) return false;

  const isRestMutedMode = state.mobileViewMode === 'percussion' && Boolean(state.isRestOfEnsembleMuted);
  const effectiveFocusId = isRestMutedMode
    ? (state.focusTrackId ?? getPlayableFocusTracks(tracks as TrackGroup[])[0]?.id ?? tracks[0]?.id ?? null)
    : null;

  if (isTargetMutedByTocarJunto(numId, tracks, state, cachedFamilySet)) {
    if (isRestMutedMode && effectiveFocusId !== null && Number(effectiveFocusId) === numId) {
      const hasOtherAudibleUnderRestMute = tracks.some((t) => {
        if (!t || t.isBusFolder || t.isLinkFolder || Number(t.id) === numId) return false;
        if (computeEffectiveMuteStatePro(tracks, t.id)) return false;
        if (isTargetMutedByTocarJunto(Number(t.id), tracks, state, cachedFamilySet)) return false;
        if (state.referenceTrackId != null && Number(state.referenceTrackId) === Number(t.id)) return true;
        return Boolean(state.isLetraActive && isVocalTrack(t));
      });
      if (!hasOtherAudibleUnderRestMute) return false;
    }
    return true;
  }

  if (isRestMutedMode) {
    const track = tracks.find((t) => Number(t.id) === numId);
    if (!track || track.isBusFolder || track.isLinkFolder) return false;
    if (effectiveFocusId !== null && Number(effectiveFocusId) === numId) return false;
    if (state.referenceTrackId != null && Number(state.referenceTrackId) === numId) return false;
    if (state.isLetraActive && isVocalTrack(track)) return false;
    return true;
  }

  return false;
}
