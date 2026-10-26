/**
 * Résolution de la piste Maître et du motif correspondant pour pistes liées/esclaves (< 90 lignes).
 */
import { TrackGroup } from '../types/store.types';

export function getLinkedGroupMembers(track: TrackGroup, allTracks: TrackGroup[]): TrackGroup[] {
  const parentId = track.linkedToTrackId ? String(track.linkedToTrackId) : null;
  const parent = parentId ? allTracks.find((t) => String(t.id) === parentId) : null;
  if (parent && parent.isBusFolder && !parent.isLinkFolder) return [track];

  const trackIdStr = String(track.id);
  return allTracks.filter((t) => {
    if (t.isBusFolder || t.isLinkFolder) return false;
    const tLinkedStr = t.linkedToTrackId ? String(t.linkedToTrackId) : null;
    const tIdStr = String(t.id);
    if (parentId && tLinkedStr === parentId) return true;
    if (tLinkedStr === trackIdStr) return true;
    if (parentId && tIdStr === parentId) return true;
    if (tIdStr === trackIdStr) return true;
    return false;
  });
}

export function isSlaveTrack(track?: TrackGroup | null, allTracks?: TrackGroup[]): boolean {
  if (!track || track.isBusFolder || track.isLinkFolder || track.isLinkMaster === true) return false;
  if (!track.linkedToTrackId) return false;

  if (allTracks && allTracks.length > 0) {
    const parent = allTracks.find((t) => String(t.id) === String(track.linkedToTrackId));
    // 1. Dossier pur Bus Audio (et non linkFolder) : jamais un esclave de linking
    if (parent && parent.isBusFolder && !parent.isLinkFolder) return false;

    // 2. Topologie 2 : Lien direct vers une piste Maître (non bus)
    if (parent && parent.isLinkMaster === true && !parent.isBusFolder) {
      return track.id !== parent.id;
    }

    // 3. Topologie 1 : Lien via dossier de Track Linking
    if (parent && parent.isLinkFolder && !parent.isBusFolder) {
      const groupTracks = getLinkedGroupMembers(track, allTracks);
      const explicitMaster = groupTracks.find((t) => t.isLinkMaster === true);
      return Boolean(explicitMaster && track.id !== explicitMaster.id);
    }

    // 4. Cas général de fratrie liée avec un maître explicite
    const groupTracks = getLinkedGroupMembers(track, allTracks);
    const explicitMaster = groupTracks.find((t) => t.isLinkMaster === true);
    if (explicitMaster) return track.id !== explicitMaster.id;
  }

  return false;
}

export function resolveMasterTrack(trackId: number, tracks: TrackGroup[]): TrackGroup | undefined {
  const current = tracks.find((t) => t.id === trackId);
  if (!current) return undefined;

  // Dossier Bus ou Link Folder -> trouver la piste Maître réelle (jamais un dossier)
  if (current.isBusFolder || current.isLinkFolder) {
    const directChildren = tracks.filter(
      (t) => !t.isBusFolder && !t.isLinkFolder && (String(t.linkedToTrackId) === String(current.id) || String(t.busId) === String(current.id))
    );
    const masterChild = directChildren.find((t) => t.isLinkMaster === true);
    if (masterChild) return masterChild;
    if (directChildren.length > 0) return directChildren[0];
    return current;
  }

  // Piste Esclave -> trouver la piste Maître liée réelle
  if (isSlaveTrack(current, tracks)) {
    const parent = tracks.find((t) => String(t.id) === String(current.linkedToTrackId));
    if (parent && parent.isLinkMaster === true && !parent.isBusFolder) return parent;

    const groupTracks = getLinkedGroupMembers(current, tracks);
    const explicitMaster = groupTracks.find((t) => t.isLinkMaster === true);
    if (explicitMaster) return explicitMaster;
    if (groupTracks.length > 0) return groupTracks[0];
  }

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
