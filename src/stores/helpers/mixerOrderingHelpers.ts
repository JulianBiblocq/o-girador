import { TrackMeta } from './trackMetaCache';

function isParentBusFolded(track: TrackMeta, allTracks: TrackMeta[]): boolean {
  let currentId = track.busId || track.linkedToTrackId;
  const visited = new Set<string>();

  while (currentId) {
    const idStr = String(currentId);
    if (visited.has(idStr)) break;
    visited.add(idStr);

    const parent = allTracks.find((p) => String(p.id) === idStr);
    if (!parent) break;
    if (parent.isFolded) return true;
    currentId = parent.busId || parent.linkedToTrackId;
  }

  return false;
}

function hasParentBus(track: TrackMeta, allTracks: TrackMeta[]): boolean {
  let currentId = track.busId || track.linkedToTrackId;
  const visited = new Set<string>();

  while (currentId) {
    const idStr = String(currentId);
    if (visited.has(idStr)) break;
    visited.add(idStr);

    const parent = allTracks.find((p) => String(p.id) === idStr);
    if (!parent) break;
    if (parent.isBusFolder || parent.isLinkFolder) return true;
    currentId = parent.busId || parent.linkedToTrackId;
  }

  return false;
}

const sortMixerTracksHierarchically = (tracksList: TrackMeta[]): TrackMeta[] => {
  const visited = new Set<number>();
  const ordered: TrackMeta[] = [];

  const isRoot = (t: TrackMeta) => {
    if (t.linkedToTrackId && !t.isLinkMaster && !t.isLinkFolder) {
      return false;
    }
    const busIdStr = t.busId;
    if (!busIdStr) return true;
    const hasParent = tracksList.some(p => String(p.id) === String(busIdStr));
    return !hasParent;
  };

  const roots = tracksList.filter(isRoot);

  const visit = (track: TrackMeta) => {
    if (visited.has(track.id)) return;
    visited.add(track.id);
    ordered.push(track);

    const children = tracksList.filter(t => {
      if (visited.has(t.id)) return false;
      const isChildByBus = t.busId && String(t.busId) === String(track.id);
      const isChildByLink = t.linkedToTrackId && String(t.linkedToTrackId) === String(track.id);
      return isChildByBus || isChildByLink;
    });

    children.sort((a, b) => {
      if (a.isBusFolder !== b.isBusFolder) {
        return (b.isBusFolder ? 1 : 0) - (a.isBusFolder ? 1 : 0);
      }
      if (a.isLinkMaster !== b.isLinkMaster) {
        return (b.isLinkMaster ? 1 : 0) - (a.isLinkMaster ? 1 : 0);
      }
      return 0;
    });

    children.forEach(visit);
  };

  roots.forEach(visit);

  tracksList.forEach(t => {
    if (!visited.has(t.id)) {
      ordered.push(t);
    }
  });

  return ordered;
};

export const getDisplayedMixerTracks = (tracksMeta: TrackMeta[]): TrackMeta[] => {
  const filtered = tracksMeta.filter(t => {
    if (t.isBusFolder || t.isLinkFolder) {
      if (isParentBusFolded(t, tracksMeta)) return false;
      return true;
    }

    if (hasParentBus(t, tracksMeta)) {
      if (isParentBusFolded(t, tracksMeta)) return false;
      return true;
    }

    if (t.isHidden) return false;
    return true;
  });

  return sortMixerTracksHierarchically(filtered);
};

export const getAllOrderedMixerTracks = (tracksMeta: TrackMeta[]): TrackMeta[] => {
  return sortMixerTracksHierarchically(tracksMeta);
};
