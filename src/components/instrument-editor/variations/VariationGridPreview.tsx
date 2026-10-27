
import React from 'react';
import { VariationStepCell } from './VariationStepCell';
import { computePercussionGridGroups } from '../grid/percussionGridHelpers';
import { splitIntoHalfMeasures } from '../grid/gridSymmetricSplitter';

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
  applyStrokeToVariationStep: (varId: string, idx: number, val: any, subIndex?: 0 | 1) => void;
  isMouseDownRef: React.MutableRefObject<boolean>;
}

export const VariationGridPreview: React.FC<VariationGridPreviewProps> = React.memo((props) => {
  const { variation, ptn } = props;
  const { groups } = computePercussionGridGroups({ ...ptn, steps: variation.steps?.length ?? ptn?.steps ?? 16 });
  const { firstHalf, secondHalf, isSymmetric } = splitIntoHalfMeasures(groups);

  const renderGroup = (group: number[], groupIdx: number) => (
    <div key={groupIdx} className="flex gap-1 sm:gap-1.5 p-1 bg-[#f4ecd8]/40 border border-[#1a1a1a]/10 rounded-sm flex-1 min-w-0">
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
  );

  return (
    <div className="step-boxes flex flex-wrap gap-2 lg:gap-3 w-full mt-1">
      {isSymmetric ? (
        <>
          <div className="flex flex-nowrap items-stretch gap-1.5 sm:gap-2 flex-1 min-w-[210px]">
            {firstHalf.map((g, idx) => renderGroup(g, idx))}
          </div>
          <div className="flex flex-nowrap items-stretch gap-1.5 sm:gap-2 flex-1 min-w-[210px]">
            {secondHalf.map((g, idx) => renderGroup(g, firstHalf.length + idx))}
          </div>
        </>
      ) : (
        groups.map((group, groupIdx) => renderGroup(group, groupIdx))
      )}
    </div>
  );
});

VariationGridPreview.displayName = 'VariationGridPreview';
