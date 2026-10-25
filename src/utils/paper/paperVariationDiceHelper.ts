import { cloneStepValue } from './paperStrokeUtils';
import { findDictionaryVariation } from './paperRhythmDictionary';

export function applyVariationCallsToPattern(
  pat: any,
  parsedToken: any,
  specificCode: string,
  groupCode: string,
  preset: any,
  rawSecName: string,
  mIdx: number,
  totalM: number,
  hasAnyVarCall: boolean
): void {
  const matchingCalls = parsedToken.variationCalls.filter(
    (v: any) => !v.targetInstrument || v.targetInstrument === specificCode || v.targetInstrument === groupCode
  );
  const hasDiceOnTrack = rawSecName.includes('⊡') || matchingCalls.length > 0;
  if (hasDiceOnTrack) {
    if (!pat.measureAllowVariations) pat.measureAllowVariations = Array(totalM).fill(false);
    pat.measureAllowVariations[mIdx] = true;
    matchingCalls.forEach((vCall: any) => {
      if (vCall.probability !== undefined) {
        if (!pat.variations?.length) {
          const fbSteps = findDictionaryVariation(pat.name, specificCode, 1)
            || findDictionaryVariation(pat.name, groupCode, 1)
            || preset.variations?.[pat.name]?.find((v: any) => v.pupitre === specificCode || v.pupitre === groupCode)?.steps;
          if (fbSteps) {
            pat.variations = [{
              id: `var-${pat.id}-1`,
              name: `Var ${groupCode.toUpperCase()}`,
              steps: fbSteps.map(cloneStepValue),
              probability: vCall.probability
            }];
          }
        } else {
          pat.variations.forEach((v: any) => { v.probability = vCall.probability; });
        }
      }
    });
  } else if (hasAnyVarCall && pat.measureAllowVariations) {
    pat.measureAllowVariations[mIdx] = false;
  }
}
