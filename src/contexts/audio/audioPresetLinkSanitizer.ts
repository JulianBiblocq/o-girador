/**
 * audioPresetLinkSanitizer.ts
 * Assainissement systématique des liens de pistes et dissociation stricte Bus Audio vs Track Linking (< 60 lignes).
 */
import { TrackGroup } from '../../types';

export function sanitizeTrackLinkingAndBuses(tracks: TrackGroup[]): TrackGroup[] {
  // 1. Détection des 3 Alfaias indépendantes avec des motifs distincts
  const alfaias = tracks.filter((t) => !t.isBusFolder && !t.isLinkFolder && (t.instrumentIdx === 0 || t.instrumentIdx === 1 || t.instrumentIdx === 2));
  const hasMultipleAlfaias = alfaias.length >= 2;
  const haveDistinctPatterns = hasMultipleAlfaias && alfaias.some((a, i) => {
    const next = alfaias[(i + 1) % alfaias.length];
    return a.patterns && next.patterns && (a.patterns.length !== next.patterns.length || a.patterns[0]?.id !== next.patterns[0]?.id);
  });

  return tracks.map((track) => {
    // Si c'est le bus ALFAIAS alors que les tambours ont des motifs distincts, forcer isLinkFolder = false
    if (track.isBusFolder && track.customName?.toUpperCase().includes('ALFAIA') && haveDistinctPatterns) {
      return { ...track, isLinkFolder: false };
    }

    // Si c'est une Alfaia indépendante dans ce contexte
    if ((track.instrumentIdx === 0 || track.instrumentIdx === 1 || track.instrumentIdx === 2) && haveDistinctPatterns) {
      return { ...track, isLinkMaster: false, isLinkFolder: false, linkedToTrackId: undefined };
    }

    if (!track.linkedToTrackId) return track;

    const parent = tracks.find((p) => String(p.id) === String(track.linkedToTrackId));
    // Si le parent est un pur bus audio (et non un dossier de linking) : nettoyer linkedToTrackId
    if (parent && parent.isBusFolder && !parent.isLinkFolder) {
      return {
        ...track,
        busId: track.busId || String(parent.id),
        linkedToTrackId: undefined,
        isLinkMaster: false,
      };
    }

    return track;
  });
}
