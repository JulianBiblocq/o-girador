import { useMemo, useEffect } from 'react';
import { TrackGroup } from '../../types';
import { useSequencerStore, selectTracksMeta, isLinearDAWVisibleTrack, isToadaBus } from '../../stores/useSequencerStore';
import { instrumentsConfig } from '../../data';

export function useDawVisibleTracks() {
  const tracksMeta = useSequencerStore(selectTracksMeta);
  const rodaTrackOrder = useSequencerStore(state => state.rodaTrackOrder);

  useEffect(() => {
    useSequencerStore.setState({ isTracksCollapsed: false });
    useSequencerStore.getState().setTracks(prev =>
      prev.map(t => (t.isLinkFolder ? { ...t, isSequencerFolded: true } : t))
    );
  }, []);

  const visibleTracks = useMemo(() => {
    const tracks = useSequencerStore.getState().tracks;
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

    return topLevelList;
  }, [tracksMeta, rodaTrackOrder]);

  const sortableTrackIds = useMemo(() => visibleTracks.map(t => `track-${t.id}`), [visibleTracks]);
  const visibleTrackIds = useMemo(() => visibleTracks.map(t => t.id).join('-'), [visibleTracks]);

  return {
    tracks: useSequencerStore.getState().tracks,
    visibleTracks,
    sortableTrackIds,
    visibleTrackIds,
  };
}
