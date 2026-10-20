/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef } from 'react';
import { Pattern } from '../../types';

interface UseGridMultiSelectInteractionsParams {
  trackId: number;
  pattern: Pattern;
  instrumentId: string;
  isMultiSelectActive: boolean;
  selectedStepIdx: number | null;
  selectedStepIndices: number[];
  selectedVariationId: string | null;
  onStepTouchStart?: (e: any, pId: number, sIdx: number, instId: string, val: any, onSel: any, tId: number) => void;
  handleVariationStepValueChange: (tId: number, pId: number, vId: string, idx: any, val: any) => void;
  handleTrackStepValueChange: (tId: number, pId: number, idx: any, val: any) => void;
  setSelectedStepIndices: React.Dispatch<React.SetStateAction<number[]>>;
  setSelectedStepIdx: (idx: number) => void;
}

export function useGridMultiSelectInteractions(params: UseGridMultiSelectInteractionsParams) {
  const {
    trackId, pattern, instrumentId, isMultiSelectActive, selectedStepIdx,
    selectedStepIndices, selectedVariationId, onStepTouchStart,
    handleVariationStepValueChange, handleTrackStepValueChange,
    setSelectedStepIndices, setSelectedStepIdx
  } = params;

  const isSelectingRef = useRef(false);
  const hasDraggedRef = useRef(false);
  const initialTouchIndexRef = useRef<number | null>(null);
  const wasSelectedRef = useRef(false);
  const touchStartPos = useRef<{ x: number; y: number } | null>(null);

  const handleStepTouchStartMulti = React.useCallback((e: React.MouseEvent | React.TouchEvent, index: number) => {
    if (!isMultiSelectActive) return;
    isSelectingRef.current = true;
    hasDraggedRef.current = false;
    initialTouchIndexRef.current = index;
    if ('touches' in e && e.touches.length > 0) touchStartPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    const wasSel = selectedStepIndices.includes(index);
    wasSelectedRef.current = wasSel;
    if (e.ctrlKey || e.metaKey || e.shiftKey) {
      if (!wasSel) setSelectedStepIndices(prev => [...prev, index]);
    } else {
      setSelectedStepIndices([index]);
    }
  }, [isMultiSelectActive, selectedStepIndices, setSelectedStepIndices]);

  const handleStepMouseDownMulti = React.useCallback((e: React.MouseEvent | React.TouchEvent, index: number, forceActive = false) => {
    if (!isMultiSelectActive && !forceActive) return;
    if ('button' in e && e.button !== 0) return;
    isSelectingRef.current = true;
    hasDraggedRef.current = false;
    initialTouchIndexRef.current = index;
    const wasSel = selectedStepIndices.includes(index);
    wasSelectedRef.current = wasSel;

    if (e.shiftKey) {
      if (selectedStepIdx !== null) {
        const start = Math.min(selectedStepIdx, index);
        const end = Math.max(selectedStepIdx, index);
        const rangeIndices = Array.from({ length: end - start + 1 }, (_, k) => start + k);
        if (e.ctrlKey || e.metaKey) setSelectedStepIndices(prev => Array.from(new Set([...prev, ...rangeIndices])));
        else setSelectedStepIndices(rangeIndices);
      } else {
        setSelectedStepIndices([index]);
        setSelectedStepIdx(index);
      }
    } else if (e.ctrlKey || e.metaKey) {
      if (wasSel) setSelectedStepIndices(prev => prev.filter(i => i !== index));
      else setSelectedStepIndices(prev => [...prev, index]);
      setSelectedStepIdx(index);
    } else {
      setSelectedStepIndices([index]);
      setSelectedStepIdx(index);
    }
  }, [isMultiSelectActive, selectedStepIndices, selectedStepIdx, setSelectedStepIndices, setSelectedStepIdx]);

  const handleStepMouseEnterMulti = React.useCallback((index: number) => {
    if (!isMultiSelectActive || !isSelectingRef.current) return;
    hasDraggedRef.current = true;
    setSelectedStepIndices(prev => (prev.includes(index) ? prev : [...prev, index]));
  }, [isMultiSelectActive, setSelectedStepIndices]);

  const handleGridTouchMove = React.useCallback((e: React.TouchEvent) => {
    if (!isMultiSelectActive || !isSelectingRef.current || !touchStartPos.current) return;
    const touch = e.touches[0];
    const dx = touch.clientX - touchStartPos.current.x;
    const dy = touch.clientY - touchStartPos.current.y;
    if (Math.abs(dx) > Math.abs(dy)) {
      if (e.cancelable) e.preventDefault();
      if (Math.abs(dx) > 10) hasDraggedRef.current = true;
      const element = document.elementFromPoint(touch.clientX, touch.clientY);
      if (element) {
        const stepInput = element.closest('[data-track-id][data-step-index]');
        if (stepInput && stepInput.getAttribute('data-track-id') === String(trackId)) {
          const stepIdxAttr = stepInput.getAttribute('data-step-index');
          if (stepIdxAttr !== null) {
            const stepIdx = parseInt(stepIdxAttr, 10);
            setSelectedStepIndices(prev => (prev.includes(stepIdx) ? prev : [...prev, stepIdx]));
          }
        }
      }
    }
  }, [isMultiSelectActive, trackId, setSelectedStepIndices]);

  const handleGridTouchEnd = React.useCallback((e: React.TouchEvent) => {
    if (!isMultiSelectActive || !isSelectingRef.current) return;
    isSelectingRef.current = false;
    if (!hasDraggedRef.current && initialTouchIndexRef.current !== null) {
      const tappedIdx = initialTouchIndexRef.current;
      if (selectedStepIndices.includes(tappedIdx) && selectedStepIndices.length > 0) {
        const stepVal = pattern?.activeSteps?.[tappedIdx];
        if (onStepTouchStart) {
          onStepTouchStart(e, pattern.id, tappedIdx, instrumentId, stepVal as string | number, (newVal: any, merge?: boolean) => {
            const finalVal = merge ? String(newVal) : newVal;
            if (selectedVariationId) handleVariationStepValueChange(trackId, pattern.id, selectedVariationId, selectedStepIndices, finalVal);
            else handleTrackStepValueChange(trackId, pattern.id, selectedStepIndices, finalVal);
            setSelectedStepIndices([]);
          }, trackId);
        }
      } else {
        setSelectedStepIndices(prev => prev.includes(tappedIdx) ? prev.filter(idx => idx !== tappedIdx) : [...prev, tappedIdx]);
      }
    }
    touchStartPos.current = null;
    initialTouchIndexRef.current = null;
  }, [isMultiSelectActive, selectedStepIndices, pattern?.activeSteps, pattern.id, onStepTouchStart, instrumentId, selectedVariationId, handleVariationStepValueChange, trackId, handleTrackStepValueChange, setSelectedStepIndices]);

  return {
    isSelectingRef, hasDraggedRef, initialTouchIndexRef, wasSelectedRef,
    handleStepTouchStartMulti, handleStepMouseDownMulti, handleStepMouseEnterMulti,
    handleGridTouchMove, handleGridTouchEnd
  };
}
