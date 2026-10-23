import { TrackGroup } from '../../types';
import { instrumentsConfig } from '../../data';
import { TrackMeta } from './trackMetaCache';

export const isToadaBus = (t: { isBusFolder?: boolean; customName?: string; id?: any }): boolean => {
  return !!t.isBusFolder && (t.customName === 'Toada' || String(t.id) === 'toada');
};

export const isToadaChild = (t: { busId?: string }, allTracks: TrackGroup[]): boolean => {
  if (!t.busId) return false;
  const parent = allTracks.find(p => String(p.id) === String(t.busId));
  return !!parent && isToadaBus(parent);
};

export const getTrackSolidBlockId = (track: TrackGroup | TrackMeta, allTracks: (TrackGroup | TrackMeta)[]): string | null => {
  if (track.isLinkFolder) return `link-${track.id}`;
  if (track.linkedToTrackId) return `link-${track.linkedToTrackId}`;
  if (track.isLinkMaster) return `link-${track.id}`;
  const hasSlaves = allTracks.some(other => other.linkedToTrackId && String(other.linkedToTrackId) === String(track.id));
  if (hasSlaves) return `link-${track.id}`;
  if (track.isBusFolder) return `bus-${track.id}`;
  if (track.busId) return `bus-${track.busId}`;
  return null;
};

export const isSequencerVisibleTrack = (t: TrackGroup, allTracks: TrackGroup[]): boolean => {
  if (isToadaChild(t, allTracks)) {
    return false;
  }
  if (isToadaBus(t)) {
    return true;
  }
  if (t.isBusFolder || t.isLinkFolder) {
    return false;
  }
  return true;
};

export const isLinearDAWVisibleTrack = (t: TrackGroup, allTracks: TrackGroup[]): boolean => {
  if (isToadaChild(t, allTracks)) {
    return false;
  }
  if (isToadaBus(t)) {
    return true;
  }
  if (t.isBusFolder || t.isLinkFolder) {
    return false;
  }
  return true;
};

export const getVisibleTimelineTrackIds = (state: {
  tracks: TrackGroup[];
  rodaTrackOrder?: number[];
}): number[] => {
  const topLevelList: TrackGroup[] = [];
  state.tracks.forEach(t => {
    if (isLinearDAWVisibleTrack(t, state.tracks)) {
      const isLinkedSlave = Boolean(t.linkedToTrackId && !t.isLinkMaster && !t.isBusFolder && !t.isLinkFolder);
      if (!isLinkedSlave) {
        topLevelList.push(t);
      }
    }
  });

  if (state.rodaTrackOrder && state.rodaTrackOrder.length > 0) {
    const orderMap = new Map(state.rodaTrackOrder.map((id, index) => [id, index]));
    topLevelList.sort((a, b) => {
      const idxA = orderMap.has(a.id) ? orderMap.get(a.id)! : 9999;
      const idxB = orderMap.has(b.id) ? orderMap.get(b.id)! : 9999;
      return idxA - idxB;
    });
  }

  const visibleTrackIds: number[] = [];
  topLevelList.forEach(t => {
    visibleTrackIds.push(t.id);
    if (isToadaBus(t) && !t.isSequencerFolded) {
      const puxTrack = state.tracks.find(child => instrumentsConfig[child.instrumentIdx]?.id === 'puxador');
      const coroTrack = state.tracks.find(child => instrumentsConfig[child.instrumentIdx]?.id === 'coro');
      if (puxTrack) visibleTrackIds.push(puxTrack.id);
      if (coroTrack) visibleTrackIds.push(coroTrack.id);
    }
    if (t.isLinkMaster) {
      const parentBus = state.tracks.find(p => String(p.id) === String(t.linkedToTrackId) && p.isLinkFolder);
      const isFolded = parentBus ? parentBus.isSequencerFolded : t.isSequencerFolded;
      if (!isFolded) {
        const parentId = parentBus ? String(parentBus.id) : String(t.id);
        const slaves = state.tracks.filter(child => 
          String(child.linkedToTrackId) === parentId && 
          !child.isLinkFolder && 
          !child.isLinkMaster
        );
        slaves.forEach(slave => visibleTrackIds.push(slave.id));
      }
    }
  });
  return visibleTrackIds;
};

