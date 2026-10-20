import { useMemo, useEffect } from 'react';
import { TrackGroup } from '../../types';
import { useSequencerStore, isLinearDAWVisibleTrack, isToadaBus } from '../../stores/useSequencerStore';
import { instrumentsConfig } from '../../data';

export function useDawVisibleTracks() {
  const tracks = useSequencerStore(state => state.tracks);
  const rodaTrackOrder = useSequencerStore(state => state.rodaTrackOrder);

  useEffect(() => {
    useSequencerStore.setState({ isTracksCollapsed: false });
    useSequencerStore.getState().setTracks(prev =>
      prev.map(t => (t.isLinkFolder ? { ...t, isSequencerFolded: true } : t))
    );
  }, []);

  const visibleTracks = useMemo(() => {
    const topLevelList: TrackGroup[] = [];
    tracks.forEach(t => {
      if (isLinearDAWVisibleTrack(t, tracks)) {
        topLevelList.push(t);
      }
    });

    if (rodaTrackOrder && rodaTrackOrder.length > 0) {
      const orderMap = new Map(rodaTrackOrder.map((id, index) => [id, index]));
      topLevelList.sort((a, b) => {
        const idxA = orderMap.has(a.id) ? orderMap.get(a.id)! : 9999;
        const idxB = orderMap.has(b.id) ? orderMap.get(b.id)! : 9999;
        return idxA - idxB;
      });
    }

    const finalList: TrackGroup[] = [];
    topLevelList.forEach(t => {
      finalList.push(t);
      if (isToadaBus(t) && !t.isSequencerFolded) {
        const puxTrack = tracks.find(child => instrumentsConfig[child.instrumentIdx]?.id === 'puxador');
        const coroTrack = tracks.find(child => instrumentsConfig[child.instrumentIdx]?.id === 'coro');
        if (puxTrack) finalList.push(puxTrack);
        if (coroTrack) finalList.push(coroTrack);
      }
      if (t.isLinkMaster) {
        const parentBus = tracks.find(p => String(p.id) === String(t.linkedToTrackId) && p.isLinkFolder);
        if (parentBus && !parentBus.isSequencerFolded) {
          const slaves = tracks.filter(child =>
            String(child.linkedToTrackId) === String(parentBus.id) &&
            !child.isLinkFolder &&
            !child.isLinkMaster
          );
          finalList.push(...slaves);
        }
      }
    });
    return finalList;
  }, [tracks, rodaTrackOrder]);

  const sortableTrackIds = useMemo(() => visibleTracks.map(t => `track-${t.id}`), [visibleTracks]);
  const visibleTrackIds = useMemo(() => visibleTracks.map(t => t.id).join('-'), [visibleTracks]);

  return {
    tracks,
    visibleTracks,
    sortableTrackIds,
    visibleTrackIds,
  };
}
