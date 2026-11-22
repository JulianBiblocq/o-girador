import React, { useRef, useEffect, useCallback } from 'react';
import { useSequencerStore } from '../../../stores/useSequencerStore';
import { useWindow } from '../../../contexts/WindowContext';
import { VariationGridPreviewProps } from './variationTypes';
import { VariationSelectionSnapshot } from './variationStepCellComparator';

type PointerParams = Omit<VariationGridPreviewProps, 'setSelectedStepIndices'> & {
  i: number;
  val: string | number | [string, string];
  isVarActive: boolean;
  selectionSnapRef?: React.RefObject<VariationSelectionSnapshot>;
  setSelectedStepIndices: (indices: number[]) => void;
};

export function useVariationStepPointerHandlers(params: PointerParams) {
  const {
    i, val, variation, ptn, inst, trackId, activeTool, isVarActive, isTouchDevice,
    isMultiSelectActive, selectedStepIdx, selectedStepIndices, selectionSnapRef, onSelectPattern,
    setSelectedPatternId, setSelectedVariationId, setSelectedStepIdx, setSelectedStepIndices,
    setSelectedSubIndex, onVariationStepValueChange, onStepTouchStart, gesture, handleVariationScissors,
  } = params;

  const hostWin = useWindow();
  const ctrlDragAnchorRef = useRef<number | null>(null);

  useEffect(() => {
    const clearDrag = () => { ctrlDragAnchorRef.current = null; };
    hostWin.addEventListener('mouseup', clearDrag);
    hostWin.addEventListener('blur', clearDrag);
    return () => {
      hostWin.removeEventListener('mouseup', clearDrag);
      hostWin.removeEventListener('blur', clearDrag);
    };
  }, [hostWin]);

  const handleMouseDown = useCallback((e: React.MouseEvent, subIndex?: 0 | 1) => {
    e.stopPropagation();
    const activeEl = (hostWin?.document || document).activeElement as HTMLElement | null;
    if (activeEl && activeEl !== e.target && activeEl.classList?.contains('step-input-cell')) activeEl.blur();
    const snap = selectionSnapRef?.current;
    const curVarActive = snap ? snap.isVarActive : isVarActive;
    const curStepIdx = snap ? snap.selectedStepIdx : selectedStepIdx;
    const curIndices = snap ? snap.selectedStepIndices : selectedStepIndices;
    const curMultiActive = snap ? snap.isMultiSelectActive : isMultiSelectActive;

    if (e.button === 2) {
      e.preventDefault();
      onSelectPattern(ptn.id); setSelectedPatternId(ptn.id); setSelectedVariationId(variation.id);
      gesture.beginErase(i, subIndex, variation.id);
      return;
    }
    if (e.button !== 0) return;

    if (activeTool === 'scissors' && !curMultiActive && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      handleVariationScissors(variation.id, i, val);
      return;
    }

    onSelectPattern(ptn.id); setSelectedPatternId(ptn.id); setSelectedVariationId(variation.id);
    useSequencerStore.getState().setSelectedStepRange(null);

    if (e.shiftKey) {
      e.preventDefault();
      const anchor = curVarActive && curStepIdx !== null ? curStepIdx : i;
      const lo = Math.min(anchor, i), hi = Math.max(anchor, i);
      const range = Array.from({ length: hi - lo + 1 }, (_, k) => lo + k);
      const base = curVarActive ? curIndices : [];
      setSelectedStepIndices(e.ctrlKey || e.metaKey ? Array.from(new Set([...base, ...range])) : range);
      if (!curVarActive || curStepIdx === null) setSelectedStepIdx(i);
      return;
    }

    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      ctrlDragAnchorRef.current = i;
      const base = curVarActive
        ? (curIndices.length > 0 ? curIndices : (curStepIdx !== null && curStepIdx !== i ? [curStepIdx] : []))
        : [];
      setSelectedStepIndices(base.includes(i) ? base.filter((x) => x !== i) : [...base, i]);
      setSelectedStepIdx(i);
      return;
    }

    if (curMultiActive) {
      const base = curVarActive ? curIndices : [];
      setSelectedStepIndices(base.includes(i) ? base.filter((x) => x !== i) : [...base, i]);
      setSelectedStepIdx(i);
      return;
    }

    gesture.beginPaintOrToggle(i, subIndex, variation.id);
  }, [selectionSnapRef, isVarActive, selectedStepIdx, selectedStepIndices, isMultiSelectActive, onSelectPattern, ptn.id, setSelectedPatternId, setSelectedVariationId, variation.id, gesture, i, activeTool, handleVariationScissors, val, setSelectedStepIndices, setSelectedStepIdx]);

  const handleMouseEnter = useCallback((e: React.MouseEvent, subIndex?: 0 | 1) => {
    const snap = selectionSnapRef?.current;
    const curIndices = snap ? snap.selectedStepIndices : selectedStepIndices;
    const curMultiActive = snap ? snap.isMultiSelectActive : isMultiSelectActive;

    if (ctrlDragAnchorRef.current !== null && (e.buttons & 1) === 1) {
      const lo = Math.min(ctrlDragAnchorRef.current, i), hi = Math.max(ctrlDragAnchorRef.current, i);
      const range = Array.from({ length: hi - lo + 1 }, (_, k) => lo + k);
      setSelectedStepIndices(Array.from(new Set([...curIndices, ...range])));
      return;
    }
    if (curMultiActive && (e.buttons & 1) === 1) {
      if (!curIndices.includes(i)) setSelectedStepIndices([...curIndices, i]);
      return;
    }
    gesture.continueGestureOnEnter(i, e, subIndex, variation.id);
  }, [selectionSnapRef, selectedStepIndices, isMultiSelectActive, i, setSelectedStepIndices, gesture, variation.id]);

  const handleTouchStart = useCallback((e: React.TouchEvent, subIndex?: 0 | 1) => {
    e.stopPropagation();
    const snap = selectionSnapRef?.current;
    const curVarActive = snap ? snap.isVarActive : isVarActive;
    const curIndices = snap ? snap.selectedStepIndices : selectedStepIndices;
    const curMultiActive = snap ? snap.isMultiSelectActive : isMultiSelectActive;

    onSelectPattern(ptn.id); setSelectedPatternId(ptn.id); setSelectedVariationId(variation.id);
    if (curMultiActive) {
      const base = curVarActive ? curIndices : [];
      setSelectedStepIndices(base.includes(i) ? base.filter((idx) => idx !== i) : [...base, i]);
      return;
    }
    if (activeTool === 'scissors') { handleVariationScissors(variation.id, i, val); return; }
    setSelectedStepIdx(i); setSelectedStepIndices([]); setSelectedSubIndex?.(subIndex ?? null);
    if (isTouchDevice && onStepTouchStart) {
      const curSub = Array.isArray(val) ? val[subIndex ?? 0] : val;
      onStepTouchStart(e, ptn.id, i, inst.id, curSub, (newVal: any, merge?: boolean) => {
        let finalVal = merge ? String(newVal) : newVal;
        if (!merge && subIndex !== undefined && Array.isArray(val)) {
          const arr: [string, string] = [String(val[0]), String(val[1])];
          arr[subIndex] = String(newVal);
          finalVal = arr;
        }
        onVariationStepValueChange?.(ptn.id, variation.id, i, finalVal);
      }, trackId, Array.isArray(val), subIndex);
    }
  }, [selectionSnapRef, isVarActive, selectedStepIndices, isMultiSelectActive, onSelectPattern, ptn.id, setSelectedPatternId, setSelectedVariationId, variation.id, setSelectedStepIndices, i, activeTool, handleVariationScissors, val, setSelectedStepIdx, setSelectedSubIndex, isTouchDevice, onStepTouchStart, inst.id, onVariationStepValueChange, trackId]);

  return { handleMouseDown, handleMouseEnter, handleTouchStart };
}
