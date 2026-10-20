import { pointerWithin } from '@dnd-kit/core';
import { TrackMeta, getTrackSolidBlockId } from '../../stores/useSequencerStore';

export function createMixerCollisionDetection(
  activeGroupTrackIdsRef: React.MutableRefObject<number[]>,
  tracksMeta: TrackMeta[],
  displayedTracks: TrackMeta[]
) {
  return (args: any) => {
    const collisions = pointerWithin(args);
    if (!collisions || collisions.length === 0) return [];
    const groupIds = activeGroupTrackIdsRef.current;
    const groupSet = new Set(groupIds.map(id => `track-${id}`));
    const externalCollisions = collisions.filter((c: any) => !groupSet.has(String(c.id)));
    if (externalCollisions.length === 0) return [];

    if (groupIds.length <= 1) return externalCollisions;

    const firstCollision = externalCollisions[0];
    const targetIdStr = String(firstCollision.id);
    if (targetIdStr.startsWith('track-')) {
      const targetTrackId = Number(targetIdStr.replace('track-', ''));
      const targetTrack = tracksMeta.find(t => t.id === targetTrackId);
      if (targetTrack) {
        const targetBlockId = getTrackSolidBlockId(targetTrack, tracksMeta);
        if (targetBlockId) {
          const headTrack = displayedTracks.find(t => getTrackSolidBlockId(t, tracksMeta) === targetBlockId);
          if (headTrack && headTrack.id !== targetTrackId) {
            return [{ id: `track-${headTrack.id}`, data: firstCollision.data }];
          }
        }
      }
    }
    return externalCollisions;
  };
}
