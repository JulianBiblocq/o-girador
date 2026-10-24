import { TrackGroup } from '../../types';
import { sanitizeRodaTrackOrder, applyRadii } from './trackRodaGeometryHelpers';
import { isLinearDAWVisibleTrack } from './trackVisibilityHelpers';

export const handleReverseRodaTracksState = (
  state: { tracks: TrackGroup[]; rodaTrackOrder: number[]; tracksVersion: number; [key: string]: any }
): Record<string, any> => {
  const currentOrder = sanitizeRodaTrackOrder(state.rodaTrackOrder, state.tracks);
  const visibleTracks = state.tracks.filter(t => isLinearDAWVisibleTrack(t, state.tracks));
  const orderMap = new Map(currentOrder.map((id, index) => [id, index]));
  const visibleIds = visibleTracks
    .map(t => t.id)
    .sort((a, b) => (orderMap.get(a) ?? 9999) - (orderMap.get(b) ?? 9999));

  const reversedVisibleIds = [...visibleIds].reverse();
  let revIdx = 0;
  const nextOrder = currentOrder.map(id => {
    if (visibleIds.includes(id)) {
      return reversedVisibleIds[revIdx++];
    }
    return id;
  });

  return {
    rodaTrackOrder: nextOrder,
    tracks: applyRadii(state.tracks, nextOrder),
    tracksVersion: state.tracksVersion + 1
  };
};
