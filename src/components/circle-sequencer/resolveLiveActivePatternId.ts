
import { TrackGroup } from '../../types';
import { instrumentsConfig } from '../../data';
import { isToadaBus } from '../../stores/useSequencerStore';
import { LivePlaybackState } from './circleSequencerTypes';

export function resolveLiveActivePatternId(
  track: TrackGroup,
  livePlaybackRef: React.MutableRefObject<LivePlaybackState>,
  stateRef: React.MutableRefObject<any>
): number | null {
  const live = livePlaybackRef.current;
  const state = stateRef.current;
  const measureIdx = (live && live.step >= 0) ? live.measure : state.currentMeasure;

  const isToada = isToadaBus(track);

  if (isToada) {
    const pux = state.rawTracks.find((t: any) => instrumentsConfig[t.instrumentIdx]?.id === 'puxador');
    const coro = state.rawTracks.find((t: any) => instrumentsConfig[t.instrumentIdx]?.id === 'coro');

    const soloPlayId = state.soloPatternPlayId;
    if (soloPlayId !== undefined && soloPlayId !== null) {
      if (pux && pux.patterns.some((p: any) => p.id === soloPlayId)) return soloPlayId;
      if (coro && coro.patterns.some((p: any) => p.id === soloPlayId)) return soloPlayId;
      return null;
    }

    if (coro) {
      for (let i = 0; i < coro.patterns.length; i++) {
        if (coro.patterns[i].measureAssignments?.[measureIdx]) return coro.patterns[i].id;
      }
    }
    if (pux) {
      for (let i = 0; i < pux.patterns.length; i++) {
        if (pux.patterns[i].measureAssignments?.[measureIdx]) return pux.patterns[i].id;
      }
    }
    return null;
  }

  const soloPlayId = state.soloPatternPlayId;
  const isLinkedChild = Boolean(track.linkedToTrackId && !track.isLinkFolder);
  const parentBus = isLinkedChild ? state.rawTracks.find((t: any) => String(t.id) === String(track.linkedToTrackId)) : null;

  if (soloPlayId !== undefined && soloPlayId !== null) {
    const foundOwn = track.patterns?.find((p: any) => p.id === soloPlayId);
    if (foundOwn) return soloPlayId;
    if (parentBus) {
      const foundInBus = parentBus.patterns?.find((p: any) => p.id === soloPlayId);
      if (foundInBus) {
        const matchByName = track.patterns?.find((p: any) => p.name === foundInBus.name);
        return matchByName ? matchByName.id : soloPlayId;
      }
    }
    if (isLinkedChild && !track.isLinkMaster) {
      const master = state.rawTracks.find((t: any) => String(t.linkedToTrackId) === String(track.linkedToTrackId) && t.isLinkMaster);
      const masterPtn = master?.patterns?.find((p: any) => p.id === soloPlayId);
      if (masterPtn) {
        const matchByName = track.patterns?.find((p: any) => p.name === masterPtn.name);
        if (matchByName) return matchByName.id;
        return soloPlayId;
      }
    }
    return null;
  }

  if (isLinkedChild && !track.isLinkMaster) {
    const override = track.patternOverrides?.[measureIdx];
    if (override === null) return null;
    if (override !== undefined) return override;
  }

  const ownPtn = track.patterns?.find((p: any) => p?.measureAssignments?.[measureIdx]);
  if (ownPtn) return ownPtn.id;

  if (isLinkedChild) {
    if (parentBus) {
      const busPtn = parentBus.patterns?.find((p: any) => p?.measureAssignments?.[measureIdx]);
      if (busPtn) return busPtn.id;
    }
    if (!track.isLinkMaster) {
      const master = state.rawTracks.find((t: any) => String(t.linkedToTrackId) === String(track.linkedToTrackId) && t.isLinkMaster);
      const masterPtn = master?.patterns?.find((p: any) => p?.measureAssignments?.[measureIdx]);
      if (masterPtn) {
        const matchByName = track.patterns?.find((p: any) => p.name === masterPtn.name);
        if (matchByName) return matchByName.id;
        return masterPtn.id;
      }
    }
  }

  return null;
}
