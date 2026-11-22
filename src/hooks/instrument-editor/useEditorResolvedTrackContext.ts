import { useCallback, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useSequencerStore, isToadaBus, isToadaChild } from '../../stores/useSequencerStore';
import { useLiveMeasure } from '../useLiveMeasure';
import { instrumentsConfig } from '../../data';
import { Track } from '../../types';
import { resolveActiveVocalChild } from './useInstrumentDetailEditorController';
import { isSlaveTrack, resolveMasterTrack } from '../../utils/trackMasterResolver';
import { reconcileSlavePatterns } from '../../utils/trackLinkingSync';
import { isPatternCompletelySilent } from '../../utils/slavePatternCloneHelper';

const EMPTY_TRACKS: Track[] = [];
const EMPTY_VOCAL_PAIR = [undefined, undefined] as const;

export function useEditorResolvedTrackContext(trackId: number, deepLinkPatternId: number | string | null | undefined) {
  const track = useSequencerStore(useCallback((s) => s.tracks.find((t) => t.id === trackId), [trackId]));
  const isToada = Boolean(track && (isToadaBus(track) || (track as any).isToadaBus || track.customName === 'Toada' || track.instrumentIdx === 12));
  const currentMeasure = useLiveMeasure(Boolean(track && (isToadaBus(track) || (track as any).isToadaBus)));

  const familyTracks = useSequencerStore(useShallow(useCallback((s) => {
    const cur = s.tracks.find((t) => t.id === trackId);
    if (!cur) return EMPTY_TRACKS;
    if (isToadaBus(cur) || (cur as any).isToadaBus || cur.customName === 'Toada' || cur.instrumentIdx === 12) {
      return s.tracks.filter((t) => isToadaChild(t, s.tracks) || instrumentsConfig[t.instrumentIdx]?.id === 'puxador' || instrumentsConfig[t.instrumentIdx]?.id === 'coro');
    }
    if (cur.isLinkFolder || cur.isBusFolder || cur.linkedToTrackId || cur.isLinkMaster || cur.busId) {
      const refId = cur.linkedToTrackId ? String(cur.linkedToTrackId) : String(cur.id);
      const busRef = cur.busId ? String(cur.busId) : null;
      return s.tracks.filter((t) =>
        t.id === cur.id || String(t.id) === refId || String(t.linkedToTrackId) === refId ||
        String(t.linkedToTrackId) === String(cur.id) || String(t.busId) === String(cur.id) ||
        (busRef !== null && (String(t.id) === busRef || String(t.busId) === busRef))
      );
    }
    return EMPTY_TRACKS;
  }, [trackId])));

  const activeVocalChildTrack = useMemo(() => resolveActiveVocalChild(track, isToada, familyTracks, deepLinkPatternId, currentMeasure), [track, isToada, familyTracks, deepLinkPatternId, currentMeasure]);
  const folderChild = (track && (track.isLinkFolder || (track.isBusFolder && !isToada))) ? resolveMasterTrack(trackId, familyTracks) : undefined;
  const effectiveEditTrackId = (isToada && (!track?.patterns || track.patterns.length === 0) && activeVocalChildTrack)
    ? activeVocalChildTrack.id : (folderChild && folderChild.id !== trackId ? folderChild.id : trackId);
  const effectiveTrack = useSequencerStore(useCallback((s) => s.tracks.find((t) => t.id === effectiveEditTrackId), [effectiveEditTrackId])) ?? track;

  const toadaConfig = instrumentsConfig.find((i) => i.id === 'toada') || instrumentsConfig[12];
  const instSourceTrack = (track?.isLinkFolder && effectiveTrack) ? effectiveTrack : track;
  const inst = instSourceTrack ? (isToada && toadaConfig ? toadaConfig : instrumentsConfig[instSourceTrack.instrumentIdx]) : { id: '', name: '', type: 'percussion', iconImg: '', colors: { text: '' }, mixerBg: '' };

  const isSlave = isSlaveTrack(effectiveTrack, familyTracks), targetBalancoTrack = effectiveTrack;
  const masterTrack = isSlave ? resolveMasterTrack(effectiveEditTrackId, familyTracks) : null;
  const displayedPatterns = useMemo(() => {
    if (isSlave && effectiveTrack && masterTrack) {
      const outOfSync =
        !effectiveTrack.patterns?.length ||
        effectiveTrack.patterns.length !== masterTrack.patterns?.length ||
        masterTrack.patterns.some((mp, idx) => {
          const sp = effectiveTrack.patterns[idx];
          return !sp || sp.id !== mp.id || (isPatternCompletelySilent(sp) && !isPatternCompletelySilent(mp));
        });
      return outOfSync ? reconcileSlavePatterns(effectiveTrack, masterTrack).patterns : effectiveTrack.patterns;
    }
    return effectiveTrack?.patterns ?? [];
  }, [isSlave, effectiveTrack, masterTrack]);

  const isVocalContext = Boolean(isToada || String(track?.id) === 'puxador' || String(track?.id) === 'coro' || (track as any)?.type === 'voice' || inst?.type === 'voice' || track?.customName === 'Toada' || track?.customName === 'Puxador' || track?.customName === 'Coro');
  const [puxTrack, coroTrack] = useSequencerStore(useShallow(useCallback((s) => {
    if (!isVocalContext) return EMPTY_VOCAL_PAIR;
    return [
      s.tracks.find((t) => instrumentsConfig[t.instrumentIdx]?.id === 'puxador' || String(t.id) === 'puxador' || t.customName === 'Puxador'),
      s.tracks.find((t) => instrumentsConfig[t.instrumentIdx]?.id === 'coro' || String(t.id) === 'coro' || t.customName === 'Coro'),
    ] as const;
  }, [isVocalContext])));
  const isCoroActive = Boolean((coroTrack && effectiveEditTrackId === coroTrack.id) || String(track?.id) === 'coro' || inst?.id === 'coro' || track?.customName === 'Coro');

  return {
    track, effectiveEditTrackId, effectiveTrack, instSourceTrack, inst, isSlave, targetBalancoTrack,
    displayedPatterns, isVocalContext, puxTrack, coroTrack, isCoroActive,
  };
}
