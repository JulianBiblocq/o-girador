/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PercussionStepCellProps } from './percussionCellTypes';
import { StepSculptValue } from '../../../types';

export const isParamEqual = (
  a: StepSculptValue | number[] | undefined,
  b: StepSculptValue | number[] | undefined
): boolean => {
  if (a === b) return true;
  if (Array.isArray(a) && Array.isArray(b)) {
    return a[0] === b[0] && a[1] === b[1];
  }
  return false;
};

export const arePercussionPropsEqual = (
  prevProps: PercussionStepCellProps,
  nextProps: PercussionStepCellProps
): boolean => {
  const isValEqual = Array.isArray(prevProps.val) && Array.isArray(nextProps.val)
    ? prevProps.val[0] === nextProps.val[0] && prevProps.val[1] === nextProps.val[1]
    : prevProps.val === nextProps.val;

  return (
    isValEqual &&
    isParamEqual(prevProps.volume, nextProps.volume) &&
    isParamEqual(prevProps.decay, nextProps.decay) &&
    isParamEqual(prevProps.microtiming, nextProps.microtiming) &&
    isParamEqual(prevProps.totalShift, nextProps.totalShift) &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.isMultiSelected === nextProps.isMultiSelected &&
    prevProps.isFocused === nextProps.isFocused &&
    prevProps.selectedSubIndex === nextProps.selectedSubIndex &&
    ((prevProps.activeTool === 'scissors') === (nextProps.activeTool === 'scissors')) &&
    prevProps.shiftPx === nextProps.shiftPx &&
    prevProps.splitLeftColor === nextProps.splitLeftColor &&
    prevProps.splitRightColor === nextProps.splitRightColor &&
    prevProps.splitLeftText === nextProps.splitLeftText &&
    prevProps.splitRightText === nextProps.splitRightText &&
    prevProps.colorStyle?.backgroundColor === nextProps.colorStyle?.backgroundColor &&
    prevProps.colorStyle?.color === nextProps.colorStyle?.color &&
    prevProps.colorStyle?.borderColor === nextProps.colorStyle?.borderColor &&
    prevProps.isMultiSelectActive === nextProps.isMultiSelectActive &&
    prevProps.isSextuplet === nextProps.isSextuplet &&
    prevProps.isTriplet === nextProps.isTriplet &&
    prevProps.isOcto === nextProps.isOcto &&
    prevProps.indexInGroup === nextProps.indexInGroup &&
    prevProps.trackId === nextProps.trackId
  );
};
