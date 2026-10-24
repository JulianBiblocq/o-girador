/**
 * Résolution de la piste Maître et du motif correspondant pour pistes liées/esclaves (< 80 lignes).
 */
import { TrackGroup } from '../types/store.types';

export function isSlaveTrack(track?: TrackGroup | null): boolean {
  if (!track) return false;
  return Boolean(track.linkedToTrackId && !track.isLinkFolder && !track.isLinkMaster);
}

export function resolveMasterTrack(trackId: number, tracks: TrackGroup[]): TrackGroup | undefined {
  const current = tracks.find((t) => t.id === trackId);
  if (!current) return undefined;

  // Dossier Bus ou Link Folder -> trouver la piste Maître liée
  if (current.isBusFolder || current.isLinkFolder) {
    return tracks.find((t) => String(t.linkedToTrackId) === String(current.id) && t.isLinkMaster)
      || tracks.find((t) => String(t.busId) === String(current.id) && !t.isBusFolder && !t.isLinkFolder)
      || current;
  }

  // Piste Esclave -> trouver la piste Maître liée
  if (isSlaveTrack(current)) {
    return tracks.find((t) =>
      t.isLinkMaster && (String(t.linkedToTrackId) === String(current.linkedToTrackId) || String(t.id) === String(current.linkedToTrackId))
    ) || current;
  }

  // Piste déjà Maître ou indépendante
  return current;
}

export function resolveMasterTrackId(trackId: number, tracks: TrackGroup[]): number {
  return resolveMasterTrack(trackId, tracks)?.id ?? trackId;
}

export function resolveMatchingPatternIdOnMaster(
  masterTrack: TrackGroup,
  currentTrack?: TrackGroup | null,
  currentPatternId?: number | null
): number | undefined {
  if (!masterTrack.patterns || masterTrack.patterns.length === 0) return undefined;

  // 1. Même id
  if (currentPatternId) {
    const byId = masterTrack.patterns.find((p) => p.id === currentPatternId);
    if (byId) return byId.id;
  }

  const currentPattern = currentTrack?.patterns?.find((p) => p.id === currentPatternId);

  // 2. Même nom insensible à la casse
  if (currentPattern?.name) {
    const normName = currentPattern.name.trim().toLowerCase();
    const byName = masterTrack.patterns.find((p) => p.name.trim().toLowerCase() === normName);
    if (byName) return byName.id;
  }

  // 3. Même index d'ordre
  if (currentTrack?.patterns && currentPattern) {
    const idx = currentTrack.patterns.indexOf(currentPattern);
    if (idx >= 0 && masterTrack.patterns[idx]) {
      return masterTrack.patterns[idx].id;
    }
  }

  // 4. Repli sur le premier motif du maître
  return masterTrack.patterns[0]?.id;
}
