/**
 * Résolution unifiée de la piste Maître et des membres d'un groupe lié (< 130 lignes).
 * Supporte les 3 topologies : LinkFolder (avec ou sans Bus Audio), Lien direct vers Maître (y compris dans un Bus Audio),
 * et Bus Audio partagé possédant un `isLinkMaster: true` explicite.
 */
import { TrackGroup } from '../types/store.types';

function findExplicitMasterOnBus(busIdStr: string, allTracks: TrackGroup[]): TrackGroup | undefined {
  return allTracks.find(
    (t) =>
      !t.isBusFolder &&
      !t.isLinkFolder &&
      t.isLinkMaster === true &&
      (String(t.linkedToTrackId) === busIdStr || String(t.busId) === busIdStr)
  );
}

export function getLinkedGroupMembers(track: TrackGroup, allTracks: TrackGroup[]): TrackGroup[] {
  if (track.isBusFolder || track.isLinkFolder) {
    const folderIdStr = String(track.id);
    if (track.isBusFolder && !track.isLinkFolder && !findExplicitMasterOnBus(folderIdStr, allTracks)) {
      return [];
    }
    return allTracks.filter(
      (t) => !t.isBusFolder && !t.isLinkFolder && (String(t.linkedToTrackId) === folderIdStr || String(t.busId) === folderIdStr)
    );
  }

  const parentId = track.linkedToTrackId ? String(track.linkedToTrackId) : null;
  const parent = parentId ? allTracks.find((t) => String(t.id) === parentId) : null;

  if (parent && parent.isBusFolder && !parent.isLinkFolder) {
    const explicitMaster = findExplicitMasterOnBus(parentId!, allTracks);
    if (!explicitMaster) return [track];
    return allTracks.filter((t) => {
      if (t.isBusFolder || t.isLinkFolder) return false;
      return t.id === explicitMaster.id || String(t.linkedToTrackId) === parentId;
    });
  }

  const trackIdStr = String(track.id);
  const ownBusId = track.isLinkMaster === true && track.busId ? String(track.busId) : null;
  const ownBus = ownBusId ? allTracks.find((t) => String(t.id) === ownBusId) : null;

  return allTracks.filter((t) => {
    if (t.isBusFolder || t.isLinkFolder) return false;
    const tLinkedStr = t.linkedToTrackId ? String(t.linkedToTrackId) : null;
    const tIdStr = String(t.id);
    if (tIdStr === trackIdStr) return true;
    if (parentId && (tLinkedStr === parentId || tIdStr === parentId)) return true;
    if (tLinkedStr === trackIdStr) return true;
    if (ownBus && ownBusId && tLinkedStr === ownBusId) return true;
    return false;
  });
}

export function isSlaveTrack(track?: TrackGroup | null, allTracks?: TrackGroup[]): boolean {
  if (!track || track.isBusFolder || track.isLinkFolder || track.isLinkMaster === true) return false;
  if (!track.linkedToTrackId) return false;

  if (allTracks && allTracks.length > 0) {
    const parentIdStr = String(track.linkedToTrackId);
    const parent = allTracks.find((t) => String(t.id) === parentIdStr);

    // 1. Topologie 2 : Lien direct vers une piste feuille (Maître), même au sein d'un Bus Audio
    if (parent && !parent.isBusFolder && !parent.isLinkFolder) {
      return track.id !== parent.id;
    }

    // 2. Topologie 1 : Lien via dossier de Track Linking (avec ou sans isBusFolder)
    if (parent && parent.isLinkFolder) {
      const groupTracks = getLinkedGroupMembers(track, allTracks);
      const explicitMaster = groupTracks.find((t) => t.isLinkMaster === true) || groupTracks[0];
      return Boolean(explicitMaster && track.id !== explicitMaster.id);
    }

    // 3. Topologie 3 : Dossier Bus Audio pur -> esclave uniquement si un Maître explicite dirige ce groupe
    if (parent && parent.isBusFolder && !parent.isLinkFolder) {
      const explicitMaster = findExplicitMasterOnBus(parentIdStr, allTracks);
      return Boolean(explicitMaster && track.id !== explicitMaster.id);
    }

    // 4. Fratrie liée partageant un identifiant commun avec un maître explicite
    const groupTracks = getLinkedGroupMembers(track, allTracks);
    const explicitMaster = groupTracks.find((t) => t.isLinkMaster === true);
    if (explicitMaster) return track.id !== explicitMaster.id;
  }

  return false;
}

export function resolveMasterTrack(trackId: number, tracks: TrackGroup[]): TrackGroup | undefined {
  const current = tracks.find((t) => t.id === trackId);
  if (!current) return undefined;

  if (current.isBusFolder || current.isLinkFolder) {
    const directChildren = tracks.filter(
      (t) => !t.isBusFolder && !t.isLinkFolder && (String(t.linkedToTrackId) === String(current.id) || String(t.busId) === String(current.id))
    );
    return directChildren.find((t) => t.isLinkMaster === true) || directChildren[0] || current;
  }

  if (isSlaveTrack(current, tracks)) {
    const parent = tracks.find((t) => String(t.id) === String(current.linkedToTrackId));
    if (parent && !parent.isBusFolder && !parent.isLinkFolder) return parent;

    const groupTracks = getLinkedGroupMembers(current, tracks);
    return groupTracks.find((t) => t.isLinkMaster === true) || groupTracks[0] || current;
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
  if (currentPatternId) {
    const byId = masterTrack.patterns.find((p) => p.id === currentPatternId);
    if (byId) return byId.id;
  }
  const currentPattern = currentTrack?.patterns?.find((p) => p.id === currentPatternId);
  if (currentPattern?.name) {
    const normName = currentPattern.name.trim().toLowerCase();
    const byName = masterTrack.patterns.find((p) => p.name.trim().toLowerCase() === normName);
    if (byName) return byName.id;
  }
  if (currentTrack?.patterns && currentPattern) {
    const idx = currentTrack.patterns.indexOf(currentPattern);
    if (idx >= 0 && masterTrack.patterns[idx]) return masterTrack.patterns[idx].id;
  }
  return masterTrack.patterns[0]?.id;
}
