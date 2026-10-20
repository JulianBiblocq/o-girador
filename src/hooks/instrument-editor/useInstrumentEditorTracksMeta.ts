/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import {
  useSequencerStore,
  selectTracksMeta,
  isSequencerVisibleTrack,
  isToadaBus,
  isToadaChild,
} from '../../stores/useSequencerStore';
import { useInstrumentLabel } from '../../stores/useNomenclatureStore';
import { instrumentsConfig } from '../../data';
import { getPatternUsage, PatternUsageItem } from '../../utils/editorPatternUsage';

export type { PatternUsageItem };
export { getPatternUsage };

export function useInstrumentEditorTracksMeta(track: any, trackId: number, inst: any) {
  const tracksMeta = useSequencerStore(selectTracksMeta);
  const getInstrumentLabel = useInstrumentLabel();

  const visibleTrackIds = useSequencerStore(
    useShallow((state) => {
      const list = state.tracks.filter(
        (t) => (isSequencerVisibleTrack(t, state.tracks) || isToadaBus(t) || t.customName === 'Toada' || t.instrumentIdx === 12)
          && !t.isHidden
          && !isToadaChild(t, state.tracks)
      );
      if (state.rodaTrackOrder && state.rodaTrackOrder.length > 0) {
        const orderMap = new Map(state.rodaTrackOrder.map((id, index) => [id, index]));
        list.sort((a, b) => {
          const idxA = orderMap.has(a.id) ? orderMap.get(a.id)! : 9999;
          const idxB = orderMap.has(b.id) ? orderMap.get(b.id)! : 9999;
          return idxA - idxB;
        });
      }
      return list.map((t) => t.id);
    })
  );

  const trackDisplayName = useMemo(() => {
    if (!track || !inst) return '';
    if (isToadaBus(track) || track.customName === 'Toada') return 'Toada';
    if (track.customName) return track.customName;
    const instName = getInstrumentLabel(track) || inst.name || 'Instrument';

    const sameInstTracks = tracksMeta.filter(
      (t) => !t.isBusFolder && instrumentsConfig[t.instrumentIdx]?.id === inst.id
    );

    if (sameInstTracks.length > 1) {
      sameInstTracks.sort((a, b) => a.id - b.id);
      const index = sameInstTracks.findIndex((t) => t.id === trackId);
      if (index !== -1) {
        return `${instName} ${index + 1}`;
      }
    }
    return instName;
  }, [track, inst, tracksMeta, trackId, getInstrumentLabel]);

  return {
    tracksMeta,
    visibleTrackIds,
    trackDisplayName,
    getPatternUsage,
  };
}
