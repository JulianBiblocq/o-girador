import { Track, Pattern, PatternVariation } from '../../types';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { getVariationSculptArrays } from '../../utils/soloVariationMatcher';
import { isSlaveTrack, resolveMasterTrack } from '../../utils/trackMasterResolver';
import { resolveCurrentPattern } from '../../utils/variationResolver';
import { resolveActivePattern } from '../../workers/compiler/patternResolver';
import { buildMeasureVariationNotes } from './variationMeasureNotePacker';

export type StepArray = (string | number | [string, string])[];

export interface MeasureVariationSnapshot {
  seqId: number;
  measureIdx: number;
  measureStartTick: number;
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
  precedingPatternIdByTrack: Record<number, number | null>,
  randomSource: () => number = Math.random
): MeasureVariationSnapshot {
  const store = useSequencerStore.getState();
  const isSoloPlayActive = soloPatternPlayId !== null;
  const isolateBaseOnly = Boolean(store.isolateBaseOnly);
  const stepsByTrackId: Record<number, StepArray> = {};
  const variedPatternsByTrackId = new Map<number, { pattern: Pattern; variation: PatternVariation }>();
  const patternIdByTrackId: Record<number, number | null> = {};

  const familyRandByMaster = new Map<string, number>();
  const masterChosenByMasterId = new Map<string, { varIdx: number; varId: string | null; varName: string | null }>();
  const getFamilyRand = (key: string): number => {
    if (!familyRandByMaster.has(key)) familyRandByMaster.set(key, randomSource());
    return familyRandByMaster.get(key)!;
  };

  const orderedTracks = [...tracks].sort((a, b) => {
    const aSlave = isSlaveTrack(a, tracks) ? 1 : 0;
    const bSlave = isSlaveTrack(b, tracks) ? 1 : 0;
    return aSlave - bSlave;
  });

  orderedTracks.forEach((track) => {
    if (track.isBusFolder || track.isLinkFolder) return;
    const activePattern = resolveActivePattern(track, tracks, measureIdx, isSoloPlayActive, soloPatternPlayId);
    if (!activePattern) {
      patternIdByTrackId[track.id] = null;
      return;
    }
    patternIdByTrackId[track.id] = activePattern.id;

    const isSlave = isSlaveTrack(track, tracks);
    const masterTrack = isSlave ? resolveMasterTrack(track.id, tracks) : (track.isLinkMaster ? track : null);
    const famKey = masterTrack ? String(masterTrack.id) : String(track.id);

    if (isSlave && masterTrack && masterChosenByMasterId.has(famKey)) {
      const choice = masterChosenByMasterId.get(famKey)!;
      if (choice.varIdx < 0) {
        stepsByTrackId[track.id] = activePattern.activeSteps;
        return;
      }
      const ownVars: PatternVariation[] = Array.isArray(activePattern.variations) ? activePattern.variations : [];
      const twin =
        (choice.varId ? ownVars.find((v) => String(v.id) === choice.varId) : undefined) ||
        (choice.varName ? ownVars.find((v) => v.name?.trim().toLowerCase() === choice.varName) : undefined) ||
        ownVars[choice.varIdx] ||
        null;
      if (twin) {
        stepsByTrackId[track.id] = getVariationSculptArrays(activePattern, twin).steps;
        variedPatternsByTrackId.set(track.id, { pattern: activePattern, variation: twin });
      } else {
        stepsByTrackId[track.id] = activePattern.activeSteps;
      }
      return;
    }

    const isEnteringPatternBlock = precedingPatternIdByTrack[track.id] !== activePattern.id;
    const sharedRand = getFamilyRand(famKey);
    const resolved = resolveCurrentPattern({
      pattern: activePattern, trackId: track.id, measureIdx, tracks,
      currentPlayCount: isEnteringPatternBlock ? 0 : 1, isFirstPassConsumed: !isEnteringPatternBlock,
      isolateBaseOnly, isSoloPlayActive, soloPatternPlayId, soloPatternVariationId,
      randomSource: () => sharedRand,
    });
    stepsByTrackId[track.id] = resolved.steps;
    if (resolved.matchedVariation) {
      variedPatternsByTrackId.set(track.id, { pattern: activePattern, variation: resolved.matchedVariation });
      if (track.isLinkMaster) {
        const vIdx = (activePattern.variations || []).findIndex((v: PatternVariation) => v.id === resolved.matchedVariation!.id);
        masterChosenByMasterId.set(famKey, {
          varIdx: vIdx >= 0 ? vIdx : 0,
          varId: String(resolved.matchedVariation.id),
          varName: resolved.matchedVariation.name?.trim().toLowerCase() || null,
        });
      }
    } else if (track.isLinkMaster) {
      masterChosenByMasterId.set(famKey, { varIdx: -1, varId: null, varName: null });
    }
  });

  const variedTrackIds = new Set(variedPatternsByTrackId.keys());
  const variationNotes = buildMeasureVariationNotes({
    tracks, measureIdx, measureStartTick, timeSig: timeSig || '4/4', variedPatternsByTrackId,
  });
  return { seqId, measureIdx, measureStartTick, stepsByTrackId, variedPatternsByTrackId, patternIdByTrackId, variedTrackIds, variationNotes };
}
