/**
 * Résolution de la piste Maître et du motif correspondant pour pistes liées/esclaves (< 90 lignes).
 */
import { TrackGroup } from '../types/store.types';

export function isSlaveTrack(track?: TrackGroup | null, allTracks?: TrackGroup[]): boolean {
  if (!track) return false;
  if (!track.linkedToTrackId || track.isLinkFolder || track.isLinkMaster === true) return false;

  // Si la liste complète des pistes est fournie, appliquer le repli robuste anti-blocage
  if (allTracks && allTracks.length > 0) {
    const groupTracks = allTracks.filter(
      (t) => !t.isLinkFolder && (String(t.linkedToTrackId) === String(track.linkedToTrackId) || String(t.id) === String(track.linkedToTrackId))
    );
    const hasExplicitMaster = groupTracks.some((t) => t.isLinkMaster === true);
    if (!hasExplicitMaster && groupTracks.length > 0) {
      // Aucun membre n'a isLinkMaster: true -> le premier membre fait office de Maître (non-esclave)
      return track.id !== groupTracks[0].id;
    }
  }

  return Boolean(track.linkedToTrackId && !track.isLinkFolder && !track.isLinkMaster);
}

export function resolveMasterTrack(trackId: number, tracks: TrackGroup[]): TrackGroup | undefined {
  const current = tracks.find((t) => t.id === trackId);
  if (!current) return undefined;

  // Dossier Bus ou Link Folder -> trouver la piste Maître liée
  if (current.isBusFolder || current.isLinkFolder) {
    return tracks.find((t) => String(t.linkedToTrackId) === String(current.id) && t.isLinkMaster && !t.isLinkFolder)
      || tracks.find((t) => String(t.busId) === String(current.id) && !t.isBusFolder && !t.isLinkFolder && t.isLinkMaster)
      || tracks.find((t) => (String(t.linkedToTrackId) === String(current.id) || String(t.busId) === String(current.id)) && !t.isBusFolder && !t.isLinkFolder)
      || current;
  }

  // Piste Esclave -> trouver la piste Maître liée
  if (isSlaveTrack(current, tracks)) {
    // 1. Chercher la piste ayant isLinkMaster: true
    const explicitMaster = tracks.find((t) =>
      t.isLinkMaster === true && !t.isLinkFolder &&
      (String(t.linkedToTrackId) === String(current.linkedToTrackId) || String(t.id) === String(current.linkedToTrackId))
    );
    if (explicitMaster) return explicitMaster;

    // 2. Repli: première piste enfant du même groupe lié
    const groupFirstTrack = tracks.find((t) =>
      !t.isLinkFolder &&
      (String(t.linkedToTrackId) === String(current.linkedToTrackId) || String(t.id) === String(current.linkedToTrackId))
    );
    if (groupFirstTrack) return groupFirstTrack;
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
