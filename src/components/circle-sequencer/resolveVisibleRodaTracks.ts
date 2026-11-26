import { TrackGroup } from '../../types';
import { isSequencerVisibleTrack, useSequencerStore } from '../../stores/useSequencerStore';
import { instrumentsConfig } from '../../data';
import { isSlaveTrack } from '../../utils/trackMasterResolver';
import { CircleSequencerProps } from './circleSequencerTypes';
import { isRodaDrawableTrack, orderActiveVisibleRodaTracks, sortTracksByRodaOrder } from './sortTracksByRodaOrder';

/**
 * Source de vérité unique des pistes affichées sur la Roda :
 * - Exclut systématiquement `t.isHidden === true` (bouton Œil barré), Apito et dossiers de bus/liaison,
 * - Conserve les pistes `t.isMute === true` (anneau affiché atténué, jamais masqué),
 * - Masque les esclaves liés lorsque `!showLinkedTracksOnRoda`, ou applique le Focus mobile.
 */
export function resolveVisibleRodaTracks(rawTracks: any[], props: CircleSequencerProps): TrackGroup[] {
  if (!Array.isArray(rawTracks) || rawTracks.length === 0) return [];
  let tracks = rawTracks.filter((t) => isSequencerVisibleTrack(t, rawTracks));
  const isMobile = props.isMobile ?? (typeof window !== 'undefined' && window.innerWidth > 0 && window.innerWidth <= 768);

  if (props.visibleTrackIds && props.visibleTrackIds.length > 0) {
    const allowed = new Set(props.visibleTrackIds.map(String));
    return tracks.filter((t) =>
      allowed.has(String(t.id)) && (isMobile ? isRodaDrawableTrack({ ...t, isHidden: false }) : isRodaDrawableTrack(t))
    );
  }

  const storeState = useSequencerStore.getState();
  const showLinked = props.showLinkedTracksOnRoda ?? storeState.showLinkedTracksOnRoda;

  if (isMobile) {
    const drawablePool = tracks.filter((t) => isRodaDrawableTrack({ ...t, isHidden: false }));
    const targetId = storeState.focusTrackId ?? storeState.editingTrackId;
    const candidatePool = showLinked ? drawablePool : drawablePool.filter((t) => !isSlaveTrack(t, rawTracks));
    const primaryTrack =
      (targetId !== null && targetId !== undefined ? drawablePool.find((t) => t.id === targetId) : undefined) ||
      candidatePool.find((t) => instrumentsConfig[t.instrumentIdx]?.type !== 'voice') ||
      candidatePool[0] ||
      drawablePool[0];
    const allowedIds = new Set<string>();
    if (primaryTrack) allowedIds.add(String(primaryTrack.id));
    const refId = props.secondaryFocusTrackId ?? props.referenceTrackId;
    if (refId !== undefined && refId !== null) allowedIds.add(String(refId));
    return drawablePool.filter((t) => allowedIds.has(String(t.id)));
  }

  tracks = tracks.filter((t) => isRodaDrawableTrack(t));
  if (!showLinked) {
    tracks = tracks.filter((t) => !isSlaveTrack(t, rawTracks));
  }

  return tracks;
}

export function resolveOrderedVisibleRodaTracks(
  rawTracks: TrackGroup[],
  props: CircleSequencerProps,
  explicitRodaOrder?: number[]
): TrackGroup[] {
  const visible = resolveVisibleRodaTracks(rawTracks, props);
  if (visible.length === 0) return visible;
  const order = explicitRodaOrder ?? props.rodaTrackOrder ?? useSequencerStore.getState().rodaTrackOrder;
  const sorted = sortTracksByRodaOrder(visible, order);
  return orderActiveVisibleRodaTracks(sorted, rawTracks);
}

export function buildVisibleRodaSignature(visibleTracks: readonly TrackGroup[]): string {
  if (visibleTracks.length === 0) return 'empty';
  return visibleTracks
    .map((t) => `${t.id}:${t.isMute ? 1 : 0}:${t.isSolo ? 1 : 0}:${t.customName || ''}:${t.sectionPlayers?.length ?? 0}`)
    .join('|');
}
