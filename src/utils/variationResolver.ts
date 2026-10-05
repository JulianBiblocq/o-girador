/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Pattern, PatternVariation, StepSculptValue } from '../types';

export interface ResolveCurrentPatternOptions {
  pattern: Pattern;
  trackId: number;
  measureIdx: number;
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
  matchedVariation: PatternVariation | null;
  isVariation: boolean;
  isFirstPass: boolean;
}

/**
 * Résout le motif (steps, volumes, decays, microtimings) à jouer ou afficher pour un pattern donné,
 * en appliquant rigoureusement la règle musicale fondamentale :
 * 1. Priorité absolue à l'amorce (playFirstTimeOnly: true) lors de la 1ère lecture.
 * 2. Si isolateBaseOnly === true, neutralisation des variations aléatoires dès le 2ᵉ tour (base pure).
 * 3. Si isolateBaseOnly === false, application des probabilités sur les variations régulières.
 */
export function resolveCurrentPattern(options: ResolveCurrentPatternOptions): ResolvedPatternResult {
  const {
    pattern,
    measureIdx,
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
  let matchedVariation: PatternVariation | null = null;
  let isFirstPass = false;

  if (pattern.variations && pattern.variations.length > 0) {
    // 0. Si le mode solo vise spécifiquement une variation
    if (
      isSoloPlayActive &&
      soloPatternPlayId === pattern.id &&
      soloPatternVariationId &&
      soloPatternVariationId !== 'base' &&
      soloPatternVariationId !== 'ensemble'
    ) {
      matchedVariation = pattern.variations.find((v) => v.id === soloPatternVariationId) || null;
    }
    // Si le mode solo vise la base, on ignore les variations
    else if (
      isSoloPlayActive &&
      soloPatternPlayId === pattern.id &&
      soloPatternVariationId === 'base'
    ) {
      matchedVariation = null;
    } else {
      // 1. Priorité absolue à l'amorce (playFirstTimeOnly)
      // L'amorce joue si :
      // - currentPlayCount === 0 OU !isFirstPassConsumed
      const isEligibleForFirstPass = currentPlayCount === 0 && !isFirstPassConsumed;
      if (isEligibleForFirstPass) {
        const firstTimeVariations = pattern.variations.filter((v) => v.playFirstTimeOnly);
        if (firstTimeVariations.length > 0) {
          matchedVariation = firstTimeVariations[0];
          isFirstPass = true;
        }
      }

      // 2. Si pas d'amorce retenue, on évalue les variations aléatoires UNIQUEMENT si isolateBaseOnly est faux
      if (!matchedVariation && !isolateBaseOnly) {
        const allowImprov =
          isSoloPlayActive ||
          (pattern.measureAllowVariations
            ? pattern.measureAllowVariations[measureIdx]
            : true);

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
      stepsToPlay = matchedVariation.steps;
      if (matchedVariation.volumes) effectiveVolumes = matchedVariation.volumes;
      if (matchedVariation.decays) effectiveDecays = matchedVariation.decays;
      if (matchedVariation.microtimings) effectiveMicrotimings = matchedVariation.microtimings;
    }
  }

  return {
    steps: stepsToPlay,
    volumes: effectiveVolumes,
    decays: effectiveDecays,
    microtimings: effectiveMicrotimings,
    matchedVariation,
    isVariation: matchedVariation !== null,
    isFirstPass,
  };
}
