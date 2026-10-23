
import React from 'react';

export function useVariationStepPointerHandlers(params: {
  i: number;
  val: string | number | [string, string];
  variation: any;
  ptn: any;
  inst: any;
  isTouchDevice: boolean;
  isMultiSelectActive: boolean;
  selectedStepIdx: number | null;
  selectedStepIndices: number[];
  onSelectPattern: (id: number) => void;
  setSelectedPatternId: (id: number) => void;
  setSelectedVariationId: (id: string | null) => void;
  setSelectedStepIdx: (idx: number | null) => void;
  setSelectedStepIndices: (indices: number[]) => void;
  setSelectedSubIndex?: (subIndex: 0 | 1 | null) => void;
  setIsMultiSelectActive: (val: boolean) => void;
  onVariationStepValueChange?: (ptnId: number, varId: string, idx: any, val: any) => void;
  onStepTouchStart?: any;
  applyStrokeToVariationStep: (varId: string, idx: number, val: any, isInitial?: boolean) => void;
  isMouseDownRef: React.MutableRefObject<boolean>;
}) {
  const {
    i, val, variation, ptn, inst, isTouchDevice, isMultiSelectActive,
    selectedStepIdx, selectedStepIndices, onSelectPattern, setSelectedPatternId,
    setSelectedVariationId, setSelectedStepIdx, setSelectedStepIndices,
    setSelectedSubIndex, setIsMultiSelectActive, onVariationStepValueChange,
    onStepTouchStart, applyStrokeToVariationStep, isMouseDownRef,
  } = params;

  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (e.button !== 0) return;
    onSelectPattern(ptn.id);
    setSelectedPatternId(ptn.id);
    setSelectedVariationId(variation.id);

    if (e.shiftKey || e.ctrlKey || e.metaKey) {
      if (!isMultiSelectActive) setIsMultiSelectActive(true);
      if (e.shiftKey) {
        const start = selectedStepIdx !== null ? Math.min(selectedStepIdx, i) : i;
        const end = selectedStepIdx !== null ? Math.max(selectedStepIdx, i) : i;
        const range = Array.from({ length: end - start + 1 }, (_, k) => start + k);
        setSelectedStepIndices(e.ctrlKey || e.metaKey ? Array.from(new Set([...selectedStepIndices, ...range])) : range);
      } else {
        setSelectedStepIndices(selectedStepIndices.includes(i) ? selectedStepIndices.filter((idx) => idx !== i) : [...selectedStepIndices, i]);
      }
      return;
    }

    if (isMultiSelectActive) {
      setIsMultiSelectActive(false);
      setSelectedStepIndices([i]);
      setSelectedStepIdx(i);
      return;
    }

    setSelectedStepIdx(i);
    setSelectedStepIndices([i]);
    setSelectedSubIndex?.(null);
    isMouseDownRef.current = true;
    applyStrokeToVariationStep(variation.id, i, val, true);
  };

  const handleMouseEnter = () => {
    if (!isMouseDownRef.current) return;
    setSelectedStepIdx(i);
    setSelectedStepIndices([i]);
    setSelectedSubIndex?.(null);
    applyStrokeToVariationStep(variation.id, i, val, false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    e.stopPropagation();
    onSelectPattern(ptn.id);
    setSelectedPatternId(ptn.id);
    setSelectedVariationId(variation.id);
    if (isMultiSelectActive) {
      setSelectedStepIndices(selectedStepIndices.includes(i) ? selectedStepIndices.filter((idx) => idx !== i) : [...selectedStepIndices, i]);
      return;
    }
    setSelectedStepIdx(i);
    setSelectedStepIndices([i]);
    setSelectedSubIndex?.(null);
    if (isTouchDevice && onStepTouchStart) {
      onStepTouchStart(e, ptn.id, i, inst.id, val as string | number, (newVal: any) => {
        onVariationStepValueChange?.(ptn.id, variation.id, i, newVal);
      });
    }
  };

  return { handleMouseDown, handleMouseEnter, handleTouchStart };
}
