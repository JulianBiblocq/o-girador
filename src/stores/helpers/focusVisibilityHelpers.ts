import { TrackGroup } from '../../types';
import { applyRadii } from './trackRodaGeometryHelpers';
import { isToadaBus, isToadaChild } from './trackVisibilityHelpers';

/**
 * Calcule l'état `isHidden` strict en Mode Focus (1 instrument principal + 1 éventuel instrument secondaire max),
 * tout en préservant `isHidden = false` sur les dossiers de bus/liaison parents des pistes visibles.
 */
export const applyFocusTracksVisibility = (
  tracks: TrackGroup[],
  focusTrackId: number | null,
  referenceTrackId: number | null,
  rodaTrackOrder?: number[]
): TrackGroup[] => {
  if (focusTrackId === null) {
    return applyRadii(tracks, rodaTrackOrder);
  }

  const activeIds = new Set<number>([focusTrackId]);
  if (referenceTrackId !== null && referenceTrackId !== focusTrackId) {
    activeIds.add(referenceTrackId);
  }

  const activeContainerIds = new Set<string>();
  let isToadaVisible = false;

  tracks.forEach((t) => {
    if (activeIds.has(t.id)) {
      if (t.linkedToTrackId) activeContainerIds.add(String(t.linkedToTrackId));
      if (t.busId) activeContainerIds.add(String(t.busId));
      if (isToadaBus(t)) isToadaVisible = true;
    }
  });

  const updated = tracks.map((t) => {
    if (activeIds.has(t.id)) {
      return t.isHidden ? { ...t, isHidden: false } : t;
    }
    if ((t.isBusFolder || t.isLinkFolder) && !isToadaBus(t)) {
      const shouldKeepOpen = activeContainerIds.has(String(t.id));
      return t.isHidden === !shouldKeepOpen ? t : { ...t, isHidden: !shouldKeepOpen };
    }
    if (isToadaVisible && isToadaChild(t, tracks)) {
      return t.isHidden ? { ...t, isHidden: false } : t;
    }
    return t.isHidden ? t : { ...t, isHidden: true };
  });

  return applyRadii(updated, rodaTrackOrder);
};

/**
 * Restaure la visibilité standard de la Roda à la sortie du Mode Focus.
 */
export const restoreUnfocusedTracksVisibility = (
  tracks: TrackGroup[],
  rodaTrackOrder?: number[]
): TrackGroup[] => {
  const updated = tracks.map((t) => {
    const isLinkedSlave = Boolean(t.linkedToTrackId && !t.isLinkMaster && !t.isLinkFolder);
    return { ...t, isHidden: isLinkedSlave };
  });
  return applyRadii(updated, rodaTrackOrder);
};

/**
 * Gère le clic sur l'Œil [ 👁 ] :
 * - En Mode Focus (`isFocusActive === true`) : protège `focusTrackId` et garantit l'exclusivité stricte du 2e instrument (`referenceTrackId`).
 * - Hors Mode Focus (`isFocusActive === false`) : bascule librement `isHidden` sur la piste ciblée.
 */
export const handleFocusAwareTrackHideToggle = (
  state: {
    tracks: TrackGroup[];
    rodaTrackOrder?: number[];
    isFocusActive?: boolean;
    focusTrackId?: number | null;
    referenceTrackId?: number | null;
    tracksVersion?: number;
  },
  targetId: number
): { tracks: TrackGroup[]; referenceTrackId: number | null; tracksVersion: number } => {
  const { tracks, rodaTrackOrder, isFocusActive, focusTrackId, referenceTrackId = null, tracksVersion = 0 } = state;

  if (isFocusActive && focusTrackId !== null && focusTrackId !== undefined) {
    // Protection de l'instrument principal en Focus : il reste toujours visible
    if (targetId === focusTrackId) {
      return {
        tracks: applyFocusTracksVisibility(tracks, focusTrackId, referenceTrackId, rodaTrackOrder),
        referenceTrackId,
        tracksVersion: tracksVersion + 1,
      };
    }

    const targetTrack = tracks.find((t) => t.id === targetId);
    if (!targetTrack || ((targetTrack.isBusFolder || targetTrack.isLinkFolder) && !isToadaBus(targetTrack))) {
      return { tracks, referenceTrackId, tracksVersion };
    }

    // Cas A : la piste secondaire était masquée -> elle devient l'unique 2e instrument visible
    // Cas B : elle était déjà visible -> on l'éteint, seul focusTrackId reste affiché
    const nextReferenceId = targetTrack.isHidden ? targetId : null;
    return {
      tracks: applyFocusTracksVisibility(tracks, focusTrackId, nextReferenceId, rodaTrackOrder),
      referenceTrackId: nextReferenceId,
      tracksVersion: tracksVersion + 1,
    };
  }

  const nextTracks = applyRadii(
    tracks.map((t) => (t.id === targetId ? { ...t, isHidden: !t.isHidden } : t)),
    rodaTrackOrder
  );
  return { tracks: nextTracks, referenceTrackId, tracksVersion: tracksVersion + 1 };
};
