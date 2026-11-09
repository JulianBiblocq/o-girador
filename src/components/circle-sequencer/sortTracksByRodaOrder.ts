import { TrackGroup } from '../../types';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { isRodaDrawableTrack } from './circleGeometry';

export { isRodaDrawableTrack };

export const sortTracksByRodaOrder = (tracks: TrackGroup[], rodaTrackOrder: number[]): TrackGroup[] => {
  if (!rodaTrackOrder || rodaTrackOrder.length === 0) return tracks;

  const orderMap = new Map(rodaTrackOrder.map((id, index) => [id, index]));

  return [...tracks].sort((a, b) => {
    const idxA = orderMap.has(a.id) ? orderMap.get(a.id)! : 9999;
    const idxB = orderMap.has(b.id) ? orderMap.get(b.id)! : 9999;
    return idxA - idxB;
  });
};

/**
 * Quand 2 instruments sont visibles sur la Roda, place toujours l'instrument principal en Focus
 * à l'index 0 (anneau extérieur pos 3/4, t = 0.65) et le 2e instrument repère à l'index 1 (anneau intérieur pos 2/4, t = 0.35).
 */
export const orderActiveVisibleRodaTracks = (
  activeVisibleTracks: TrackGroup[],
  rawTracks?: TrackGroup[],
  explicitFocusTrackId?: number | null
): TrackGroup[] => {
  if (activeVisibleTracks.length !== 2) return activeVisibleTracks;

  const focusId = explicitFocusTrackId !== undefined
    ? explicitFocusTrackId
    : useSequencerStore.getState().focusTrackId;
  if (focusId === null || focusId === undefined) return activeVisibleTracks;

  const focusRaw = rawTracks?.find(t => t.id === focusId);
  const isTrackMatchingFocus = (t: TrackGroup): boolean => {
    if (t.id === focusId) return true;
    if (focusRaw?.linkedToTrackId && String(t.id) === String(focusRaw.linkedToTrackId)) return true;
    if (focusRaw?.busId && String(t.id) === String(focusRaw.busId)) return true;
    return false;
  };

  if (!isTrackMatchingFocus(activeVisibleTracks[0]) && isTrackMatchingFocus(activeVisibleTracks[1])) {
    return [activeVisibleTracks[1], activeVisibleTracks[0]];
  }
  return activeVisibleTracks;
};
