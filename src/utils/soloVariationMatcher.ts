import { Pattern, PatternVariation, StepSculptValue } from '../types';

export function isSpecificSoloVariationId(variationId: string | null | undefined): variationId is string {
  return Boolean(variationId && variationId !== 'base' && variationId !== 'ensemble');
}

export function getVariationSculptArrays(pattern: Pattern, variation: PatternVariation): {
  steps: (string | number | [string, string])[];
  volumes?: StepSculptValue[];
  decays?: StepSculptValue[];
  microtimings?: StepSculptValue[];
  beatResolutions?: number[];
} {
  const rawVar = variation as PatternVariation & {
    stepVolumes?: StepSculptValue[];
    stepDecays?: StepSculptValue[];
    stepMicrotimings?: StepSculptValue[];
  };
  return {
    steps: (Array.isArray(variation.steps) && variation.steps.length > 0) ? variation.steps : pattern.activeSteps,
    volumes: variation.volumes ?? rawVar.stepVolumes ?? pattern.volumes,
    decays: variation.decays ?? rawVar.stepDecays ?? pattern.decays,
    microtimings: variation.microtimings ?? rawVar.stepMicrotimings ?? pattern.microtimings,
    beatResolutions: variation.beatResolutions ?? pattern.beatResolutions,
  };
}

export function resolveTargetedSoloVariation(
  pattern: Pattern | null | undefined,
  tracks: readonly any[] | undefined,
  soloPatternPlayId: number | null | undefined,
  soloPatternVariationId: string | null | undefined
): PatternVariation | null {
  if (
    soloPatternPlayId === null ||
    soloPatternPlayId === undefined ||
    !pattern ||
    !isSpecificSoloVariationId(soloPatternVariationId)
  ) {
    return null;
  }

  const targetVarId = String(soloPatternVariationId).trim();
  const targetVarNorm = targetVarId.toLowerCase();
  const ownVars = Array.isArray(pattern.variations) ? pattern.variations : [];

  const directById = ownVars.find((v) => String(v.id) === targetVarId);
  if (directById) return directById;

  const directByName = ownVars.find((v) => v.name?.trim().toLowerCase() === targetVarNorm);
  if (directByName) return directByName;

  if (!tracks || tracks.length === 0) return null;

  const soloOwner = tracks.find((t: any) =>
    t?.patterns?.some((p: any) => String(p.id) === String(soloPatternPlayId))
  );
  const soloPtn: Pattern | undefined = soloOwner?.patterns?.find(
    (p: any) => String(p.id) === String(soloPatternPlayId)
  );
  const masterVars = Array.isArray(soloPtn?.variations) ? soloPtn!.variations! : [];
  if (masterVars.length === 0) return null;

  const masterVarIdx = masterVars.findIndex(
    (v) => String(v.id) === targetVarId || v.name?.trim().toLowerCase() === targetVarNorm
  );
  if (masterVarIdx < 0) return null;

  const masterVar = masterVars[masterVarIdx];
  if (ownVars.length > 0) {
    const masterNameNorm = masterVar.name?.trim().toLowerCase();
    if (masterNameNorm) {
      const twinByName = ownVars.find((v) => v.name?.trim().toLowerCase() === masterNameNorm);
      if (twinByName) return twinByName;
    }
    if (masterVarIdx < ownVars.length) return ownVars[masterVarIdx];
  }

  return masterVar;
}

export function resolveEffectivePatternStepsForSoloOrLive(params: {
  pattern: Pattern | null | undefined;
  trackId: number;
  tracks?: readonly any[];
  soloPatternPlayId?: number | null;
  soloPatternVariationId?: string | null;
  liveStepsMap?: Record<number, any> | null;
  canUseLiveVariation?: boolean;
}): {
  steps: (string | number | [string, string])[];
  matchedVariation: PatternVariation | null;
  beatResolutions?: number[];
} {
  const {
    pattern, trackId, tracks, soloPatternPlayId = null,
    soloPatternVariationId = null, liveStepsMap, canUseLiveVariation = false,
  } = params;
  if (!pattern) return { steps: [], matchedVariation: null };

  const isSolo = soloPatternPlayId !== null && soloPatternPlayId !== undefined;
  if (isSolo && soloPatternVariationId === 'base') {
    return { steps: pattern.activeSteps || [], matchedVariation: null, beatResolutions: pattern.beatResolutions };
  }
  if (isSolo && isSpecificSoloVariationId(soloPatternVariationId)) {
    const targeted = resolveTargetedSoloVariation(pattern, tracks, soloPatternPlayId, soloPatternVariationId);
    if (targeted) {
      const sculpt = getVariationSculptArrays(pattern, targeted);
      return { steps: sculpt.steps, matchedVariation: targeted, beatResolutions: sculpt.beatResolutions };
    }
  }
  if (canUseLiveVariation && liveStepsMap && Array.isArray(liveStepsMap[trackId])) {
    const liveSteps = liveStepsMap[trackId];
    const matched = pattern.variations?.find((v) => v.steps === liveSteps) || null;
    return {
      steps: liveSteps,
      matchedVariation: matched,
      beatResolutions: matched?.beatResolutions ?? pattern.beatResolutions,
    };
  }
  return { steps: pattern.activeSteps || [], matchedVariation: null, beatResolutions: pattern.beatResolutions };
}
