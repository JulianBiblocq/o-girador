import { Track, Pattern, PatternVariation } from '../../types';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { resolveCurrentPattern } from '../../utils/variationResolver';
import { resolveActivePattern } from '../../workers/compiler/patternResolver';
import { buildMeasureVariationNotes } from './variationMeasureNotePacker';

type StepArray = (string | number | [string, string])[];

interface MeasureVariationSnapshot {
  measureIdx: number;
  stepsByTrackId: Record<number, StepArray>;
  variedPatternsByTrackId: Map<number, { pattern: Pattern; variation: PatternVariation }>;
  consumedKeys: string[];
}

let prevSnapshot: MeasureVariationSnapshot | null = null;
let currentSnapshot: MeasureVariationSnapshot | null = null;
let nextSnapshot: MeasureVariationSnapshot | null = null;
let currentVariationNotes: number[] = [];
let currentVariedTrackIds = new Set<number>();

function rollMeasureVariations(
  measureIdx: number, tracks: Track[], soloPatternPlayId: number | null,
  soloPatternVariationId: string | null, extraConsumedKeys?: Set<string>
): MeasureVariationSnapshot {
  const store = useSequencerStore.getState();
  const isSoloPlayActive = soloPatternPlayId !== null;
  const isolateBaseOnly = Boolean(store.isolateBaseOnly);
  const firstPassRegistry = store.firstPassRegistry || {};

  const stepsByTrackId: Record<number, StepArray> = {};
  const variedPatternsByTrackId = new Map<number, { pattern: Pattern; variation: PatternVariation }>();
  const consumedKeys: string[] = [];

  tracks.forEach((track) => {
    if (track.isBusFolder) return;
    const activePattern = resolveActivePattern(track, tracks, measureIdx, isSoloPlayActive, soloPatternPlayId);
    if (!activePattern) return;

    const key = `${track.id}-${activePattern.id}`;
    const alreadyConsumed = Boolean(firstPassRegistry[key] || extraConsumedKeys?.has(key));
    const resolved = resolveCurrentPattern({
      pattern: activePattern, trackId: track.id, measureIdx,
      currentPlayCount: alreadyConsumed ? 1 : 0, isFirstPassConsumed: alreadyConsumed,
      isolateBaseOnly, isSoloPlayActive, soloPatternPlayId, soloPatternVariationId,
    });

    stepsByTrackId[track.id] = resolved.steps;
    consumedKeys.push(key);
    if (resolved.matchedVariation) {
      variedPatternsByTrackId.set(track.id, { pattern: activePattern, variation: resolved.matchedVariation });
    }
  });

  return { measureIdx, stepsByTrackId, variedPatternsByTrackId, consumedKeys };
}

export function resetLiveVariationLookahead(activeVariationsRef?: { current: Record<number, any> }): void {
  prevSnapshot = null; currentSnapshot = null; nextSnapshot = null;
  currentVariationNotes = []; currentVariedTrackIds = new Set<number>();
  if (activeVariationsRef) activeVariationsRef.current = {};
}

export function advanceLiveVariationLookahead(params: {
  currentMeasureIdx: number; nextMeasureIdx: number; currentMeasureStartTick: number;
  tracks: Track[]; measureTimeSigs: Record<number, string> | string[];
  soloPatternPlayId: number | null; soloPatternVariationId: string | null;
  activeVariationsRef?: { current: Record<number, any> };
}): void {
  const { currentMeasureIdx, nextMeasureIdx, currentMeasureStartTick, tracks, measureTimeSigs, soloPatternPlayId, soloPatternVariationId, activeVariationsRef } = params;

  if (currentSnapshot) prevSnapshot = currentSnapshot;
  currentSnapshot = (nextSnapshot && nextSnapshot.measureIdx === currentMeasureIdx)
    ? nextSnapshot
    : rollMeasureVariations(currentMeasureIdx, tracks, soloPatternPlayId, soloPatternVariationId);

  const store = useSequencerStore.getState();
  const extraConsumed = new Set<string>(currentSnapshot.consumedKeys);
  currentSnapshot.consumedKeys.forEach((k) => store.markFirstPassConsumed(k));
  if (activeVariationsRef) activeVariationsRef.current = currentSnapshot.stepsByTrackId;

  currentVariedTrackIds = new Set(currentSnapshot.variedPatternsByTrackId.keys());
  currentVariationNotes = buildMeasureVariationNotes({
    tracks, measureIdx: currentMeasureIdx, measureStartTick: currentMeasureStartTick,
    timeSig: measureTimeSigs[currentMeasureIdx] || '4/4',
    variedPatternsByTrackId: currentSnapshot.variedPatternsByTrackId,
  });

  nextSnapshot = rollMeasureVariations(nextMeasureIdx, tracks, soloPatternPlayId, soloPatternVariationId, extraConsumed);
}

export function recalculateLookaheadForQueuedMeasure(
  queuedMeasureIdx: number, tracks: Track[],
  soloPatternPlayId: number | null = null, soloPatternVariationId: string | null = null
): void {
  const extraConsumed = new Set<string>(currentSnapshot?.consumedKeys || []);
  nextSnapshot = rollMeasureVariations(queuedMeasureIdx, tracks, soloPatternPlayId, soloPatternVariationId, extraConsumed);
}

export function getLiveVariationAudioOverride() {
  return { variedTrackIds: currentVariedTrackIds, variationNotes: currentVariationNotes };
}

export function getLiveVariationRodaSnapshots() {
  return {
    hasPrevMeasure: prevSnapshot !== null,
    prevMeasureIdx: prevSnapshot?.measureIdx ?? null,
    prevStepsByTrackId: prevSnapshot?.stepsByTrackId ?? null,
    currentMeasureIdx: currentSnapshot?.measureIdx ?? null,
    currentStepsByTrackId: currentSnapshot?.stepsByTrackId ?? null,
    nextMeasureIdx: nextSnapshot?.measureIdx ?? null,
    nextStepsByTrackId: nextSnapshot?.stepsByTrackId ?? null,
  };
}
