import { TrackGroup } from '../../types';
import { getTrackSolidBlockId } from './trackVisibilityHelpers';
import { applyRadii } from './trackRodaGeometryHelpers';

export const handleReorderWagonState = (
  state: { tracks: TrackGroup[]; rodaTrackOrder: number[]; tracksVersion: number; [key: string]: any },
  wagonTrackIds: number[],
  overTrackId: number
): Record<string, any> => {
  if (!wagonTrackIds || wagonTrackIds.length === 0 || wagonTrackIds.includes(overTrackId)) return {};

  const currentTracks = [...state.tracks];
  const wagonSet = new Set(wagonTrackIds);
  const wagonTracks = wagonTrackIds.map(id => currentTracks.find(t => t.id === id)).filter(Boolean) as TrackGroup[];
  if (wagonTracks.length === 0) return {};

  const remainingTracks = currentTracks.filter(t => !wagonSet.has(t.id));
  const overTrack = currentTracks.find(t => t.id === overTrackId);
  if (!overTrack) return {};

  const originalWagonHeadIdx = currentTracks.findIndex(t => t.id === wagonTrackIds[0]);
  const originalOverIdx = currentTracks.findIndex(t => t.id === overTrackId);
  const isMovingRight = originalWagonHeadIdx < originalOverIdx;

  const overBlockId = getTrackSolidBlockId(overTrack, currentTracks);
  let targetIndex = -1;

  if (overBlockId) {
    const targetGroupMembers = remainingTracks.filter(t => getTrackSolidBlockId(t, currentTracks) === overBlockId);
    if (targetGroupMembers.length > 0) {
      if (isMovingRight) {
        const lastMember = targetGroupMembers[targetGroupMembers.length - 1];
        targetIndex = remainingTracks.findIndex(t => t.id === lastMember.id) + 1;
      } else {
        const firstMember = targetGroupMembers[0];
        targetIndex = remainingTracks.findIndex(t => t.id === firstMember.id);
      }
    }
  }

  if (targetIndex === -1) {
    const idxInRemaining = remainingTracks.findIndex(t => t.id === overTrackId);
    targetIndex = idxInRemaining !== -1 ? (isMovingRight ? idxInRemaining + 1 : idxInRemaining) : (isMovingRight ? remainingTracks.length : 0);
  }

  targetIndex = Math.max(0, Math.min(remainingTracks.length, targetIndex));
  const newTracks = [
    ...remainingTracks.slice(0, targetIndex),
    ...wagonTracks,
    ...remainingTracks.slice(targetIndex)
  ];

  return {
    tracks: applyRadii(newTracks, state.rodaTrackOrder),
    tracksVersion: state.tracksVersion + 1
  };
};
