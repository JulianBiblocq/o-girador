import { Pattern, PatternVariation, StepSculptValue } from '../types';
import {
  getVariationSculptArrays,
  isSpecificSoloVariationId,
  resolveTargetedSoloVariation,
} from './soloVariationMatcher';

export interface ResolveCurrentPatternOptions {
  pattern: Pattern;
  trackId: number;
  measureIdx: number;
  tracks?: readonly any[];
  currentPlayCount?: number;
  isFirstPassConsumed?: boolean;
  isolateBaseOnly?: boolean;
  isSoloPlayActive?: boolean;
  soloPatternPlayId?: number | null;
  soloPatternVariationId?: string | null;
  randomSource?: () => number;
}

export interface ResolvedPatternResult {
  steps: (string | number | [string, string])[];
  volumes?: StepSculptValue[];
  decays?: StepSculptValue[];
  microtimings?: StepSculptValue[];
  beatResolutions?: number[];
  matchedVariation: PatternVariation | null;
  isVariation: boolean;
  isFirstPass: boolean;
}

/**
 * Résout le motif (steps, volumes, decays, microtimings, beatResolutions) à jouer ou afficher :
 * 0. En mode solo visant une variation spécifique, priorité absolue inconditionnelle (y compris sur pistes liées/esclaves).
 * 1. Sinon, priorité à l'amorce (playFirstTimeOnly: true) lors de la 1ère lecture d'un bloc.
 * 2. Si isolateBaseOnly === false, application des probabilités sur les variations régulières.
 */
export function resolveCurrentPattern(options: ResolveCurrentPatternOptions): ResolvedPatternResult {
  const {
    pattern,
    measureIdx,
    tracks,
    currentPlayCount = 0,
    isFirstPassConsumed = false,
    isolateBaseOnly = false,
    isSoloPlayActive = false,
    soloPatternPlayId = null,
    soloPatternVariationId = null,
    randomSource = Math.random,
  } = options;

  let stepsToPlay = pattern.activeSteps;
  let effectiveVolumes = pattern.volumes;
  let effectiveDecays = pattern.decays;
  let effectiveMicrotimings = pattern.microtimings;
  let effectiveBeatRes = pattern.beatResolutions;
  let matchedVariation: PatternVariation | null = null;
  let isFirstPass = false;

  const isSolo = isSoloPlayActive || (soloPatternPlayId !== null && soloPatternPlayId !== undefined);

  if (isSolo && isSpecificSoloVariationId(soloPatternVariationId)) {
    matchedVariation = resolveTargetedSoloVariation(pattern, tracks, soloPatternPlayId, soloPatternVariationId);
  } else if (isSolo && soloPatternVariationId === 'base') {
    matchedVariation = null;
  } else if (pattern.variations && pattern.variations.length > 0) {
    const isEligibleForFirstPass = currentPlayCount === 0 && !isFirstPassConsumed;
    if (isEligibleForFirstPass) {
      const firstTimeVariations = pattern.variations.filter((v) => v.playFirstTimeOnly);
      if (firstTimeVariations.length > 0) {
        matchedVariation = firstTimeVariations[0];
        isFirstPass = true;
      }
    }

    if (!matchedVariation && !isolateBaseOnly) {
      const allowImprov =
        isSolo ||
        (pattern.measureAllowVariations ? pattern.measureAllowVariations[measureIdx] !== false : true);

      if (allowImprov) {
        const validVariations = pattern.variations.filter((v) => !v.playFirstTimeOnly);
        if (validVariations.length > 0) {
          const rand = randomSource() * 100;
          let sum = 0;
          for (const variation of validVariations) {
            if (rand >= sum && rand < sum + variation.probability) {
              matchedVariation = variation;
              break;
            }
            sum += variation.probability;
          }
        }
      }
    }
  }

  if (matchedVariation) {
    const sculpt = getVariationSculptArrays(pattern, matchedVariation);
    stepsToPlay = sculpt.steps;
    effectiveVolumes = sculpt.volumes;
    effectiveDecays = sculpt.decays;
    effectiveMicrotimings = sculpt.microtimings;
    effectiveBeatRes = sculpt.beatResolutions;
  }

  return {
    steps: stepsToPlay,
    volumes: effectiveVolumes,
    decays: effectiveDecays,
    microtimings: effectiveMicrotimings,
    beatResolutions: effectiveBeatRes,
    matchedVariation,
    isVariation: matchedVariation !== null,
    isFirstPass,
  };
}
