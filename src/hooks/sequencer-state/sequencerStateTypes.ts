import { StepSculptValue } from '../../types';
export { applyRadii } from '../../stores/helpers/trackRodaGeometryHelpers';

export function updateStepSculptValue(
  currentVal: StepSculptValue | undefined,
  defaultVal: number,
  newVal: number,
  subIndex?: 0 | 1,
  isSplitStep: boolean = false
): StepSculptValue {
  if (subIndex === undefined) {
    if (isSplitStep) {
      return [newVal, newVal];
    }
    return newVal;
  }
  let basePair: [number, number];
  if (Array.isArray(currentVal)) {
    basePair = [currentVal[0], currentVal[1]];
  } else if (typeof currentVal === 'number') {
    basePair = [currentVal, currentVal];
  } else {
    basePair = [defaultVal, defaultVal];
  }
  basePair[subIndex] = newVal;
  return basePair;
}
