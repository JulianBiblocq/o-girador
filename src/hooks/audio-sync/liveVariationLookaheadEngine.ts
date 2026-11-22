import { Track } from '../../types';
import { getLiveMeasureSeqId } from '../../audio/visualTickBuffer';
import {
  applyStepExploreVisualState,
  buildLiveVariationRodaSnapshots,
  resetRodaVisualFrameState,
  rodaVisualState,
  updateRodaVisualFrameFromSnapshot,
} from './liveVariationRodaSync';
import {
  getVariationSnapshotBySeqOrMeasure,
  pruneOldSeqSnapshots,
  resetSnapshotStore,
  snapshotsByMeasure,
  snapshotsBySeqId,
  snapshotStore,
  syncAudibleTickVariationRef,
} from './liveVariationSnapshotStore';
import { MeasureVariationSnapshot, rollMeasureVariations } from './rollMeasureVariations';

export type { MeasureVariationSnapshot };
export { getVariationSnapshotBySeqOrMeasure, syncAudibleTickVariationRef };

export function getOrRollMeasureVariationForHorizon(params: {
  seqId: number; measureIdx: number; measureStartTick: number; timeSig: string;
  tracks: Track[]; soloPatternPlayId: number | null; soloPatternVariationId: string | null;
}): MeasureVariationSnapshot {
  const existing = snapshotsBySeqId.get(params.seqId);
  if (existing && existing.measureIdx === params.measureIdx && existing.measureStartTick === params.measureStartTick) return existing;
  const prevSnap = snapshotsBySeqId.get(params.seqId - 1) ?? null;
  const preceding = prevSnap ? prevSnap.patternIdByTrackId : snapshotStore.lastHorizonPatternIdByTrack;
  const snap = rollMeasureVariations(
    params.seqId, params.measureIdx, params.measureStartTick, params.timeSig,
    params.tracks, params.soloPatternPlayId, params.soloPatternVariationId, preceding, undefined, prevSnap
  );
  snapshotStore.lastHorizonPatternIdByTrack = { ...snap.patternIdByTrackId };
  snapshotsBySeqId.set(params.seqId, snap);
  pruneOldSeqSnapshots(params.seqId - 8);
  return snap;
}

export function invalidateFutureVariationSnapshots(afterSeqId: number, includeCurrent = false): void {
  for (const k of snapshotsBySeqId.keys()) {
    if (includeCurrent ? k >= afterSeqId : k > afterSeqId) snapshotsBySeqId.delete(k);
  }
  const baseSnap = snapshotsBySeqId.get(includeCurrent ? afterSeqId - 1 : afterSeqId) ?? snapshotStore.currentSnapshot;
  snapshotStore.lastHorizonPatternIdByTrack = baseSnap ? { ...baseSnap.patternIdByTrackId } : { ...snapshotStore.lastPlayedPatternIdByTrack };
}

export function syncCurrentVariationOverrideFromSeq(seqId: number, activeVariationsRef?: { current: Record<number, any> }): void {
  const snap = snapshotsBySeqId.get(seqId);
  if (!snap) return;
  snapshotStore.currentSnapshot = snap;
  snapshotsByMeasure.set(snap.measureIdx, snap);
  snapshotStore.currentVariedTrackIds = snap.variedTrackIds;
  snapshotStore.currentVariationNotes = snap.variationNotes;
  if (activeVariationsRef) {
    snapshotStore.registeredActiveVariationsRef = activeVariationsRef;
    activeVariationsRef.current = snap.stepsByTrackId;
  }
}

export function resetLiveVariationLookahead(activeVariationsRef?: { current: Record<number, any> }): void {
  resetSnapshotStore();
  resetRodaVisualFrameState();
  if (activeVariationsRef) activeVariationsRef.current = {};
}

export function advanceLiveVariationLookahead(params: {
  currentMeasureIdx: number; nextMeasureIdx: number; currentMeasureStartTick: number;
  tracks: Track[]; measureTimeSigs: Record<number, string> | string[];
  soloPatternPlayId: number | null; soloPatternVariationId: string | null;
  activeVariationsRef?: { current: Record<number, any> }; currentMeasureSeqId?: number; nextMeasureStartTick?: number;
}): void {
  const { currentMeasureIdx, nextMeasureIdx, currentMeasureStartTick, tracks, measureTimeSigs, soloPatternPlayId, soloPatternVariationId, activeVariationsRef, currentMeasureSeqId } = params;
  if (activeVariationsRef) snapshotStore.registeredActiveVariationsRef = activeVariationsRef;
  if (snapshotStore.currentSnapshot) snapshotStore.prevSnapshot = snapshotStore.currentSnapshot;
  const currSig = measureTimeSigs[currentMeasureIdx] || '4/4', nextSig = measureTimeSigs[nextMeasureIdx] || '4/4';

  if (currentMeasureSeqId !== undefined && currentMeasureSeqId > 0) {
    snapshotStore.currentSnapshot = getOrRollMeasureVariationForHorizon({ seqId: currentMeasureSeqId, measureIdx: currentMeasureIdx, measureStartTick: currentMeasureStartTick, timeSig: currSig, tracks, soloPatternPlayId, soloPatternVariationId });
    snapshotsByMeasure.set(currentMeasureIdx, snapshotStore.currentSnapshot);
    snapshotStore.nextSnapshot = getOrRollMeasureVariationForHorizon({ seqId: currentMeasureSeqId + 1, measureIdx: nextMeasureIdx, measureStartTick: params.nextMeasureStartTick ?? 0, timeSig: nextSig, tracks, soloPatternPlayId, soloPatternVariationId });
    if (nextMeasureIdx !== currentMeasureIdx) snapshotsByMeasure.set(nextMeasureIdx, snapshotStore.nextSnapshot);
    pruneOldSeqSnapshots(currentMeasureSeqId - 8);
  } else {
    snapshotStore.currentSnapshot = (snapshotStore.nextSnapshot && snapshotStore.nextSnapshot.measureIdx === currentMeasureIdx)
      ? snapshotStore.nextSnapshot
      : rollMeasureVariations(-1, currentMeasureIdx, currentMeasureStartTick, currSig, tracks, soloPatternPlayId, soloPatternVariationId, snapshotStore.lastPlayedPatternIdByTrack, undefined, snapshotStore.prevSnapshot);
    snapshotsByMeasure.set(currentMeasureIdx, snapshotStore.currentSnapshot);
    snapshotStore.nextSnapshot = rollMeasureVariations(-1, nextMeasureIdx, 0, nextSig, tracks, soloPatternPlayId, soloPatternVariationId, snapshotStore.currentSnapshot.patternIdByTrackId, undefined, snapshotStore.currentSnapshot);
    if (nextMeasureIdx !== currentMeasureIdx) snapshotsByMeasure.set(nextMeasureIdx, snapshotStore.nextSnapshot);
  }
  snapshotStore.lastPlayedPatternIdByTrack = { ...snapshotStore.currentSnapshot.patternIdByTrackId };
  const liveSeq = getLiveMeasureSeqId();
  const visibleSnap = (liveSeq > 0 ? snapshotsBySeqId.get(liveSeq) : undefined) ?? snapshotStore.currentSnapshot;
  if (activeVariationsRef && rodaVisualState.visualCurrMeasureIdx === null) activeVariationsRef.current = visibleSnap.stepsByTrackId;
  snapshotStore.currentVariedTrackIds = snapshotStore.currentSnapshot.variedTrackIds;
  snapshotStore.currentVariationNotes = snapshotStore.currentSnapshot.variationNotes;
}

export function recalculateLookaheadForQueuedMeasure(queuedMeasureIdx: number, tracks: Track[], soloPatternPlayId: number | null = null, soloPatternVariationId: string | null = null): void {
  const preceding = snapshotStore.currentSnapshot?.patternIdByTrackId ?? snapshotStore.lastPlayedPatternIdByTrack;
  snapshotStore.nextSnapshot = rollMeasureVariations(-1, queuedMeasureIdx, 0, '4/4', tracks, soloPatternPlayId, soloPatternVariationId, preceding, undefined, snapshotStore.currentSnapshot);
  if (queuedMeasureIdx !== snapshotStore.currentSnapshot?.measureIdx) snapshotsByMeasure.set(queuedMeasureIdx, snapshotStore.nextSnapshot);
}

export function syncStepExploreVariationSnapshots(params: {
  prevMeasureIdx: number | null; currentMeasureIdx: number; nextMeasureIdx: number; playheadRatio: number;
  tracks: Track[]; measureTimeSigs: Record<number, string> | string[];
  soloPatternPlayId: number | null; soloPatternVariationId: string | null; activeVariationsRef?: { current: Record<number, any> };
}): MeasureVariationSnapshot {
  const { prevMeasureIdx, currentMeasureIdx, nextMeasureIdx, playheadRatio, tracks, measureTimeSigs, soloPatternPlayId, soloPatternVariationId, activeVariationsRef } = params;
  const getOrRoll = (mIdx: number, preceding: Record<number, number | null>, prevS: MeasureVariationSnapshot | null): MeasureVariationSnapshot => {
    const cached = snapshotsByMeasure.get(mIdx);
    if (cached) return cached;
    const rolled = rollMeasureVariations(-1, mIdx, 0, measureTimeSigs?.[mIdx] || '4/4', tracks, soloPatternPlayId, soloPatternVariationId, preceding, undefined, prevS);
    snapshotsByMeasure.set(mIdx, rolled);
    return rolled;
  };
  const prevSnap = prevMeasureIdx !== null ? getOrRoll(prevMeasureIdx, snapshotStore.lastPlayedPatternIdByTrack, null) : null;
  const currSnap = getOrRoll(currentMeasureIdx, prevSnap ? prevSnap.patternIdByTrackId : snapshotStore.lastPlayedPatternIdByTrack, prevSnap);
  const nextSnap = getOrRoll(nextMeasureIdx, currSnap.patternIdByTrackId, currSnap);
  snapshotStore.prevSnapshot = prevSnap; snapshotStore.currentSnapshot = currSnap; snapshotStore.nextSnapshot = nextSnap;
  snapshotStore.lastPlayedPatternIdByTrack = { ...currSnap.patternIdByTrackId };
  applyStepExploreVisualState(prevMeasureIdx, prevSnap, currentMeasureIdx, currSnap, playheadRatio);
  snapshotStore.currentVariedTrackIds = currSnap.variedTrackIds; snapshotStore.currentVariationNotes = currSnap.variationNotes;
  if (activeVariationsRef) activeVariationsRef.current = currSnap.stepsByTrackId;
  return currSnap;
}

export function syncLiveVariationRodaVisualFrame(isPlaying: boolean, visualMeasureIdx: number, playheadRatio: number, activeVariationsRef?: { current: Record<number, any> }, explicitSeqId?: number): void {
  const seqId = explicitSeqId ?? getLiveMeasureSeqId();
  const snapSteps = getVariationSnapshotBySeqOrMeasure(seqId, visualMeasureIdx)?.stepsByTrackId ?? snapshotStore.currentSnapshot?.stepsByTrackId ?? null;
  updateRodaVisualFrameFromSnapshot(isPlaying, visualMeasureIdx, playheadRatio, seqId, snapSteps, activeVariationsRef);
}

export const getMeasureVariationSnapshot = (measureIdx: number) => getVariationSnapshotBySeqOrMeasure(getLiveMeasureSeqId(), measureIdx);
export const getActiveVariationIdForTrack = (seqId: number | undefined, measureIdx: number, trackId: number) =>
  getVariationSnapshotBySeqOrMeasure(seqId, measureIdx)?.variedPatternsByTrackId.get(trackId)?.variation?.id ?? null;
export const getLiveVariationAudioOverride = () => ({ variedTrackIds: snapshotStore.currentVariedTrackIds, variationNotes: snapshotStore.currentVariationNotes });
export const getLiveVariationRodaSnapshots = buildLiveVariationRodaSnapshots;
