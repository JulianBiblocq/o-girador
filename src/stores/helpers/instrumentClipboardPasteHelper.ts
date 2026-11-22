import { TrackGroup, Pattern } from '../../types';
import { canTransferPatterns, resolveTrackInstrumentId } from '../../utils/instrumentCompatibility';
import { normalizePatternStepsForTarget } from '../../utils/patternPasteNormalizer';
import { getNextPatternName } from '../../utils/patternNaming';
import { isPatternCompletelySilent } from '../../utils/slavePatternCloneHelper';
import { isSlaveTrack, resolveMasterTrack } from '../../utils/trackMasterResolver';
import { syncMasterPatternsToLinkedFamily } from '../../utils/trackLinkingSync';
import { isToadaBus, isToadaChild } from './trackVisibilityHelpers';
import { InstrumentPatternsClipboard, PasteAllPatternsModeOrOptions } from '../slices/clipboardSliceTypes';

export function resolveEffectivePasteAllTargetTrack(tracks: TrackGroup[], targetTrackId: number): TrackGroup | null {
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
  return effectiveTargetTrack;
}

export function targetTrackHasNonEmptyPatterns(tracks: TrackGroup[], targetTrackId: number): boolean {
  const target = resolveEffectivePasteAllTargetTrack(tracks, targetTrackId);
  if (!target || !Array.isArray(target.patterns) || target.patterns.length === 0) return false;
  return target.patterns.some((p) => !isPatternCompletelySilent(p));
}

export const pasteAllTrackPatternsState = (
  tracks: TrackGroup[],
  clip: InstrumentPatternsClipboard,
  targetTrackId: number,
  modeOrApplyTimeline: PasteAllPatternsModeOrOptions = false,
  totalMeasures = 4,
  lang = 'fr'
): { tracks: TrackGroup[]; message: string } | null => {
  if (!clip || !clip.patterns || clip.patterns.length === 0) return null;

  const effectiveTargetTrack = resolveEffectivePasteAllTargetTrack(tracks, targetTrackId);
  if (!effectiveTargetTrack || !canTransferPatterns(clip, effectiveTargetTrack, tracks)) return null;

  const targetType = resolveTrackInstrumentId(effectiveTargetTrack, tracks);
  const isExplicitOptions = typeof modeOrApplyTimeline === 'object' && modeOrApplyTimeline !== null;
  const isReplace = isExplicitOptions && modeOrApplyTimeline.mode === 'replace';
  const applyTimeline = isExplicitOptions
    ? (modeOrApplyTimeline.applyTimeline ?? isReplace)
    : (typeof modeOrApplyTimeline === 'boolean' ? modeOrApplyTimeline : modeOrApplyTimeline === 'libraryAndTimeline');

  const count = clip.patterns.length;
  const message = lang === 'fr'
    ? (isReplace ? `${count} motif${count > 1 ? 's' : ''} remplacé${count > 1 ? 's' : ''}` : `${count} motif${count > 1 ? 's' : ''} ajouté${count > 1 ? 's' : ''}`)
    : (isReplace ? `${count} padrão(ões) substituído(s)` : `${count} padrão(ões) adicionado(s)`);

  const existingPatterns = isReplace ? [] : [...(effectiveTargetTrack.patterns || [])];
  const accNewPatterns: Pattern[] = [];

  clip.patterns.forEach((p, idx) => {
    const clonedP: Pattern = normalizePatternStepsForTarget(JSON.parse(JSON.stringify(p)), targetType);
    clonedP.id = Date.now() + Math.floor(Math.random() * 100000) + idx;
    clonedP.name = isReplace
      ? (p.name?.trim() || `${lang === 'fr' ? 'Motif' : 'Padrão'} ${idx + 1}`)
      : getNextPatternName([...existingPatterns, ...accNewPatterns], p.name, lang);
    const assignments = applyTimeline && clonedP.measureAssignments ? [...clonedP.measureAssignments] : [];
    while (assignments.length < totalMeasures) assignments.push(false);
    clonedP.measureAssignments = assignments.slice(0, totalMeasures);
    accNewPatterns.push(clonedP);
  });

  const targetId = effectiveTargetTrack.id;
  const updatedPatterns = isReplace ? accNewPatterns : [...existingPatterns, ...accNewPatterns];
  let nextTracks = tracks.map((t) => {
    if (t.id === targetId || String(t.id) === String(targetId)) {
      const nextSel = isReplace ? (accNewPatterns[0]?.id || 0) : (accNewPatterns[0]?.id || t.selectedPatternId || updatedPatterns[0]?.id || 0);
      return { ...t, patterns: updatedPatterns, selectedPatternId: nextSel };
    }
    if (isReplace && isSlaveTrack(t, tracks) && resolveMasterTrack(t.id, tracks)?.id === targetId) {
      return { ...t, patterns: [], patternOverrides: undefined };
    }
    return t;
  });

  if (effectiveTargetTrack.isLinkMaster === true && !effectiveTargetTrack.isBusFolder && !effectiveTargetTrack.isLinkFolder) {
    nextTracks = syncMasterPatternsToLinkedFamily(nextTracks, effectiveTargetTrack.id).tracks;
  }

  return { tracks: nextTracks, message };
};

export function executePasteAllTrackPatternsAction(
  state: any,
  set: (partial: any) => void,
  targetTrackId: number,
  modeOrApplyTimeline?: PasteAllPatternsModeOrOptions
): void {
  const clip = state.instrumentPatternsClipboard;
  if (!clip) return;
  const isExplicitObj = typeof modeOrApplyTimeline === 'object' && modeOrApplyTimeline !== null;
  let effectiveOpts: PasteAllPatternsModeOrOptions = modeOrApplyTimeline ?? { mode: 'replace', applyTimeline: true };

  if (!isExplicitObj) {
    const target = resolveEffectivePasteAllTargetTrack(state.tracks, targetTrackId);
    if (!target || !canTransferPatterns(clip, target, state.tracks)) return;
    const defaultApplyTimeline = modeOrApplyTimeline === 'libraryOnly' || modeOrApplyTimeline === false ? false : true;
    if (targetTrackHasNonEmptyPatterns(state.tracks, targetTrackId)) {
      set({ pendingPasteAllRequest: { targetTrackId, defaultApplyTimeline } });
      return;
    }
    effectiveOpts = { mode: 'replace', applyTimeline: defaultApplyTimeline };
  }

  const res = pasteAllTrackPatternsState(state.tracks, clip, targetTrackId, effectiveOpts, state.totalMeasures, state.lang);
  if (!res) return;
  state.pushUndoState();
  set({ tracks: res.tracks, tracksVersion: (state.tracksVersion || 0) + 1 });
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('app-toast', { detail: { type: 'success', message: res.message } }));
  }
}
