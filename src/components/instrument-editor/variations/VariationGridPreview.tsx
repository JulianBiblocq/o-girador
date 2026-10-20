/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { VariationStepCell } from './VariationStepCell';

export interface VariationGridPreviewProps {
  variation: any;
  ptn: any;
  inst: any;
  lang: any;
  isLeftHanded: boolean;
  trackId: number;
  selectedStepIdx: number | null;
  selectedVariationId: string | null;
  selectedSubIndex?: 0 | 1 | null;
  isTouchDevice: boolean;
  isMultiSelectActive: boolean;
  selectedStepIndices: number[];
  getStepSwingPercent: (stepIdx: number, steps: number, beatResolutions?: number[]) => number;
  onSelectPattern: (id: number) => void;
  setSelectedPatternId: (id: number) => void;
  setSelectedVariationId: (id: string | null) => void;
  setSelectedStepIdx: (idx: number | null) => void;
  setSelectedStepIndices: (indices: number[]) => void;
  setSelectedSubIndex?: (subIndex: 0 | 1 | null) => void;
  setIsMultiSelectActive: (val: boolean) => void;
  onVariationStepValueChange?: (ptnId: number, varId: string, idx: any, val: any) => void;
  onStepTouchStart?: any;
  handleTogglePlay: () => void;
  applyStrokeToVariationStep: (varId: string, idx: number, val: any, isInitial?: boolean) => void;
  isMouseDownRef: React.MutableRefObject<boolean>;
}

export const VariationGridPreview: React.FC<VariationGridPreviewProps> = React.memo((props) => {
  const { variation, ptn } = props;
  const groups: number[][] = [];
  for (let g = 0; g < variation.steps.length; g += 4) {
    groups.push(Array.from({ length: Math.min(4, variation.steps.length - g) }, (_, idx) => g + idx));
  }

  return (
    <div className="step-boxes flex flex-wrap gap-y-2 gap-x-4 scale-[0.9] origin-top-left mt-1">
      {groups.map((group, groupIdx) => (
        <div key={groupIdx} className="flex gap-4 p-1 bg-[#f4ecd8]/40 border border-[#1a1a1a]/10 rounded-sm shrink-0">
          {group.map((i) => {
            const val = variation.steps[i];
            const isSelected = props.selectedStepIdx === i && props.selectedVariationId === variation.id;
            return (
              <VariationStepCell
                key={i} i={i} val={val} variation={variation} ptn={ptn}
                inst={props.inst} lang={props.lang} isLeftHanded={props.isLeftHanded}
                trackId={props.trackId} isSelected={isSelected} selectedStepIdx={props.selectedStepIdx}
                selectedVariationId={props.selectedVariationId} selectedSubIndex={props.selectedSubIndex}
                isTouchDevice={props.isTouchDevice} isMultiSelectActive={props.isMultiSelectActive}
                selectedStepIndices={props.selectedStepIndices} getStepSwingPercent={props.getStepSwingPercent}
                onSelectPattern={props.onSelectPattern} setSelectedPatternId={props.setSelectedPatternId}
                setSelectedVariationId={props.setSelectedVariationId} setSelectedStepIdx={props.setSelectedStepIdx}
                setSelectedStepIndices={props.setSelectedStepIndices} setSelectedSubIndex={props.setSelectedSubIndex}
                setIsMultiSelectActive={props.setIsMultiSelectActive} onVariationStepValueChange={props.onVariationStepValueChange}
                onStepTouchStart={props.onStepTouchStart} handleTogglePlay={props.handleTogglePlay}
                applyStrokeToVariationStep={props.applyStrokeToVariationStep} isMouseDownRef={props.isMouseDownRef}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
});

VariationGridPreview.displayName = 'VariationGridPreview';
