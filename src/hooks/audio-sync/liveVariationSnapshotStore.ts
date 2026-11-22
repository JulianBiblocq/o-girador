import { MeasureVariationSnapshot } from './rollMeasureVariations';

export interface VariationSnapshotStoreState {
  prevSnapshot: MeasureVariationSnapshot | null;
  currentSnapshot: MeasureVariationSnapshot | null;
  nextSnapshot: MeasureVariationSnapshot | null;
  lastPlayedPatternIdByTrack: Record<number, number | null>;
  lastHorizonPatternIdByTrack: Record<number, number | null>;
  currentVariationNotes: number[];
  currentVariedTrackIds: Set<number>;
  registeredActiveVariationsRef: { current: Record<number, any> } | null;
}

export const snapshotsByMeasure = new Map<number, MeasureVariationSnapshot>();
export const snapshotsBySeqId = new Map<number, MeasureVariationSnapshot>();

export const snapshotStore: VariationSnapshotStoreState = {
  prevSnapshot: null,
  currentSnapshot: null,
  nextSnapshot: null,
  lastPlayedPatternIdByTrack: {},
  lastHorizonPatternIdByTrack: {},
  currentVariationNotes: [],
  currentVariedTrackIds: new Set<number>(),
  registeredActiveVariationsRef: null,
};

export function pruneOldSeqSnapshots(minKeepSeqId: number): void {
  for (const k of snapshotsBySeqId.keys()) {
    if (k < minKeepSeqId) snapshotsBySeqId.delete(k);
  }
}

export function resetSnapshotStore(): void {
  snapshotStore.prevSnapshot = null;
  snapshotStore.currentSnapshot = null;
  snapshotStore.nextSnapshot = null;
  snapshotsByMeasure.clear();
  snapshotsBySeqId.clear();
  snapshotStore.lastPlayedPatternIdByTrack = {};
  snapshotStore.lastHorizonPatternIdByTrack = {};
  snapshotStore.currentVariationNotes = [];
  snapshotStore.currentVariedTrackIds = new Set<number>();
}

export function getVariationSnapshotBySeqOrMeasure(
  measureSeqId?: number | null,
  measureIdx?: number
): MeasureVariationSnapshot | undefined {
  if (measureSeqId !== undefined && measureSeqId !== null && measureSeqId > 0) {
    const bySeq = snapshotsBySeqId.get(measureSeqId);
    if (bySeq) return bySeq;
  }
  if (measureIdx !== undefined) {
    return (
      snapshotsByMeasure.get(measureIdx) ??
      (snapshotStore.currentSnapshot?.measureIdx === measureIdx ? snapshotStore.currentSnapshot : undefined)
    );
  }
  return snapshotStore.currentSnapshot ?? undefined;
}

export function syncAudibleTickVariationRef(measureSeqId: number | undefined, measureIdx: number): void {
  const ref = snapshotStore.registeredActiveVariationsRef;
  if (!ref) return;
  const snap = getVariationSnapshotBySeqOrMeasure(measureSeqId, measureIdx);
  if (snap) ref.current = snap.stepsByTrackId;
}
