import { isSpecificSoloVariationId, resolveTargetedSoloVariation } from '../../utils/soloVariationMatcher';

export function resolvePatternVariation(
  activePattern: any,
  isSoloPlayActive: boolean,
  soloPatternPlayId: number | null,
  soloPatternVariationId: string | null,
  currentPlayCount: number,
  measureIdx: number,
  isolateBaseOnly: boolean,
  nextRand: () => number,
  tracks?: any[]
): any | null {
  if (isSoloPlayActive && isSpecificSoloVariationId(soloPatternVariationId)) {
    return resolveTargetedSoloVariation(activePattern, tracks, soloPatternPlayId, soloPatternVariationId);
  }
  if (isSoloPlayActive && soloPatternVariationId === 'base') return null;
  if (!activePattern.variations || activePattern.variations.length === 0) return null;

  if (isSoloPlayActive) {
    const regular = activePattern.variations.filter((v: any) => !v.playFirstTimeOnly);
    const pool = regular.length > 0 ? regular : activePattern.variations;
    const rand = nextRand() * 100;
    let sum = 0;
    for (const variation of pool) {
      if (rand >= sum && rand < sum + variation.probability) return variation;
      sum += variation.probability;
    }
    return null;
  }

  if (currentPlayCount === 0) {
    const firstTimeVariations = activePattern.variations.filter((v: any) => v.playFirstTimeOnly);
    if (firstTimeVariations.length > 0) return firstTimeVariations[0];
  }
  if (!isolateBaseOnly && (activePattern.measureAllowVariations ? activePattern.measureAllowVariations[measureIdx] !== false : true)) {
    const validVariations = activePattern.variations.filter((v: any) => !v.playFirstTimeOnly);
    if (validVariations.length > 0) {
      const rand = nextRand() * 100;
      let sum = 0;
      for (const variation of validVariations) {
        if (rand >= sum && rand < sum + variation.probability) return variation;
        sum += variation.probability;
      }
    }
  }
  return null;
}
