import React, { useRef, useCallback } from 'react';
import type { UseGridMultiSelectInteractionsParams } from './gridMultiSelectTypes';

export function useGridMultiSelectInteractions(params: UseGridMultiSelectInteractionsParams) {
  const {
    trackId, pattern, isMultiSelectActive, selectedStepIdx,
    selectedStepIndices, setSelectedStepIndices, setSelectedStepIdx,
  } = params;

  const isSelectingRef = useRef(false);
  const hasDraggedRef = useRef(false);
  const initialTouchIndexRef = useRef<number | null>(null);
  const wasSelectedRef = useRef(false);
  const touchStartPos = useRef<{ x: number; y: number } | null>(null);

  const handleStepTouchStartMulti = useCallback((e: React.MouseEvent | React.TouchEvent, index: number) => {
    if (!isMultiSelectActive) return;
    isSelectingRef.current = true;
    hasDraggedRef.current = false;
    initialTouchIndexRef.current = index;
    if ('touches' in e && e.touches.length > 0) {
      touchStartPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
    wasSelectedRef.current = selectedStepIndices.includes(index);
    setSelectedStepIdx(index);
  }, [isMultiSelectActive, selectedStepIndices, setSelectedStepIdx]);

  const handleStepMouseDownMulti = useCallback((e: React.MouseEvent | React.TouchEvent, index: number, forceActive = false) => {
    if (!isMultiSelectActive && !forceActive) return;
    if ('button' in e && e.button !== 0) return;
    isSelectingRef.current = true;
    hasDraggedRef.current = false;
    initialTouchIndexRef.current = index;
    const wasSel = selectedStepIndices.includes(index);
    wasSelectedRef.current = wasSel;

    if (e.shiftKey && selectedStepIdx !== null) {
      const lo = Math.min(selectedStepIdx, index), hi = Math.max(selectedStepIdx, index);
      const range = Array.from({ length: hi - lo + 1 }, (_, k) => lo + k);
      setSelectedStepIndices((prev) => Array.from(new Set([...prev, ...range])));
    } else {
      setSelectedStepIndices((prev) => (prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]));
      setSelectedStepIdx(index);
    }
  }, [isMultiSelectActive, selectedStepIndices, selectedStepIdx, setSelectedStepIndices, setSelectedStepIdx]);

  const handleStepMouseEnterMulti = useCallback((index: number) => {
    if (!isMultiSelectActive || !isSelectingRef.current) return;
    hasDraggedRef.current = true;
    const anchor = initialTouchIndexRef.current;
    if (anchor !== null) {
      const lo = Math.min(anchor, index), hi = Math.max(anchor, index);
      const range = Array.from({ length: hi - lo + 1 }, (_, k) => lo + k);
      setSelectedStepIndices((prev) => Array.from(new Set([...prev, ...range])));
    } else {
      setSelectedStepIndices((prev) => (prev.includes(index) ? prev : [...prev, index]));
    }
  }, [isMultiSelectActive, setSelectedStepIndices]);

  const handleGridTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isMultiSelectActive || !isSelectingRef.current || !touchStartPos.current || e.touches.length === 0) return;
    const touch = e.touches[0];
    const dx = touch.clientX - touchStartPos.current.x;
    const dy = touch.clientY - touchStartPos.current.y;
    if (e.cancelable) e.preventDefault();
    if (dx * dx + dy * dy > 36) hasDraggedRef.current = true;
    const doc = (touch.target as Element)?.ownerDocument || document;
    const element = doc.elementFromPoint(touch.clientX, touch.clientY);
    const stepEl = element?.closest('[data-track-id][data-pattern-id][data-step-index]');
    if (
      stepEl &&
      stepEl.getAttribute('data-track-id') === String(trackId) &&
      stepEl.getAttribute('data-pattern-id') === String(pattern.id)
    ) {
      const stepIdx = parseInt(stepEl.getAttribute('data-step-index') || '-1', 10);
      if (stepIdx >= 0) {
        const anchor = initialTouchIndexRef.current ?? stepIdx;
        const lo = Math.min(anchor, stepIdx), hi = Math.max(anchor, stepIdx);
        const range = Array.from({ length: hi - lo + 1 }, (_, k) => lo + k);
        setSelectedStepIndices((prev) => Array.from(new Set([...prev, ...range])));
      }
    }
  }, [isMultiSelectActive, trackId, pattern.id, setSelectedStepIndices]);

  const handleGridTouchEnd = useCallback((_e: React.TouchEvent) => {
    if (!isMultiSelectActive || !isSelectingRef.current) return;
    isSelectingRef.current = false;
    if (!hasDraggedRef.current && initialTouchIndexRef.current !== null) {
      const tappedIdx = initialTouchIndexRef.current;
      setSelectedStepIndices((prev) =>
        prev.includes(tappedIdx) ? prev.filter((idx) => idx !== tappedIdx) : [...prev, tappedIdx]
      );
    }
    touchStartPos.current = null;
    initialTouchIndexRef.current = null;
  }, [isMultiSelectActive, setSelectedStepIndices]);

  return {
    isSelectingRef, hasDraggedRef, initialTouchIndexRef, wasSelectedRef,
    handleStepTouchStartMulti, handleStepMouseDownMulti, handleStepMouseEnterMulti,
    handleGridTouchMove, handleGridTouchEnd,
  };
}
