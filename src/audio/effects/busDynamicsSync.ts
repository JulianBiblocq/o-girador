/**
 * busDynamicsSync.ts — Façade de synchronisation Polarité Ø + Compresseur VCA des tranches de groupe (< 60 lignes).
 * Appelée par `initBusesAudioNodes` / `syncBusChannels` (changement de pistes) et par le flux Éco (`disableFx`).
 */
import { busInputs } from './effectsChainNodes';
import { applyInputPolarity } from '../../utils/audio/polarityGain';
import { hasBusCompressorInsert, pruneOrphanBusCompressors, syncBusCompressorInsert } from './busCompressorInsert';
import type { BusCompressorSettings } from './busCompressorTypes';

interface BusDynamicsTrackLike {
  id: number | string;
  isBusFolder?: boolean;
  isLinkFolder?: boolean;
  phaseInverted?: boolean;
  busCompressor?: BusCompressorSettings;
}

/**
 * Bus / Link / Toada : signe ±1 sur l'étage d'entrée du bus (rampe 8 ms), puis réglages du compresseur.
 * Les membres d'un Link ou du bus Toada traversent tous `busInputs[id]` : un seul signe par étage,
 * le produit physique piste x bus garantit -1 * -1 = +1 sans double inversion.
 */
export function syncBusDynamics(track: BusDynamicsTrackLike, disableFx: boolean, immediate = false): void {
  if (!track.isBusFolder && !track.isLinkFolder) return;
  const input = busInputs[track.id];
  if (input) applyInputPolarity(input as any, 1, Boolean(track.phaseInverted), immediate);
  syncBusCompressorInsert(track.id, track.busCompressor, disableFx);
}

/** Bascule Éco globale (`ecoConfig.disableFx`) : rampe interne vers `activeMix = 0` sur les bus déjà câblés. */
export function syncAllBusCompressorsEco(tracks: BusDynamicsTrackLike[], disableFx: boolean): void {
  for (const t of tracks) {
    if ((t.isBusFolder || t.isLinkFolder) && hasBusCompressorInsert(t.id)) {
      syncBusCompressorInsert(t.id, t.busCompressor, disableFx);
    }
  }
}

/** Libère les Worklets de bus disparus (suppression de dossier). */
export function pruneBusDynamics(tracks: BusDynamicsTrackLike[]): void {
  const live = new Set<string>();
  for (const t of tracks) if (t.isBusFolder || t.isLinkFolder) live.add(String(t.id));
  pruneOrphanBusCompressors(live);
}
