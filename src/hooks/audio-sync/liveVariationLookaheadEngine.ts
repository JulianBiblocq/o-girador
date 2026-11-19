import { Track } from '../../types';
import { MeasureVariationSnapshot, rollMeasureVariations, StepArray } from './rollMeasureVariations';

export type { MeasureVariationSnapshot };

let prevSnapshot: MeasureVariationSnapshot | null = null, currentSnapshot: MeasureVariationSnapshot | null = null, nextSnapshot: MeasureVariationSnapshot | null = null;
const snapshotsByMeasure = new Map<number, MeasureVariationSnapshot>();
const snapshotsBySeqId = new Map<number, MeasureVariationSnapshot>();
let lastPlayedPatternIdByTrack: Record<number, number | null> = {}, lastHorizonPatternIdByTrack: Record<number, number | null> = {};
let currentVariationNotes: number[] = [], currentVariedTrackIds = new Set<number>();
let visualCurrMeasureIdx: number | null = null, visualCurrStepsByTrackId: Record<number, StepArray> | null = null;
let visualPrevMeasureIdx: number | null = null, visualPrevStepsByTrackId: Record<number, StepArray> | null = null;
let lastVisualRatio = 0;

function pruneOldSeqSnapshots(minKeepSeqId: number): void {
  for (const k of snapshotsBySeqId.keys()) { if (k < minKeepSeqId) snapshotsBySeqId.delete(k); }
}

export function getOrRollMeasureVariationForHorizon(params: {
  seqId: number; measureIdx: number; measureStartTick: number; timeSig: string;
  tracks: Track[]; soloPatternPlayId: number | null; soloPatternVariationId: string | null;
}): MeasureVariationSnapshot {
  const existing = snapshotsBySeqId.get(params.seqId);
  if (existing && existing.measureIdx === params.measureIdx) return existing;
  const prevSnap = snapshotsBySeqId.get(params.seqId - 1);
  const preceding = prevSnap ? prevSnap.patternIdByTrackId : lastHorizonPatternIdByTrack;
  const snap = rollMeasureVariations(
    params.seqId, params.measureIdx, params.measureStartTick, params.timeSig,
    params.tracks, params.soloPatternPlayId, params.soloPatternVariationId, preceding
  );
  lastHorizonPatternIdByTrack = { ...snap.patternIdByTrackId };
  snapshotsBySeqId.set(params.seqId, snap);
  snapshotsByMeasure.set(params.measureIdx, snap);
  pruneOldSeqSnapshots(params.seqId - 4);
  return snap;
}

export function invalidateFutureVariationSnapshots(afterSeqId: number): void {
  for (const k of snapshotsBySeqId.keys()) { if (k > afterSeqId) snapshotsBySeqId.delete(k); }
  const baseSnap = snapshotsBySeqId.get(afterSeqId) ?? currentSnapshot;
  lastHorizonPatternIdByTrack = baseSnap ? { ...baseSnap.patternIdByTrackId } : { ...lastPlayedPatternIdByTrack };
}

export function resetLiveVariationLookahead(activeVariationsRef?: { current: Record<number, any> }): void {
  prevSnapshot = null; currentSnapshot = null; nextSnapshot = null;
  snapshotsByMeasure.clear(); snapshotsBySeqId.clear();
  lastPlayedPatternIdByTrack = {}; lastHorizonPatternIdByTrack = {};
  currentVariationNotes = []; currentVariedTrackIds = new Set<number>();
  visualCurrMeasureIdx = null; visualCurrStepsByTrackId = null;
  visualPrevMeasureIdx = null; visualPrevStepsByTrackId = null; lastVisualRatio = 0;
  if (activeVariationsRef) activeVariationsRef.current = {};
}

export function advanceLiveVariationLookahead(params: {
  currentMeasureIdx: number; nextMeasureIdx: number; currentMeasureStartTick: number;
  tracks: Track[]; measureTimeSigs: Record<number, string> | string[];
  soloPatternPlayId: number | null; soloPatternVariationId: string | null;
  activeVariationsRef?: { current: Record<number, any> }; currentMeasureSeqId?: number; nextMeasureStartTick?: number;
}): void {
  const { currentMeasureIdx, nextMeasureIdx, currentMeasureStartTick, tracks, measureTimeSigs, soloPatternPlayId, soloPatternVariationId, activeVariationsRef, currentMeasureSeqId } = params;
  if (currentSnapshot) prevSnapshot = currentSnapshot;
  const currSig = measureTimeSigs[currentMeasureIdx] || '4/4', nextSig = measureTimeSigs[nextMeasureIdx] || '4/4';

  if (currentMeasureSeqId !== undefined) {
    currentSnapshot = getOrRollMeasureVariationForHorizon({ seqId: currentMeasureSeqId, measureIdx: currentMeasureIdx, measureStartTick: currentMeasureStartTick, timeSig: currSig, tracks, soloPatternPlayId, soloPatternVariationId });
    nextSnapshot = getOrRollMeasureVariationForHorizon({ seqId: currentMeasureSeqId + 1, measureIdx: nextMeasureIdx, measureStartTick: params.nextMeasureStartTick ?? 0, timeSig: nextSig, tracks, soloPatternPlayId, soloPatternVariationId });
    pruneOldSeqSnapshots(currentMeasureSeqId - 2);
  } else {
    currentSnapshot = (nextSnapshot && nextSnapshot.measureIdx === currentMeasureIdx) ? nextSnapshot : rollMeasureVariations(-1, currentMeasureIdx, currentMeasureStartTick, currSig, tracks, soloPatternPlayId, soloPatternVariationId, lastPlayedPatternIdByTrack);
    snapshotsByMeasure.set(currentMeasureIdx, currentSnapshot);
    nextSnapshot = rollMeasureVariations(-1, nextMeasureIdx, 0, nextSig, tracks, soloPatternPlayId, soloPatternVariationId, currentSnapshot.patternIdByTrackId);
    snapshotsByMeasure.set(nextMeasureIdx, nextSnapshot);
  }
  lastPlayedPatternIdByTrack = { ...currentSnapshot.patternIdByTrackId };
  if (activeVariationsRef && visualCurrMeasureIdx === null) activeVariationsRef.current = currentSnapshot.stepsByTrackId;
  currentVariedTrackIds = currentSnapshot.variedTrackIds; currentVariationNotes = currentSnapshot.variationNotes;
}

export function recalculateLookaheadForQueuedMeasure(queuedMeasureIdx: number, tracks: Track[], soloPatternPlayId: number | null = null, soloPatternVariationId: string | null = null): void {
  const preceding = currentSnapshot?.patternIdByTrackId ?? lastPlayedPatternIdByTrack;
  nextSnapshot = rollMeasureVariations(-1, queuedMeasureIdx, 0, '4/4', tracks, soloPatternPlayId, soloPatternVariationId, preceding);
  snapshotsByMeasure.set(queuedMeasureIdx, nextSnapshot);
}

export function syncStepExploreVariationSnapshots(params: {
  prevMeasureIdx: number | null; currentMeasureIdx: number; nextMeasureIdx: number; playheadRatio: number;
  tracks: Track[]; measureTimeSigs: Record<number, string> | string[];
  soloPatternPlayId: number | null; soloPatternVariationId: string | null;
  activeVariationsRef?: { current: Record<number, any> };
}): MeasureVariationSnapshot {
  const { prevMeasureIdx, currentMeasureIdx, nextMeasureIdx, playheadRatio, tracks, measureTimeSigs, soloPatternPlayId, soloPatternVariationId, activeVariationsRef } = params;
  const getOrRoll = (mIdx: number, preceding: Record<number, number | null>): MeasureVariationSnapshot => {
    const cached = snapshotsByMeasure.get(mIdx);
    if (cached) return cached;
    const sig = measureTimeSigs?.[mIdx] || '4/4';
    const rolled = rollMeasureVariations(-1, mIdx, 0, sig, tracks, soloPatternPlayId, soloPatternVariationId, preceding);
    snapshotsByMeasure.set(mIdx, rolled);
    return rolled;
  };
  const prevSnap = prevMeasureIdx !== null ? getOrRoll(prevMeasureIdx, lastPlayedPatternIdByTrack) : null;
  const currSnap = getOrRoll(currentMeasureIdx, prevSnap ? prevSnap.patternIdByTrackId : lastPlayedPatternIdByTrack);
  const nextSnap = getOrRoll(nextMeasureIdx, currSnap.patternIdByTrackId);
  prevSnapshot = prevSnap; currentSnapshot = currSnap; nextSnapshot = nextSnap;
  lastPlayedPatternIdByTrack = { ...currSnap.patternIdByTrackId };
  visualPrevMeasureIdx = prevMeasureIdx; visualPrevStepsByTrackId = prevSnap ? prevSnap.stepsByTrackId : null;
  visualCurrMeasureIdx = currentMeasureIdx; visualCurrStepsByTrackId = currSnap.stepsByTrackId;
  lastVisualRatio = ((playheadRatio % 1) + 1) % 1;
  currentVariedTrackIds = currSnap.variedTrackIds; currentVariationNotes = currSnap.variationNotes;
  if (activeVariationsRef) activeVariationsRef.current = currSnap.stepsByTrackId;
  return currSnap;
}

export function syncLiveVariationRodaVisualFrame(isPlaying: boolean, visualMeasureIdx: number, playheadRatio: number, activeVariationsRef?: { current: Record<number, any> }): void {
  if (!isPlaying) { visualCurrMeasureIdx = null; visualCurrStepsByTrackId = null; visualPrevMeasureIdx = null; visualPrevStepsByTrackId = null; lastVisualRatio = 0; return; }
  const snapSteps = snapshotsByMeasure.get(visualMeasureIdx)?.stepsByTrackId ?? currentSnapshot?.stepsByTrackId ?? null;
  const r = ((playheadRatio % 1) + 1) % 1;
  if (visualCurrMeasureIdx === null) { visualCurrMeasureIdx = visualMeasureIdx; visualCurrStepsByTrackId = snapSteps; visualPrevMeasureIdx = null; visualPrevStepsByTrackId = null; }
  else if (visualMeasureIdx !== visualCurrMeasureIdx || (r < 0.25 && lastVisualRatio > 0.75)) { visualPrevMeasureIdx = visualCurrMeasureIdx; visualPrevStepsByTrackId = visualCurrStepsByTrackId; visualCurrMeasureIdx = visualMeasureIdx; visualCurrStepsByTrackId = snapSteps; }
  else if (!visualCurrStepsByTrackId && snapSteps) visualCurrStepsByTrackId = snapSteps;
  lastVisualRatio = r;
  if (activeVariationsRef && visualCurrStepsByTrackId) activeVariationsRef.current = visualCurrStepsByTrackId;
}

export function getMeasureVariationSnapshot(measureIdx: number): MeasureVariationSnapshot | undefined {
  return snapshotsByMeasure.get(measureIdx) ?? (currentSnapshot?.measureIdx === measureIdx ? currentSnapshot : undefined);
}
export function getLiveVariationAudioOverride() { return { variedTrackIds: currentVariedTrackIds, variationNotes: currentVariationNotes }; }
export function getLiveVariationRodaSnapshots(targetNextMeasureIdx?: number) {
  const nextSteps = (targetNextMeasureIdx !== undefined && snapshotsByMeasure.has(targetNextMeasureIdx)) ? snapshotsByMeasure.get(targetNextMeasureIdx)!.stepsByTrackId : (nextSnapshot?.stepsByTrackId ?? null);
  return { hasPrevMeasure: visualPrevMeasureIdx !== null, prevMeasureIdx: visualPrevMeasureIdx ?? prevSnapshot?.measureIdx ?? null, prevStepsByTrackId: visualPrevStepsByTrackId, currentMeasureIdx: visualCurrMeasureIdx ?? currentSnapshot?.measureIdx ?? null, currentStepsByTrackId: visualCurrStepsByTrackId ?? currentSnapshot?.stepsByTrackId ?? null, nextMeasureIdx: targetNextMeasureIdx ?? nextSnapshot?.measureIdx ?? null, nextStepsByTrackId: nextSteps };
}
