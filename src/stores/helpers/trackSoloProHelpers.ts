import { TrackGroup } from '../../types';
import {
  getAllDescendantIds,
  getAncestorChainBottomUp,
  getDirectChildren,
  isBusOrLinkContainer,
} from './trackHierarchyParentResolver';

export function reconcileAncestorsSoloBottomUp<T extends { id: number | string; isSolo?: boolean; isMute?: boolean }>(
  tracks: T[],
  startTrackId: number | string
): T[] {
  let nextTracks = tracks;
  const ancestors = getAncestorChainBottomUp(nextTracks, startTrackId);

  for (let i = 0; i < ancestors.length; i++) {
    const ancIdStr = String(ancestors[i].id);
    const directChildren = getDirectChildren(nextTracks, ancestors[i].id);
    if (directChildren.length === 0) continue;

    const allChildrenSolo = directChildren.every((child) => child.isSolo === true);
    nextTracks = nextTracks.map((t) => {
      if (String(t.id) !== ancIdStr) return t;
      if (Boolean(t.isSolo) === allChildrenSolo && (!allChildrenSolo || !t.isMute)) return t;
      return allChildrenSolo
        ? { ...t, isSolo: true, isMute: false }
        : { ...t, isSolo: false };
    });
  }

  return nextTracks;
}

export function toggleTrackSoloStudioPro<T extends TrackGroup>(
  tracks: T[],
  targetId: number | string
): T[] {
  const targetStr = String(targetId);
  const target = tracks.find((t) => String(t.id) === targetStr);
  if (!target) return tracks;

  const nextSolo = !Boolean(target.isSolo);

  if (isBusOrLinkContainer(target)) {
    const descendantIds = getAllDescendantIds(tracks, target.id);
    const cascaded = tracks.map((t) => {
      const idStr = String(t.id);
      if (idStr !== targetStr && !descendantIds.has(idStr)) return t;
      return nextSolo
        ? { ...t, isSolo: true, isMute: false }
        : { ...t, isSolo: false };
    });
    return reconcileAncestorsSoloBottomUp(cascaded, target.id);
  }

  const updatedLeaf = tracks.map((t) => {
    if (String(t.id) !== targetStr) return t;
    return nextSolo
      ? { ...t, isSolo: true, isMute: false }
      : { ...t, isSolo: false };
  });

  return reconcileAncestorsSoloBottomUp(updatedLeaf, target.id);
}

export function toggleTrackMuteStudioPro<T extends TrackGroup>(
  tracks: T[],
  targetId: number | string
): T[] {
  const targetStr = String(targetId);
  const target = tracks.find((t) => String(t.id) === targetStr);
  if (!target) return tracks;

  const nextMute = !Boolean(target.isMute);
  const wasSolo = Boolean(target.isSolo);

  let updated = tracks.map((t) => {
    if (String(t.id) !== targetStr) return t;
    return nextMute
      ? { ...t, isMute: true, isSolo: false }
      : { ...t, isMute: false };
  });

  if (nextMute && isBusOrLinkContainer(target) && wasSolo) {
    const descendantIds = getAllDescendantIds(updated, target.id);
    updated = updated.map((t) => (descendantIds.has(String(t.id)) ? { ...t, isSolo: false } : t));
  }

  return nextMute && wasSolo ? reconcileAncestorsSoloBottomUp(updated, target.id) : updated;
}

export function computeEffectiveMuteStatePro(tracks: readonly any[], trackId: number | string): boolean {
  if (!Array.isArray(tracks) || tracks.length === 0) return true;
  const idStr = String(trackId);
  const track = tracks.find((t) => t && (t.id === trackId || String(t.id) === idStr));
  if (!track) return true;

  if (track.isMute === true) return true;
  const ancestors = getAncestorChainBottomUp(tracks, track.id);
  if (ancestors.some((anc) => anc.isMute === true)) return true;

  const hasAnySolo = tracks.some((t) => t && t.isSolo === true);
  if (!hasAnySolo) return false;

  if (isBusOrLinkContainer(track)) {
    if (track.isSolo === true) return false;
    const descendantIds = getAllDescendantIds(tracks, track.id);
    const hasAudibleSoloDescendant = tracks.some((t) => {
      if (!t || !descendantIds.has(String(t.id)) || isBusOrLinkContainer(t)) return false;
      if (t.isSolo !== true || t.isMute === true) return false;
      const leafAncs = getAncestorChainBottomUp(tracks, t.id);
      return !leafAncs.some((a) => a.isMute === true);
    });
    return !hasAudibleSoloDescendant;
  }

  return track.isSolo !== true;
}
