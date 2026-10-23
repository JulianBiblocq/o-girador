import { TrackGroup } from '../../types';
import { instrumentsConfig } from '../../data';
import { faderPositionToGain, gainToFaderPosition } from '../../utils/audioMath';
import { TrackMeta } from './trackMetaCache';

const isAnyParentMatching = (tracks: any[], currentTrack: any, predicate: (parent: any) => boolean): boolean => {
  let current: any = currentTrack;
  const visited = new Set<string>();
  while (current) {
    if (visited.has(String(current.id))) break;
    visited.add(String(current.id));
    const parentId: string | number | undefined = current.busId || current.linkedToTrackId;
    if (!parentId) break;
    const parent: any = tracks.find(t => String(t.id) === String(parentId));
    if (parent) {
      if (predicate(parent)) return true;
      current = parent;
    } else {
      break;
    }
  }
  return false;
};

const isAnyDescendantSolo = (tracks: any[], currentTrack: TrackGroup): boolean => {
  const visited = new Set<string>();
  const check = (node: TrackGroup): boolean => {
    if (visited.has(String(node.id))) return false;
    visited.add(String(node.id));
    const children = tracks.filter(t => 
      (t.busId && String(t.busId) === String(node.id)) || 
      (t.linkedToTrackId && String(t.linkedToTrackId) === String(node.id))
    );
    for (const child of children) {
      if (child.isSolo) return true;
      if (check(child)) return true;
    }
    return false;
  };
  return check(currentTrack);
};

export const getEffectiveMuteState = (tracks: any[], trackId: number | string): boolean => {
  const track = tracks.find(t => t.id === trackId || String(t.id) === String(trackId));
  if (!track) return true;

  const hasAnySolo = tracks.some(t => t.isSolo);

  // 1. Recursive Solo check
  let isAllowedToPlayBySolo = true;
  if (hasAnySolo) {
    const isParentBusSolo = Boolean(track.busId && tracks.some(t => String(t.id) === String(track.busId) && t.isSolo));
    const isSelfSolo = track.isSolo === true;
    isAllowedToPlayBySolo = isSelfSolo || isParentBusSolo || isAnyParentMatching(tracks, track, p => p.isSolo) || isAnyDescendantSolo(tracks, track);
  }

  // 2. Recursive Mute check
  const isSelfMuted = track.isMute === true;
  const isParentMuted = isAnyParentMatching(tracks, track, p => p.isMute);

  return !isAllowedToPlayBySolo || isSelfMuted || isParentMuted;
};

export const getEffectiveVolume = (tracks: any[], trackId: number | string): number => {
  const track = tracks.find(t => t.id === trackId || String(t.id) === String(trackId));
  if (!track) return 75;
  
  let effectiveGain = faderPositionToGain(track.volumeVal ?? 75);
  let current: any = track;
  const visited = new Set<string>();
  while (current) {
    if (visited.has(String(current.id))) break;
    visited.add(String(current.id));
    const parentId: string | number | undefined = current.busId || current.linkedToTrackId;
    if (!parentId) break;
    const parent: any = tracks.find(t => String(t.id) === String(parentId));
    if (parent) {
      effectiveGain *= faderPositionToGain(parent.volumeVal ?? 75);
      current = parent;
    } else {
      break;
    }
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
  const busId = currentTrack.busId ? String(currentTrack.busId) : null;
  const parentLinkId = currentTrack.linkedToTrackId ? String(currentTrack.linkedToTrackId) : null;

  tracks.forEach((t) => {
    const tId = String(t.id);
    if (busId && String(t.busId) === busId) familySet.add(tId);
    if (parentLinkId && (tId === parentLinkId || String(t.linkedToTrackId) === parentLinkId)) familySet.add(tId);
    if (String(t.linkedToTrackId) === idStr) familySet.add(tId);
  });

  return Array.from(familySet);
};
