/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useMemo } from 'react';
import { useSequencerStore, isSequencerVisibleTrack, isToadaBus, isToadaChild } from '../../stores/useSequencerStore';
import { useShallow } from 'zustand/react/shallow';
import { TrackGroup } from '../../types';

const trackListCache = new Map<string, { id: number; isHidden: boolean; isSolo: boolean; isMute: boolean }>();
const getCachedTrack = (id: number, isHidden: boolean, isSolo: boolean, isMute: boolean) => {
  const key = `${id}_${isHidden}_${isSolo}_${isMute}`;
  let obj = trackListCache.get(key);
  if (!obj) {
    obj = { id, isHidden, isSolo, isMute };
    trackListCache.set(key, obj);
  }
  return obj;
};

export function useMixerTrackList() {
  const trackList = useSequencerStore(
    useShallow(state => {
      const list: TrackGroup[] = [];
      state.tracks.forEach(t => {
        if (isToadaChild(t, state.tracks)) return;
        if (isToadaBus(t)) {
          list.push(t);
          return;
        }
        if (isSequencerVisibleTrack(t, state.tracks)) {
          list.push(t);
        }
      });

      const rodaOrder = state.rodaTrackOrder;
      if (rodaOrder && rodaOrder.length > 0) {
        const orderMap = new Map(rodaOrder.map((id, index) => [id, index]));
        list.sort((a, b) => {
          const idxA = orderMap.has(a.id) ? orderMap.get(a.id)! : 9999;
          const idxB = orderMap.has(b.id) ? orderMap.get(b.id)! : 9999;
          return idxA - idxB;
        });
      }

      return list.map(t => getCachedTrack(t.id, t.isHidden, t.isSolo, t.isMute));
    })
  );

  const trackIdsNumbers = useMemo(() => trackList.map(t => t.id), [trackList]);
  const trackIds = useMemo(() => trackIdsNumbers.map(id => `track-${id}`), [trackIdsNumbers]);

  return { trackList, trackIdsNumbers, trackIds };
}
