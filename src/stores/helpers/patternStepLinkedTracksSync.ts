/**
 * O Girador - Synchronisation automatique Maître ➔ Esclaves & Familles liées (< 90 lignes).
 */

import { TrackGroup, Pattern } from '../../types';
import { getTrackFamilyIds } from './trackMixerSelectors';

/**
 * Met à jour un motif sur toute la famille liée (Dossier, Maître et Esclaves).
 */
export function syncPatternAcrossLinkedFamily(
  tracks: TrackGroup[],
  sourceTrackId: number | string,
  patternId: number | string,
  updater: (pattern: Pattern, isSourceTrack: boolean, track: TrackGroup) => Pattern
): TrackGroup[] {
  const familyIds = new Set(getTrackFamilyIds(sourceTrackId, tracks));
  const sourceTrack = tracks.find((t) => String(t.id) === String(sourceTrackId));
  const sourcePattern = sourceTrack?.patterns.find((p) => String(p.id) === String(patternId));
  const sourcePatternName = sourcePattern?.name;
  const sourcePatternIndex = sourceTrack?.patterns.findIndex((p) => String(p.id) === String(patternId)) ?? -1;

  return tracks.map((t) => {
    if (!familyIds.has(String(t.id))) return t;

    const isSourceTrack = String(t.id) === String(sourceTrackId);
    let matchedInTrack = false;

    const nextPatterns = t.patterns.map((p, idx) => {
      const isMatch = isSourceTrack
        ? String(p.id) === String(patternId)
        : String(p.id) === String(patternId) ||
          (Boolean(sourcePatternName) && p.name === sourcePatternName) ||
          (!matchedInTrack && sourcePatternIndex !== -1 && idx === sourcePatternIndex);

      if (isMatch) {
        matchedInTrack = true;
        return updater(p, isSourceTrack, t);
      }
      return p;
    });

    return { ...t, patterns: nextPatterns };
  });
}

/**
 * Synchronise les assignations de mesure d'un motif sur les pistes liées
 * en respectant les overrides explicites des esclaves.
 */
export function syncAssignmentsAcrossLinkedFamily(
  tracks: TrackGroup[],
  sourceTrackId: number | string,
  patternId: number | string,
  measureAssignments: boolean[]
): TrackGroup[] {
  return syncPatternAcrossLinkedFamily(tracks, sourceTrackId, patternId, (p, isSource, t) => {
    if (isSource) return { ...p, measureAssignments: [...measureAssignments] };
    const copyAssigns = [...(p.measureAssignments || [])];
    measureAssignments.forEach((assigned, mIdx) => {
      const hasOverride = (t as any).patternOverrides?.[mIdx] !== undefined;
      if (!hasOverride) {
        copyAssigns[mIdx] = assigned;
      }
    });
    return { ...p, measureAssignments: copyAssigns };
  });
}
