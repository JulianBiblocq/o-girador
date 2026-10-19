import { instrumentsConfig } from '../../data';
import { TrackMeta } from './trackMetaCache';

const sortMixerTracksHierarchically = (tracksList: TrackMeta[]): TrackMeta[] => {
  const visited = new Set<number>();
  const ordered: TrackMeta[] = [];

  const isRoot = (t: TrackMeta) => {
    const isAlfSlave = t.linkedToTrackId && 
      (instrumentsConfig[t.instrumentIdx]?.id === 'meiao' || 
       instrumentsConfig[t.instrumentIdx]?.id === 'repique' || 
       (instrumentsConfig[t.instrumentIdx]?.id === 'marcante' && !t.isLinkMaster));
    if (isAlfSlave) return false;

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
      const aScore = a.isBusFolder ? 1 : 0;
      const bScore = b.isBusFolder ? 1 : 0;
      return bScore - aScore;
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
    const isAlfSlave = t.linkedToTrackId && 
      (instrumentsConfig[t.instrumentIdx]?.id === 'meiao' || 
       instrumentsConfig[t.instrumentIdx]?.id === 'repique' || 
       (instrumentsConfig[t.instrumentIdx]?.id === 'marcante' && !t.isLinkMaster));

    if (isAlfSlave && t.isHidden) {
      const parentBus = tracksMeta.find(p => String(p.id) === String(t.linkedToTrackId) && p.isLinkFolder);
      if (parentBus && !parentBus.isFolded) {
        return true;
      }
      return false;
    }

    if (t.isHidden) return false;

    if (t.busId) {
      let currentParent = tracksMeta.find(p => String(p.id) === String(t.busId));
      while (currentParent) {
        if (currentParent.isFolded) return false;
        const nextId = currentParent.busId || currentParent.linkedToTrackId;
        if (nextId) {
          currentParent = tracksMeta.find(p => String(p.id) === String(nextId));
        } else {
          break;
        }
      }
    }

    if (t.linkedToTrackId && !t.isLinkFolder) {
      let currentLinkParent = tracksMeta.find(p => String(p.id) === String(t.linkedToTrackId));
      while (currentLinkParent) {
        if (currentLinkParent.isFolded) return false;
        const nextId = currentLinkParent.linkedToTrackId || currentLinkParent.busId;
        if (nextId) {
          currentLinkParent = tracksMeta.find(p => String(p.id) === String(nextId));
        } else {
          break;
        }
      }
    }

    return true;
  });

  return sortMixerTracksHierarchically(filtered);
};

export const getAllOrderedMixerTracks = (tracksMeta: TrackMeta[]): TrackMeta[] => {
  return sortMixerTracksHierarchically(tracksMeta);
};
