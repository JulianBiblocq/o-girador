import { TrackGroup, Pattern } from '../../types';
import { canTransferPatterns, resolveTrackInstrumentId } from '../../utils/instrumentCompatibility';
import { normalizePatternStepsForTarget } from '../../utils/patternPasteNormalizer';
import { getNextPatternName } from '../../utils/patternNaming';
import { isSlaveTrack, resolveMasterTrack } from '../../utils/trackMasterResolver';
import { syncMasterPatternsToLinkedFamily } from '../../utils/trackLinkingSync';
import { isToadaBus, isToadaChild } from './trackVisibilityHelpers';
import { InstrumentPatternsClipboard } from '../slices/clipboardSliceTypes';

export const pasteAllTrackPatternsState = (
  tracks: TrackGroup[],
  clip: InstrumentPatternsClipboard,
  targetTrackId: number,
  modeOrApplyTimeline: boolean | 'libraryOnly' | 'libraryAndTimeline' = false,
  totalMeasures = 4,
  lang = 'fr'
): { tracks: TrackGroup[]; message: string } | null => {
  if (!clip || !clip.patterns || clip.patterns.length === 0) return null;

  const rawTargetTrack = tracks.find((t) => t.id === targetTrackId || String(t.id) === String(targetTrackId));
  if (!rawTargetTrack) return null;
  if (rawTargetTrack.isBusFolder && !rawTargetTrack.isLinkFolder && !isToadaBus(rawTargetTrack)) return null;

  let effectiveTargetTrack = rawTargetTrack;
  if (rawTargetTrack.isLinkFolder) {
    const masterChild = resolveMasterTrack(rawTargetTrack.id, tracks);
    if (masterChild && masterChild.id !== rawTargetTrack.id) effectiveTargetTrack = masterChild;
  } else if (isSlaveTrack(rawTargetTrack, tracks)) {
    const master = resolveMasterTrack(rawTargetTrack.id, tracks);
    if (master && master.id !== rawTargetTrack.id) effectiveTargetTrack = master;
  } else if (isToadaBus(rawTargetTrack) && (!rawTargetTrack.patterns || rawTargetTrack.patterns.length === 0)) {
    const vocalChild = tracks.find((t) => isToadaChild(t, tracks));
    if (vocalChild) effectiveTargetTrack = vocalChild;
  }

  if (!canTransferPatterns(clip, effectiveTargetTrack, tracks)) return null;

  const targetType = resolveTrackInstrumentId(effectiveTargetTrack, tracks);
  const applyTimeline = typeof modeOrApplyTimeline === 'boolean' ? modeOrApplyTimeline : modeOrApplyTimeline === 'libraryAndTimeline';
  const count = clip.patterns.length;
  const message = lang === 'fr'
    ? `${count} motif${count > 1 ? 's' : ''} collé${count > 1 ? 's' : ''}`
    : `${count} padrão(ões) colado(s)`;

  const existingPatterns = [...(effectiveTargetTrack.patterns || [])];
  const accNewPatterns: Pattern[] = [];

  clip.patterns.forEach((p, idx) => {
    const clonedP: Pattern = normalizePatternStepsForTarget(JSON.parse(JSON.stringify(p)), targetType);
    clonedP.id = Date.now() + Math.floor(Math.random() * 100000) + idx;
    clonedP.name = getNextPatternName([...existingPatterns, ...accNewPatterns], p.name, lang);
    const assignments = applyTimeline && clonedP.measureAssignments ? [...clonedP.measureAssignments] : [];
    while (assignments.length < totalMeasures) assignments.push(false);
    clonedP.measureAssignments = assignments.slice(0, totalMeasures);
    accNewPatterns.push(clonedP);
  });

  const targetId = effectiveTargetTrack.id;
  const updatedPatterns = [...existingPatterns, ...accNewPatterns];
  let nextTracks = tracks.map((t) =>
    t.id === targetId || String(t.id) === String(targetId)
      ? { ...t, patterns: updatedPatterns, selectedPatternId: accNewPatterns[0]?.id || t.selectedPatternId || updatedPatterns[0]?.id || 0 }
      : t
  );

  if (effectiveTargetTrack.isLinkMaster === true && !effectiveTargetTrack.isBusFolder && !effectiveTargetTrack.isLinkFolder) {
    nextTracks = syncMasterPatternsToLinkedFamily(nextTracks, effectiveTargetTrack.id).tracks;
  }

  return { tracks: nextTracks, message };
};
