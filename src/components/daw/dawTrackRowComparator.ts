
import { TrackGroup } from '../../types';
import { instrumentsConfig } from '../../data';
import { isToadaBus } from '../../stores/useSequencerStore';
import { isSlaveTrack, resolveMasterTrack } from '../../utils/trackMasterResolver';
import type { DawTrackRowProps } from './dawTrackRowTypes';

/**
 * Optimiseur de re-render pour DawTrackRow.
 * Évite le re-render systématique de toutes les lignes DAW à chaque tick/rafraîchissement
 * tout en garantissant la réactivité instantanée des pistes liées (split diagonal).
 */
export function areDawTrackRowPropsEqual(prev: DawTrackRowProps, next: DawTrackRowProps): boolean {
  // 1. Contrôle des primitives
  if (
    prev.trackIdx !== next.trackIdx ||
    prev.currentMeasure !== next.currentMeasure ||
    prev.defaultBeats !== next.defaultBeats ||
    prev.lang !== next.lang ||
    prev.isLeftHanded !== next.isLeftHanded
  ) {
    return false;
  }

  // 2. Contrôle de la piste elle-même
  if (prev.track !== next.track) {
    return false;
  }

  // 3. Contrôle des callbacks et refs critiques
  if (
    prev.sequencer !== next.sequencer ||
    prev.onSelectPedagogyTarget !== next.onSelectPedagogyTarget ||
    prev.registerStepRef !== next.registerStepRef ||
    prev.trackResolutionsRef !== next.trackResolutionsRef
  ) {
    return false;
  }

  const track = next.track;

  // 4. Si la piste est un bus Toada : surveiller les changements sur puxador et coro
  if (isToadaBus(track)) {
    const prevPux = prev.tracks.find(t => instrumentsConfig[t.instrumentIdx]?.id === 'puxador');
    const nextPux = next.tracks.find(t => instrumentsConfig[t.instrumentIdx]?.id === 'puxador');
    if (prevPux !== nextPux) return false;

    const prevCoro = prev.tracks.find(t => instrumentsConfig[t.instrumentIdx]?.id === 'coro');
    const nextCoro = next.tracks.find(t => instrumentsConfig[t.instrumentIdx]?.id === 'coro');
    if (prevCoro !== nextCoro) return false;
  }

  // 5. Si la piste est un maître de groupe lié ou un dossier lié : surveiller ses pistes esclaves
  const isMaster = track.isLinkMaster || track.isLinkFolder;
  if (isMaster) {
    const prevSlaves = prev.tracks.filter((t) => isSlaveTrack(t, prev.tracks) && resolveMasterTrack(t.id, prev.tracks)?.id === track.id);
    const nextSlaves = next.tracks.filter((t) => isSlaveTrack(t, next.tracks) && resolveMasterTrack(t.id, next.tracks)?.id === track.id);

    if (prevSlaves.length !== nextSlaves.length) return false;
    for (let i = 0; i < nextSlaves.length; i++) {
      if (prevSlaves[i] !== nextSlaves[i]) return false;
    }
  }

  // 6. Si la piste est une esclave liée : surveiller son maître
  if (isSlaveTrack(track, next.tracks)) {
    const prevMaster = resolveMasterTrack(track.id, prev.tracks);
    const nextMaster = resolveMasterTrack(track.id, next.tracks);
    if (prevMaster !== nextMaster) return false;
  }

  return true;
}
