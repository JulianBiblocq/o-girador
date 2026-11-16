import React, { useCallback, useRef } from 'react';
import { VariationStepCell } from './VariationStepCell';
import { VariationSelectionSnapshot } from './variationStepCellComparator';
import { computePercussionGridGroups } from '../grid/percussionGridHelpers';
import { splitIntoHalfMeasures } from '../grid/gridSymmetricSplitter';
import { VariationGridPreviewProps } from './variationTypes';

export type { VariationGridPreviewProps };

export const VariationGridPreview: React.FC<VariationGridPreviewProps> = React.memo((props) => {
  const { variation, ptn, isMultiSelectActive, selectedStepIndices, setSelectedStepIndices } = props;
  const { groups } = computePercussionGridGroups({ ...ptn, steps: variation.steps?.length ?? ptn?.steps ?? 16 });
  const { firstHalf, secondHalf, isSymmetric } = splitIntoHalfMeasures(groups);
  const isVarActive = props.selectedPatternId === ptn.id && props.selectedVariationId === variation.id;

  const selectionSnapRef = useRef<VariationSelectionSnapshot>({
    isVarActive,
    selectedStepIdx: props.selectedStepIdx,
    selectedStepIndices,
    isMultiSelectActive,
  });
  selectionSnapRef.current = {
    isVarActive,
    selectedStepIdx: props.selectedStepIdx,
    selectedStepIndices,
    isMultiSelectActive,
  };

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isMultiSelectActive || e.touches.length === 0) return;
    const t = e.touches[0];
    const el = (t.target as Element)?.ownerDocument?.elementFromPoint(t.clientX, t.clientY);
    const cell = el?.closest('[data-variation-id][data-step-index]');
    if (cell && cell.getAttribute('data-variation-id') === String(variation.id)) {
      if (e.cancelable) e.preventDefault();
      const idx = parseInt(cell.getAttribute('data-step-index') || '-1', 10);
      if (idx >= 0 && !selectedStepIndices.includes(idx)) {
        setSelectedStepIndices([...selectedStepIndices, idx]);
      }
    }
  }, [isMultiSelectActive, variation.id, selectedStepIndices, setSelectedStepIndices]);

  const renderGroup = (group: number[], groupIdx: number) => (
    <div
      key={groupIdx}
      onContextMenu={(e) => e.preventDefault()}
      className="flex gap-1 sm:gap-1.5 p-1 bg-[var(--cordel-paper-surface)]/40 border border-[var(--cordel-ink-dark)]/10 rounded-sm flex-1 min-w-0"
    >
      {group.map((i) => (
        <VariationStepCell
          key={i} i={i} val={variation.steps[i]}
          isSelected={isVarActive && props.selectedStepIdx === i}
          isVarActive={isVarActive}
          selectionSnapRef={selectionSnapRef}
          {...props}
        />
      ))}
    </div>
  );

  return (
    <div
      className="step-boxes flex flex-wrap gap-2 lg:gap-3 w-full mt-1"
      onContextMenu={(e) => e.preventDefault()}
      onTouchMove={handleTouchMove}
    >
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
