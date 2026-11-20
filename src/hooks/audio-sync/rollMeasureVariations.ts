import { Track, Pattern, PatternVariation } from '../../types';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { resolveCurrentPattern } from '../../utils/variationResolver';
import { resolveActivePattern } from '../../workers/compiler/patternResolver';
import { buildMeasureVariationNotes } from './variationMeasureNotePacker';

export type StepArray = (string | number | [string, string])[];

export interface MeasureVariationSnapshot {
  seqId: number;
  measureIdx: number;
  stepsByTrackId: Record<number, StepArray>;
  variedPatternsByTrackId: Map<number, { pattern: Pattern; variation: PatternVariation }>;
  patternIdByTrackId: Record<number, number | null>;
  variedTrackIds: Set<number>;
  variationNotes: number[];
}

export function rollMeasureVariations(
  seqId: number,
  measureIdx: number,
  measureStartTick: number,
  timeSig: string,
  tracks: Track[],
  soloPatternPlayId: number | null,
  soloPatternVariationId: string | null,
  precedingPatternIdByTrack: Record<number, number | null>
): MeasureVariationSnapshot {
  const store = useSequencerStore.getState();
  const isSoloPlayActive = soloPatternPlayId !== null;
  const isolateBaseOnly = Boolean(store.isolateBaseOnly);
  const stepsByTrackId: Record<number, StepArray> = {};
  const variedPatternsByTrackId = new Map<number, { pattern: Pattern; variation: PatternVariation }>();
  const patternIdByTrackId: Record<number, number | null> = {};

  tracks.forEach((track) => {
    if (track.isBusFolder) return;
    const activePattern = resolveActivePattern(track, tracks, measureIdx, isSoloPlayActive, soloPatternPlayId);
    if (!activePattern) {
      patternIdByTrackId[track.id] = null;
      return;
    }
    patternIdByTrackId[track.id] = activePattern.id;
    const isEnteringPatternBlock = precedingPatternIdByTrack[track.id] !== activePattern.id;
    const resolved = resolveCurrentPattern({
      pattern: activePattern, trackId: track.id, measureIdx, tracks,
      currentPlayCount: isEnteringPatternBlock ? 0 : 1, isFirstPassConsumed: !isEnteringPatternBlock,
      isolateBaseOnly, isSoloPlayActive, soloPatternPlayId, soloPatternVariationId,
    });
    stepsByTrackId[track.id] = resolved.steps;
    if (resolved.matchedVariation) {
      variedPatternsByTrackId.set(track.id, { pattern: activePattern, variation: resolved.matchedVariation });
    }
  });

  const variedTrackIds = new Set(variedPatternsByTrackId.keys());
  const variationNotes = buildMeasureVariationNotes({
    tracks, measureIdx, measureStartTick, timeSig: timeSig || '4/4', variedPatternsByTrackId,
  });
  return { seqId, measureIdx, stepsByTrackId, variedPatternsByTrackId, patternIdByTrackId, variedTrackIds, variationNotes };
}
