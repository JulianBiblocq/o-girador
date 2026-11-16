import React from 'react';
import { StepSculptValue } from '../../../types';
import { VariationGridPreviewProps } from './variationTypes';

export interface VariationSelectionSnapshot {
  isVarActive: boolean;
  selectedStepIdx: number | null;
  selectedStepIndices: number[];
  isMultiSelectActive: boolean;
}

export interface VariationStepCellProps extends VariationGridPreviewProps {
  i: number;
  val: string | number | [string, string];
  isSelected: boolean;
  isVarActive: boolean;
  selectionSnapRef?: React.RefObject<VariationSelectionSnapshot>;
}

const isSculptEqual = (a: StepSculptValue | undefined, b: StepSculptValue | undefined): boolean => {
  if (a === b) return true;
  if (Array.isArray(a) && Array.isArray(b)) return a[0] === b[0] && a[1] === b[1];
  return false;
};

export function areVariationStepPropsEqual(
  prev: VariationStepCellProps & { selectionSnapRef?: React.RefObject<VariationSelectionSnapshot> },
  next: VariationStepCellProps & { selectionSnapRef?: React.RefObject<VariationSelectionSnapshot> }
): boolean {
  const valEqual = Array.isArray(prev.val) && Array.isArray(next.val)
    ? prev.val[0] === next.val[0] && prev.val[1] === next.val[1]
    : prev.val === next.val;

  const prevFocused = prev.isVarActive && prev.selectedStepIdx === prev.i;
  const nextFocused = next.isVarActive && next.selectedStepIdx === next.i;
  const prevMulti = prev.isVarActive && prev.selectedStepIndices.includes(prev.i);
  const nextMulti = next.isVarActive && next.selectedStepIndices.includes(next.i);

  return (
    prev.i === next.i &&
    valEqual &&
    prev.isSelected === next.isSelected &&
    prevFocused === nextFocused &&
    (!nextFocused || prev.selectedSubIndex === next.selectedSubIndex) &&
    prevMulti === nextMulti &&
    prev.isMultiSelectActive === next.isMultiSelectActive &&
    prev.activeTool === next.activeTool &&
    prev.isLeftHanded === next.isLeftHanded &&
    prev.isTouchDevice === next.isTouchDevice &&
    prev.lang === next.lang &&
    prev.trackId === next.trackId &&
    prev.variation?.id === next.variation?.id &&
    prev.ptn?.id === next.ptn?.id &&
    prev.ptn?.steps === next.ptn?.steps &&
    prev.ptn?.beatResolutions === next.ptn?.beatResolutions &&
    prev.inst === next.inst &&
    isSculptEqual(prev.variation?.volumes?.[prev.i], next.variation?.volumes?.[next.i]) &&
    isSculptEqual(prev.variation?.decays?.[prev.i], next.variation?.decays?.[next.i]) &&
    isSculptEqual(prev.variation?.microtimings?.[prev.i], next.variation?.microtimings?.[next.i])
  );
}
