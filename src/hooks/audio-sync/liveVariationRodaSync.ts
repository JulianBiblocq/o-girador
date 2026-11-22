import { MeasureVariationSnapshot, StepArray } from './rollMeasureVariations';
import { getLiveMeasureSeqId } from '../../audio/visualTickBuffer';
import { snapshotsByMeasure, snapshotsBySeqId, snapshotStore } from './liveVariationSnapshotStore';

export interface RodaVisualFrameState {
  visualCurrMeasureIdx: number | null;
  visualCurrSeqId: number;
  visualCurrStepsByTrackId: Record<number, StepArray> | null;
  visualPrevMeasureIdx: number | null;
  visualPrevStepsByTrackId: Record<number, StepArray> | null;
  lastVisualRatio: number;
}

export const rodaVisualState: RodaVisualFrameState = {
  visualCurrMeasureIdx: null,
  visualCurrSeqId: 0,
  visualCurrStepsByTrackId: null,
  visualPrevMeasureIdx: null,
  visualPrevStepsByTrackId: null,
  lastVisualRatio: 0,
};

export function resetRodaVisualFrameState(): void {
  rodaVisualState.visualCurrMeasureIdx = null;
  rodaVisualState.visualCurrSeqId = 0;
  rodaVisualState.visualCurrStepsByTrackId = null;
  rodaVisualState.visualPrevMeasureIdx = null;
  rodaVisualState.visualPrevStepsByTrackId = null;
  rodaVisualState.lastVisualRatio = 0;
}

export function applyStepExploreVisualState(
  prevMeasureIdx: number | null,
  prevSnap: MeasureVariationSnapshot | null,
  currentMeasureIdx: number,
  currSnap: MeasureVariationSnapshot,
  playheadRatio: number
): void {
  rodaVisualState.visualPrevMeasureIdx = prevMeasureIdx;
  rodaVisualState.visualPrevStepsByTrackId = prevSnap ? prevSnap.stepsByTrackId : null;
  rodaVisualState.visualCurrMeasureIdx = currentMeasureIdx;
  rodaVisualState.visualCurrSeqId = 0;
  rodaVisualState.visualCurrStepsByTrackId = currSnap.stepsByTrackId;
  rodaVisualState.lastVisualRatio = ((playheadRatio % 1) + 1) % 1;
}

export function updateRodaVisualFrameFromSnapshot(
  isPlaying: boolean,
  visualMeasureIdx: number,
  playheadRatio: number,
  measureSeqId: number,
  snapSteps: Record<number, StepArray> | null,
  activeVariationsRef?: { current: Record<number, any> }
): void {
  if (!isPlaying) {
    resetRodaVisualFrameState();
    return;
  }
  const r = ((playheadRatio % 1) + 1) % 1;
  const seqChanged = measureSeqId > 0 && rodaVisualState.visualCurrSeqId > 0 && measureSeqId !== rodaVisualState.visualCurrSeqId;

  if (rodaVisualState.visualCurrMeasureIdx === null) {
    rodaVisualState.visualCurrMeasureIdx = visualMeasureIdx;
    rodaVisualState.visualCurrSeqId = measureSeqId;
    rodaVisualState.visualCurrStepsByTrackId = snapSteps;
    rodaVisualState.visualPrevMeasureIdx = null;
    rodaVisualState.visualPrevStepsByTrackId = null;
  } else if (seqChanged || visualMeasureIdx !== rodaVisualState.visualCurrMeasureIdx || (r < 0.25 && rodaVisualState.lastVisualRatio > 0.75)) {
    rodaVisualState.visualPrevMeasureIdx = rodaVisualState.visualCurrMeasureIdx;
    rodaVisualState.visualPrevStepsByTrackId = rodaVisualState.visualCurrStepsByTrackId;
    rodaVisualState.visualCurrMeasureIdx = visualMeasureIdx;
    rodaVisualState.visualCurrSeqId = measureSeqId;
    rodaVisualState.visualCurrStepsByTrackId = snapSteps;
  } else if (snapSteps) {
    rodaVisualState.visualCurrStepsByTrackId = snapSteps;
    if (measureSeqId > 0) rodaVisualState.visualCurrSeqId = measureSeqId;
  }

  rodaVisualState.lastVisualRatio = r;
  if (activeVariationsRef && rodaVisualState.visualCurrStepsByTrackId) {
    activeVariationsRef.current = rodaVisualState.visualCurrStepsByTrackId;
  }
}

export function buildLiveVariationRodaSnapshots(targetNextMeasureIdx?: number, explicitSeqId?: number) {
  const seqId = explicitSeqId ?? (rodaVisualState.visualCurrSeqId || getLiveMeasureSeqId());
  const nextSnap =
    (seqId > 0 ? snapshotsBySeqId.get(seqId + 1) : undefined) ??
    (targetNextMeasureIdx !== undefined ? snapshotsByMeasure.get(targetNextMeasureIdx) : undefined) ??
    snapshotStore.nextSnapshot;
  return {
    hasPrevMeasure: rodaVisualState.visualPrevMeasureIdx !== null,
    prevMeasureIdx: rodaVisualState.visualPrevMeasureIdx ?? snapshotStore.prevSnapshot?.measureIdx ?? null,
    prevStepsByTrackId: rodaVisualState.visualPrevStepsByTrackId,
    currentMeasureIdx: rodaVisualState.visualCurrMeasureIdx ?? snapshotStore.currentSnapshot?.measureIdx ?? null,
    currentStepsByTrackId: rodaVisualState.visualCurrStepsByTrackId ?? snapshotStore.currentSnapshot?.stepsByTrackId ?? null,
    nextMeasureIdx: nextSnap?.measureIdx ?? targetNextMeasureIdx ?? null,
    nextStepsByTrackId: nextSnap?.stepsByTrackId ?? null,
  };
}
