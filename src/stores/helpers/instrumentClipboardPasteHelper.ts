import { TrackGroup, Pattern } from '../../types';
import { instrumentsConfig } from '../../data';
import { canTransferPatterns, convertStepsToVocalRole } from '../../utils/instrumentCompatibility';
import { getNextPatternName } from '../../utils/patternNaming';
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

  const rawTargetTrack = tracks.find(t => t.id === targetTrackId || String(t.id) === String(targetTrackId));
  if (!rawTargetTrack) return null;

  let effectiveTargetTrack = rawTargetTrack;
  if (rawTargetTrack.linkedToTrackId) {
    const parentBus = tracks.find(t => String(t.id) === String(rawTargetTrack.linkedToTrackId) && t.isLinkFolder);
    if (parentBus) effectiveTargetTrack = parentBus;
  } else if (rawTargetTrack.isLinkMaster) {
    const parentBus = tracks.find(t => (String(t.id) === String(rawTargetTrack.id) || String(t.linkedToTrackId) === String(rawTargetTrack.id)) && t.isLinkFolder);
    if (parentBus) effectiveTargetTrack = parentBus;
  } else if (isToadaBus(rawTargetTrack) && (!rawTargetTrack.patterns || rawTargetTrack.patterns.length === 0)) {
    const vocalChild = tracks.find(t => isToadaChild(t, tracks));
    if (vocalChild) effectiveTargetTrack = vocalChild;
  }

  const sourceType = (clip.sourceType || clip.sourceInstId || '').toLowerCase();
  const targetInst = instrumentsConfig[effectiveTargetTrack.instrumentIdx];
  const targetType = (targetInst?.id || (isToadaBus(effectiveTargetTrack) ? 'toada' : '')).toLowerCase();

  if (!canTransferPatterns(sourceType || clip, targetType || effectiveTargetTrack)) return null;

  const isVocalTarget = targetType === 'puxador' || targetType === 'coro' || String(effectiveTargetTrack.id).includes('coro') || String(effectiveTargetTrack.id).includes('puxador');
  const vocalRole: 'P' | 'C' = (targetType === 'coro' || String(effectiveTargetTrack.id).toLowerCase().includes('coro')) ? 'C' : 'P';

  const applyTimeline = typeof modeOrApplyTimeline === 'boolean'
    ? modeOrApplyTimeline
    : modeOrApplyTimeline === 'libraryAndTimeline';

  const existingPatterns = [...(effectiveTargetTrack.patterns || [])];
  const accNewPatterns: Pattern[] = [];

  clip.patterns.forEach((p, idx) => {
    const clonedP: Pattern = JSON.parse(JSON.stringify(p));
    clonedP.id = Date.now() + Math.floor(Math.random() * 100000) + idx;
    clonedP.name = getNextPatternName([...existingPatterns, ...accNewPatterns], p.name, lang);

    if (isVocalTarget && clonedP.activeSteps) {
      clonedP.activeSteps = convertStepsToVocalRole(clonedP.activeSteps, vocalRole);
      if (clonedP.preRollActiveSteps) {
        clonedP.preRollActiveSteps = convertStepsToVocalRole(clonedP.preRollActiveSteps, vocalRole);
      }
    }

    if (!applyTimeline) {
      clonedP.measureAssignments = Array(totalMeasures).fill(false);
    } else {
      const assignments = clonedP.measureAssignments ? [...clonedP.measureAssignments] : [];
      while (assignments.length < totalMeasures) assignments.push(false);
      clonedP.measureAssignments = assignments.slice(0, totalMeasures);
    }

    accNewPatterns.push(clonedP);
  });

  const targetId = effectiveTargetTrack.id;
  const updatedPatterns = [...existingPatterns, ...accNewPatterns];

  const nextTracks = tracks.map(t => {
    if (t.id === targetId || String(t.id) === String(targetId)) {
      return {
        ...t,
        patterns: updatedPatterns,
        selectedPatternId: accNewPatterns[0]?.id || t.selectedPatternId || updatedPatterns[0]?.id || 0
      };
    }
    return t;
  });

  const count = accNewPatterns.length;
  const message = lang === 'fr'
    ? `${count} motif${count > 1 ? 's' : ''} collé${count > 1 ? 's' : ''}`
    : `${count} padrão(ões) colado(s)`;

  return { tracks: nextTracks, message };
};
