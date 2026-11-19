import { instrumentsConfig } from '../data';
import { getTrackFamilyIds } from '../stores/helpers/trackMixerSelectors';
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

  if (state.tocarJuntoActive && state.tocarJuntoIsMuted !== false && state.tocarJuntoTrackId !== null && state.tocarJuntoTrackId !== undefined) {
    if (state.tocarJuntoMuteScope === 'family') {
      if (cachedFamilySet) {
        if (cachedFamilySet.size === 0) {
          getTrackFamilyIds(state.tocarJuntoTrackId, tracks as TrackGroup[]).forEach((id) => cachedFamilySet.add(String(id)));
        }
        if (cachedFamilySet.has(String(numId))) return true;
      } else {
        const famIds = getTrackFamilyIds(state.tocarJuntoTrackId, tracks as TrackGroup[]);
        if (famIds.some((id) => String(id) === String(numId))) return true;
      }
    } else if (Number(state.tocarJuntoTrackId) === numId) {
      return true;
    }
  }

  if (state.mobileViewMode === 'percussion' && state.isRestOfEnsembleMuted) {
    const track = tracks.find((t) => Number(t.id) === numId);
    if (!track || track.isBusFolder || track.isLinkFolder) return false;

    const effectiveFocusId =
      state.focusTrackId ??
      getPlayableFocusTracks(tracks as TrackGroup[])[0]?.id ??
      tracks[0]?.id ??
      null;

    if (effectiveFocusId !== null && Number(effectiveFocusId) === numId) return false;
    if (state.referenceTrackId !== null && state.referenceTrackId !== undefined && Number(state.referenceTrackId) === numId) {
      return false;
    }

    const inst = instrumentsConfig[track.instrumentIdx];
    const isVocal = Boolean(inst && (inst.type === 'voice' || inst.id === 'puxador' || inst.id === 'coro' || inst.id === 'toada'));
    if (isVocal && state.isLetraActive) return false;

    return true;
  }

  return false;
}
