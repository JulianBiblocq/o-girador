
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
import { isSlaveTrack, resolveMasterTrack } from '../../utils/trackMasterResolver';

export type { PatternUsageItem };
export { getPatternUsage };

export function useInstrumentEditorTracksMeta(track: any, trackId: number, inst: any) {
  const tracksMeta = useSequencerStore(selectTracksMeta);
  const getInstrumentLabel = useInstrumentLabel();

  const visibleTrackIds = useSequencerStore(
    useShallow((state) => {
      // 1. Pistes de premier niveau ordonnées selon la Roda / Morceau
      const topLevelList: any[] = [];
      state.tracks.forEach((t) => {
        if (t.isLinkFolder) return;
        if (t.isBusFolder && !t.isLinkMaster && !isToadaBus(t)) return;
        if (isToadaChild(t, state.tracks)) return;
        const isLinkedSlave = isSlaveTrack(t, state.tracks);
        if (!isLinkedSlave) {
          topLevelList.push(t);
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

      // 2. Insérer chaque piste et ses esclaves liés dans l'ordre exact de la colonne de gauche
      const result: number[] = [];
      topLevelList.forEach((t) => {
        if (!result.includes(t.id)) result.push(t.id);
        if (isToadaBus(t)) {
          const puxTrack = state.tracks.find(child => instrumentsConfig[child.instrumentIdx]?.id === 'puxador');
          const coroTrack = state.tracks.find(child => instrumentsConfig[child.instrumentIdx]?.id === 'coro');
          if (puxTrack && !result.includes(puxTrack.id)) result.push(puxTrack.id);
          if (coroTrack && !result.includes(coroTrack.id)) result.push(coroTrack.id);
        }
        const slaves = state.tracks.filter(child =>
          child.id !== t.id && isSlaveTrack(child, state.tracks) && resolveMasterTrack(child.id, state.tracks)?.id === t.id
        );
        slaves.forEach((slave) => {
          if (!result.includes(slave.id)) result.push(slave.id);
        });
      });

      // 3. Filet de sécurité pour garantir la présence de tout instrument jouable
      state.tracks.forEach((t) => {
        if (t.isLinkFolder) return;
        if (t.isBusFolder && !t.isLinkMaster && !isToadaBus(t)) return;
        if (isToadaChild(t, state.tracks)) return;
        if (!result.includes(t.id)) {
          result.push(t.id);
        }
      });

      return result;
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
