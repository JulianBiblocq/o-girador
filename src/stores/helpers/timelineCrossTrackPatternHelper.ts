import { TrackGroup, Pattern } from '../../types';
import { canTransferPatterns, resolveTrackInstrumentId } from '../../utils/instrumentCompatibility';
import { normalizePatternStepsForTarget } from '../../utils/patternPasteNormalizer';
import { getNextPatternName } from '../../utils/patternNaming';
import { TimelineClipboard } from './timelineClipboardTypes';

export function canPasteTimelineClipboard(
  tracks: TrackGroup[],
  clipboard: TimelineClipboard | null | undefined,
  activeTargetTrackId?: number | null
): boolean {
  if (!clipboard || !Array.isArray(clipboard.entries) || clipboard.entries.length === 0) {
    return false;
  }

  const uniqueCopiedTracks = Array.from(new Set(clipboard.entries.map((e) => e.trackId)));
  const isSingleTrackClipboard = uniqueCopiedTracks.length === 1;

  if (isSingleTrackClipboard) {
    const firstEntry = clipboard.entries[0];
    const sourceTrack = tracks.find((t) => t.id === firstEntry.trackId);
    const sourceRef = firstEntry.sourceInstId || sourceTrack;
    const destTrackId = activeTargetTrackId !== undefined && activeTargetTrackId !== null
      ? activeTargetTrackId
      : firstEntry.trackId;
    const targetTrack = tracks.find((t) => t.id === destTrackId);
    if (!targetTrack) return false;
    return canTransferPatterns(sourceRef, targetTrack, tracks);
  }

  return clipboard.entries.every((entry) => {
    const destTrackForEntry = tracks.find((t) => t.id === entry.trackId);
    if (!destTrackForEntry) return false;
    const sourceRef = entry.sourceInstId || destTrackForEntry;
    return canTransferPatterns(sourceRef, destTrackForEntry, tracks);
  });
}

export function ensureTimelinePatternOnDestTrack(
  destTrack: TrackGroup,
  patternId: number | null,
  sourcePattern: Pattern | null | undefined,
  tracks: TrackGroup[],
  totalMeasures: number,
  lang = 'fr',
  clonedIdMap?: Map<number, number>
): number | null {
  if (patternId === null || patternId === undefined) return null;
  if (destTrack.patterns.some((p) => p.id === patternId)) return patternId;

  if (clonedIdMap && clonedIdMap.has(patternId)) {
    const mappedId = clonedIdMap.get(patternId)!;
    if (destTrack.patterns.some((p) => p.id === mappedId)) return mappedId;
  }

  if (!sourcePattern) return null;

  const targetInstId = resolveTrackInstrumentId(destTrack, tracks);
  const cloned: Pattern = normalizePatternStepsForTarget(
    JSON.parse(JSON.stringify(sourcePattern)),
    targetInstId
  );
  const newId = Date.now() + Math.floor(Math.random() * 100000) + destTrack.patterns.length;
  cloned.id = newId;
  cloned.name = getNextPatternName(destTrack.patterns, sourcePattern.name, lang);
  cloned.measureAssignments = Array(totalMeasures).fill(false);

  destTrack.patterns.push(cloned);
  if (clonedIdMap) clonedIdMap.set(patternId, newId);
  return newId;
}

export function assignPatternAtMeasure(
  track: TrackGroup,
  patId: number | null,
  mIdx: number,
  allowVar?: boolean
): void {
  track.patterns.forEach((p) => {
    while (p.measureAssignments.length <= mIdx) p.measureAssignments.push(false);
    p.measureAssignments[mIdx] = Boolean(patId !== null && p.id === patId);
    const nextVariations = p.measureAllowVariations ? [...p.measureAllowVariations] : undefined;
    if (nextVariations && allowVar !== undefined && p.id === patId) {
      while (nextVariations.length <= mIdx) nextVariations.push(true);
      nextVariations[mIdx] = allowVar;
    }
    p.measureAllowVariations = nextVariations;
  });
}
