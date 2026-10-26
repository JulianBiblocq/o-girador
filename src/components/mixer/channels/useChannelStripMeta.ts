/**
 * O Girador - Helper de métadonnées et messages pour tranche de mixeur (< 65 lignes).
 */
import { TrackMeta } from '../../../stores/useSequencerStore';
import { instrumentsConfig } from '../../../data';
import { getTrackDisplayName } from '../../../utils/colorHelpers';

export interface ChannelStripMeta {
  inst: any;
  displayName: string;
  customDeleteMessage?: string;
  effectiveOnOpenDetailEditor?: (trackId: number) => void;
}

export function useChannelStripMeta(
  track: any,
  tracksMeta: TrackMeta[],
  lang: string,
  onOpenDetailEditor?: (trackId: number) => void
): ChannelStripMeta {
  const isBusPure = Boolean(track?.isBusFolder && !track?.isLinkFolder);
  const isLinkedTrack = Boolean(track?.linkedToTrackId && !track?.isBusFolder);

  const inst = instrumentsConfig[track?.instrumentIdx] ||
    (track?.isBusFolder ? { id: 'bus', name: 'Bus', color: 'var(--cordel-wood)' } : null);

  const displayName = isBusPure
    ? (track?.customName || 'Bus')
    : (getTrackDisplayName(track, tracksMeta) || inst?.name || '');

  let customDeleteMessage: string | undefined;
  if (isBusPure) {
    const childTracks = tracksMeta.filter((t) => String(t.busId) === String(track.id));
    if (childTracks.length > 0) {
      customDeleteMessage = lang === 'fr'
        ? `Attention : le bus "${displayName}" contient ${childTracks.length} piste(s). Sa suppression entraînera également la suppression de toutes les pistes associées. Voulez-vous continuer ?`
        : `Atenção: o bus "${displayName}" contém ${childTracks.length} faixa(s). Sua exclusão também removerá todas as faixas associadas. Deseja continuar?`;
    }
  } else if (isLinkedTrack) {
    customDeleteMessage = lang === 'fr'
      ? `Supprimer définitivement la piste liée "${displayName}" et tous ses motifs ?`
      : `Excluir definitivamente a faixa vinculada "${displayName}" e todos os seus padrões?`;
  }

  const effectiveOnOpenDetailEditor = isBusPure ? undefined : onOpenDetailEditor;

  return { inst, displayName, customDeleteMessage, effectiveOnOpenDetailEditor };
}
