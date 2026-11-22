import { isSequencerVisibleTrack, useSequencerStore } from '../../stores/useSequencerStore';
import { instrumentsConfig } from '../../data';
import { isSlaveTrack } from '../../utils/trackMasterResolver';
import { CircleSequencerProps } from './circleSequencerTypes';

/**
 * Filtre les pistes visibles dans la Roda selon la visibilité globale,
 * le masquage par défaut des esclaves liés (`!showLinkedTracksOnRoda`),
 * la liste explicite ou le mode focus mobile.
 */
export function resolveVisibleRodaTracks(rawTracks: any[], props: CircleSequencerProps): any[] {
  let tracks = rawTracks.filter((t) => isSequencerVisibleTrack(t, rawTracks));

  if (props.visibleTrackIds && props.visibleTrackIds.length > 0) {
    const allowed = new Set(props.visibleTrackIds.map(String));
    return tracks.filter((t) => allowed.has(String(t.id)));
  }

  const storeState = useSequencerStore.getState();
  const showLinked = props.showLinkedTracksOnRoda ?? storeState.showLinkedTracksOnRoda;

  if (props.isMobile || (typeof window !== 'undefined' && window.innerWidth <= 768)) {
    const targetId = storeState.focusTrackId ?? storeState.editingTrackId;
    const candidatePool = showLinked ? tracks : tracks.filter((t) => !isSlaveTrack(t, rawTracks));
    const primaryTrack =
      (targetId !== null && targetId !== undefined ? tracks.find((t) => t.id === targetId) : undefined) ||
      candidatePool.find((t) => instrumentsConfig[t.instrumentIdx]?.type !== 'voice') ||
      candidatePool[0] ||
      tracks[0];
    const allowedIds = new Set<string>();
    if (primaryTrack) allowedIds.add(String(primaryTrack.id));
    const refId = props.secondaryFocusTrackId ?? props.referenceTrackId;
    if (refId !== undefined && refId !== null) allowedIds.add(String(refId));
    return tracks.filter((t) => allowedIds.has(String(t.id)));
  }

  if (!showLinked) {
    tracks = tracks.filter((t) => !isSlaveTrack(t, rawTracks));
  }

  return tracks;
}
