/**
 * O Girador - Synchronisation automatique Maître -> Esclaves & Familles liées (< 120 lignes).
 */
import { TrackGroup, Pattern, PatternVariation } from '../../types';
import { isSlaveTrack, resolveMasterTrack } from '../../utils/trackMasterResolver';

function findMatchingPatternIndex(
  patterns: Pattern[], targetPatternId: number | string, normSource: string | undefined,
  sourcePatternIdx: number, sourcePatternsCount: number, isSourceTrack: boolean
): number {
  if (isSourceTrack) return patterns.findIndex((p) => String(p.id) === String(targetPatternId));
  let idx = patterns.findIndex((p) => String(p.id) === String(targetPatternId));
  if (idx !== -1) return idx;
  if (normSource) {
    idx = patterns.findIndex((p) => p.name?.trim().toLowerCase() === normSource);
    if (idx !== -1) return idx;
  }
  return (sourcePatternIdx >= 0 && patterns.length === sourcePatternsCount) ? sourcePatternIdx : -1;
}

export function syncPatternAcrossLinkedFamily(
  tracks: TrackGroup[], sourceTrackId: number | string, patternId: number | string,
  updater: (pattern: Pattern, isSourceTrack: boolean, track: TrackGroup) => Pattern
): TrackGroup[] {
  const sourceTrack = tracks.find((t) => String(t.id) === String(sourceTrackId));
  if (!sourceTrack) return tracks;

  const isMaster = Boolean(sourceTrack.isLinkMaster && !sourceTrack.isBusFolder && !sourceTrack.isLinkFolder);
  const isLinkFolderSource = Boolean(sourceTrack.isLinkFolder);
  const sourcePatternIdx = sourceTrack.patterns.findIndex((p) => String(p.id) === String(patternId));
  const sourcePattern = sourcePatternIdx >= 0 ? sourceTrack.patterns[sourcePatternIdx] : undefined;
  const normSource = sourcePattern?.name?.trim().toLowerCase();

  if (!isMaster && !isLinkFolderSource) {
    return tracks.map((t) => {
      if (String(t.id) !== String(sourceTrackId)) return t;
      return { ...t, patterns: t.patterns.map((p) => (String(p.id) === String(patternId) ? updater(p, true, t) : p)) };
    });
  }

  const targetTrackIds = new Set<string>();
  if (isLinkFolderSource) {
    tracks.forEach((t) => {
      if (String(t.id) === String(sourceTrackId)) return;
      if (!t.isBusFolder && !t.isLinkFolder &&
          (String(t.linkedToTrackId) === String(sourceTrack.id) || String(t.busId) === String(sourceTrack.id))) {
        targetTrackIds.add(String(t.id));
      }
    });
  } else if (isMaster) {
    const parentFolderId = sourceTrack.busId || sourceTrack.linkedToTrackId || (sourceTrack as any).parentId;
    tracks.forEach((t) => {
      if (String(t.id) === String(sourceTrackId)) return;
      if (isSlaveTrack(t, tracks) && resolveMasterTrack(t.id, tracks)?.id === sourceTrack.id) {
        targetTrackIds.add(String(t.id));
      }
      if (parentFolderId && String(t.id) === String(parentFolderId) && t.isLinkFolder) {
        targetTrackIds.add(String(t.id));
      }
    });
  }

  return tracks.map((t) => {
    const isSourceTrack = String(t.id) === String(sourceTrackId);
    if (!isSourceTrack && !targetTrackIds.has(String(t.id))) return t;

    const targetIdx = findMatchingPatternIndex(
      t.patterns, patternId, normSource, sourcePatternIdx, sourceTrack.patterns.length, isSourceTrack
    );
    if (targetIdx === -1) return t;

    const nextPatterns = [...t.patterns];
    nextPatterns[targetIdx] = updater(nextPatterns[targetIdx], isSourceTrack, t);
    return { ...t, patterns: nextPatterns };
  });
}

export function syncVariationAcrossLinkedFamily(
  tracks: TrackGroup[], sourceTrackId: number | string, patternId: number | string,
  variationId: string, updater: (variation: PatternVariation, isSourceTrack: boolean, track: TrackGroup) => PatternVariation
): TrackGroup[] {
  const sourceTrack = tracks.find((t) => String(t.id) === String(sourceTrackId));
  const sourcePattern = sourceTrack?.patterns.find((p) => String(p.id) === String(patternId));
  const sourceVarIdx = sourcePattern?.variations?.findIndex((v) => String(v.id) === String(variationId)) ?? -1;
  const sourceVar = sourceVarIdx >= 0 ? sourcePattern?.variations?.[sourceVarIdx] : undefined;
  const normVarName = sourceVar?.name?.trim().toLowerCase();

  return syncPatternAcrossLinkedFamily(tracks, sourceTrackId, patternId, (p, isSourceTrack, t) => {
    if (!p.variations || p.variations.length === 0) return p;

    let targetVarIdx = p.variations.findIndex((v) => String(v.id) === String(variationId));
    if (targetVarIdx === -1 && !isSourceTrack) {
      if (normVarName) targetVarIdx = p.variations.findIndex((v) => v.name?.trim().toLowerCase() === normVarName);
      if (targetVarIdx === -1 && sourceVarIdx >= 0 && sourceVarIdx < p.variations.length) targetVarIdx = sourceVarIdx;
    }
    if (targetVarIdx === -1) return p;

    const nextVars = [...p.variations];
    nextVars[targetVarIdx] = updater(nextVars[targetVarIdx], isSourceTrack, t);
    return { ...p, variations: nextVars };
  });
}

export function syncAssignmentsAcrossLinkedFamily(
  tracks: TrackGroup[], sourceTrackId: number | string, patternId: number | string, measureAssignments: boolean[]
): TrackGroup[] {
  return syncPatternAcrossLinkedFamily(tracks, sourceTrackId, patternId, (p, isSource, t) => {
    if (isSource) return { ...p, measureAssignments: [...measureAssignments] };
    const copyAssigns = [...(p.measureAssignments || [])];
    measureAssignments.forEach((assigned, mIdx) => {
      if ((t as any).patternOverrides?.[mIdx] === undefined) copyAssigns[mIdx] = assigned;
    });
    return { ...p, measureAssignments: copyAssigns };
  });
}
