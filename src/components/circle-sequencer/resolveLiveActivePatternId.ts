
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
        if (coro.patterns[i].measureAssignments[measureIdx]) {
          return coro.patterns[i].id;
        }
      }
    }
    if (pux) {
      for (let i = 0; i < pux.patterns.length; i++) {
        if (pux.patterns[i].measureAssignments[measureIdx]) {
          return pux.patterns[i].id;
        }
      }
    }
    return null;
  }

  const soloPlayId = state.soloPatternPlayId;
  const isLinkedChild = track.linkedToTrackId && !track.isLinkFolder;
  let sourceTrack = track;
  if (isLinkedChild) {
    const master = state.rawTracks.find((t: any) => String(t.id) === String(track.linkedToTrackId));
    if (master) sourceTrack = master;
  }

  if (soloPlayId !== undefined && soloPlayId !== null) {
    const foundOwn = track.patterns?.find((p: any) => p.id === soloPlayId);
    if (foundOwn) return soloPlayId;
    const foundMaster = sourceTrack.patterns?.find((p: any) => p.id === soloPlayId);
    if (foundMaster) return soloPlayId;
    return null;
  }

  if (isLinkedChild && !track.isLinkMaster) {
    const override = track.patternOverrides?.[measureIdx];
    if (override === null) return null;
    if (override !== undefined) return override;
    const ownPtn = track.patterns?.find((p: any) => p?.measureAssignments?.[measureIdx]);
    if (ownPtn) return ownPtn.id;
  }

  for (let i = 0; i < sourceTrack.patterns.length; i++) {
    if (sourceTrack.patterns[i]?.measureAssignments?.[measureIdx]) {
      return sourceTrack.patterns[i].id;
    }
  }
  return null;
}
