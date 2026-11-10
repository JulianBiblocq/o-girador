import { Track, Pattern, PatternVariation } from '../../types';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { resolveCurrentPattern } from '../../utils/variationResolver';
import { resolveActivePattern } from '../../workers/compiler/patternResolver';
import { buildMeasureVariationNotes } from './variationMeasureNotePacker';

type StepArray = (string | number | [string, string])[];

export interface MeasureVariationSnapshot {
  seqId: number; measureIdx: number; stepsByTrackId: Record<number, StepArray>;
  variedPatternsByTrackId: Map<number, { pattern: Pattern; variation: PatternVariation }>;
  patternIdByTrackId: Record<number, number | null>; variedTrackIds: Set<number>; variationNotes: number[];
}

let prevSnapshot: MeasureVariationSnapshot | null = null;
let currentSnapshot: MeasureVariationSnapshot | null = null;
let nextSnapshot: MeasureVariationSnapshot | null = null;
const snapshotsByMeasure = new Map<number, MeasureVariationSnapshot>();
const snapshotsBySeqId = new Map<number, MeasureVariationSnapshot>();
let lastPlayedPatternIdByTrack: Record<number, number | null> = {};
let lastHorizonPatternIdByTrack: Record<number, number | null> = {};
let currentVariationNotes: number[] = [];
let currentVariedTrackIds = new Set<number>();
let visualCurrMeasureIdx: number | null = null, visualCurrStepsByTrackId: Record<number, StepArray> | null = null;
let visualPrevMeasureIdx: number | null = null, visualPrevStepsByTrackId: Record<number, StepArray> | null = null;
let lastVisualRatio = 0;

function rollMeasureVariations(
  seqId: number, measureIdx: number, measureStartTick: number, timeSig: string,
  tracks: Track[], soloPatternPlayId: number | null, soloPatternVariationId: string | null,
  precedingPatternIdByTrack: Record<number, number | null>
): MeasureVariationSnapshot {
  const store = useSequencerStore.getState();
  const isSoloPlayActive = soloPatternPlayId !== null, isolateBaseOnly = Boolean(store.isolateBaseOnly);
  const stepsByTrackId: Record<number, StepArray> = {};
  const variedPatternsByTrackId = new Map<number, { pattern: Pattern; variation: PatternVariation }>();
  const patternIdByTrackId: Record<number, number | null> = {};

  tracks.forEach((track) => {
    if (track.isBusFolder) return;
    const activePattern = resolveActivePattern(track, tracks, measureIdx, isSoloPlayActive, soloPatternPlayId);
    if (!activePattern) { patternIdByTrackId[track.id] = null; return; }
    patternIdByTrackId[track.id] = activePattern.id;
    const isEnteringPatternBlock = precedingPatternIdByTrack[track.id] !== activePattern.id;
    const resolved = resolveCurrentPattern({
      pattern: activePattern, trackId: track.id, measureIdx,
      currentPlayCount: isEnteringPatternBlock ? 0 : 1, isFirstPassConsumed: !isEnteringPatternBlock,
      isolateBaseOnly, isSoloPlayActive, soloPatternPlayId, soloPatternVariationId,
    });
    stepsByTrackId[track.id] = resolved.steps;
    if (resolved.matchedVariation) variedPatternsByTrackId.set(track.id, { pattern: activePattern, variation: resolved.matchedVariation });
  });

  const variedTrackIds = new Set(variedPatternsByTrackId.keys());
  const variationNotes = buildMeasureVariationNotes({ tracks, measureIdx, measureStartTick, timeSig: timeSig || '4/4', variedPatternsByTrackId });
  return { seqId, measureIdx, stepsByTrackId, variedPatternsByTrackId, patternIdByTrackId, variedTrackIds, variationNotes };
}

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

export function getLiveVariationAudioOverride() { return { variedTrackIds: currentVariedTrackIds, variationNotes: currentVariationNotes }; }
export function getLiveVariationRodaSnapshots(targetNextMeasureIdx?: number) {
  const nextSteps = (targetNextMeasureIdx !== undefined && snapshotsByMeasure.has(targetNextMeasureIdx)) ? snapshotsByMeasure.get(targetNextMeasureIdx)!.stepsByTrackId : (nextSnapshot?.stepsByTrackId ?? null);
  return { hasPrevMeasure: visualPrevMeasureIdx !== null, prevMeasureIdx: visualPrevMeasureIdx ?? prevSnapshot?.measureIdx ?? null, prevStepsByTrackId: visualPrevStepsByTrackId, currentMeasureIdx: visualCurrMeasureIdx ?? currentSnapshot?.measureIdx ?? null, currentStepsByTrackId: visualCurrStepsByTrackId ?? currentSnapshot?.stepsByTrackId ?? null, nextMeasureIdx: targetNextMeasureIdx ?? nextSnapshot?.measureIdx ?? null, nextStepsByTrackId: nextSteps };
}
