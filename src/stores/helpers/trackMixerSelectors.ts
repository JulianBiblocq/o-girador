import { TrackGroup } from '../../types';
import { faderPositionToGain, gainToFaderPosition } from '../../utils/audioMath';
import { TrackMeta } from './trackMetaCache';
import { getAncestorChainBottomUp, getImmediateParentId } from './trackHierarchyParentResolver';
import { computeEffectiveMuteStatePro } from './trackSoloProHelpers';

export const getEffectiveMuteState = (tracks: any[], trackId: number | string): boolean => {
  return computeEffectiveMuteStatePro(tracks, trackId);
};

export const getEffectiveVolume = (tracks: any[], trackId: number | string): number => {
  const track = tracks.find(t => t && (t.id === trackId || String(t.id) === String(trackId)));
  if (!track) return 75;

  let effectiveGain = faderPositionToGain(track.volumeVal ?? 75);
  if (effectiveGain <= 0) return 0;

  const ancestors = getAncestorChainBottomUp(tracks, track.id);
  for (let i = 0; i < ancestors.length; i++) {
    effectiveGain *= faderPositionToGain(ancestors[i].volumeVal ?? 75);
    if (effectiveGain <= 0) return 0;
  }
  return gainToFaderPosition(effectiveGain);
};

export const getTrackFamilyIds = (
  trackId: string | number,
  tracks: (TrackMeta | TrackGroup)[]
): string[] => {
  const idStr = String(trackId);
  const currentTrack = tracks.find((t) => String(t.id) === idStr);
  if (!currentTrack) return [idStr];

  const familySet = new Set<string>([idStr]);
  const parentId = getImmediateParentId(currentTrack, tracks);
  const parentStr = parentId !== null ? String(parentId) : null;
  const parentLinkId = currentTrack.linkedToTrackId ? String(currentTrack.linkedToTrackId) : null;

  tracks.forEach((t) => {
    const tId = String(t.id);
    const tParent = getImmediateParentId(t, tracks);
    if (parentStr && (tId === parentStr || (tParent !== null && String(tParent) === parentStr))) {
      familySet.add(tId);
    }
    if (parentLinkId && (tId === parentLinkId || String(t.linkedToTrackId) === parentLinkId)) {
      familySet.add(tId);
    }
    if (String(t.linkedToTrackId) === idStr || (tParent !== null && String(tParent) === idStr)) {
      familySet.add(tId);
    }
  });

  return Array.from(familySet);
};
