import { isSequencerVisibleTrack, useSequencerStore } from '../../stores/useSequencerStore';
import { instrumentsConfig } from '../../data';
import { CircleSequencerProps } from './circleSequencerTypes';

/**
 * Filtre les pistes visibles dans la Roda selon la visibilité globale,
 * la liste explicite ou le mode focus mobile.
 */
export function resolveVisibleRodaTracks(rawTracks: any[], props: CircleSequencerProps): any[] {
  let tracks = rawTracks.filter((t) => isSequencerVisibleTrack(t, rawTracks));

  if (props.visibleTrackIds && props.visibleTrackIds.length > 0) {
    const allowed = new Set(props.visibleTrackIds.map(String));
    return tracks.filter((t) => allowed.has(String(t.id)));
  }

  if (props.isMobile || (typeof window !== 'undefined' && window.innerWidth <= 768)) {
    const storeState = useSequencerStore.getState();
    const targetId = storeState.focusTrackId ?? storeState.editingTrackId;
    const primaryTrack =
      (targetId !== null && targetId !== undefined ? tracks.find((t) => t.id === targetId) : undefined) ||
      tracks.find((t) => instrumentsConfig[t.instrumentIdx]?.type !== 'voice') ||
      tracks[0];
    const allowedIds = new Set<string>();
    if (primaryTrack) allowedIds.add(String(primaryTrack.id));
    const refId = props.secondaryFocusTrackId ?? props.referenceTrackId;
    if (refId !== undefined && refId !== null) allowedIds.add(String(refId));
    tracks = tracks.filter((t) => allowedIds.has(String(t.id)));
  }

  return tracks;
}
