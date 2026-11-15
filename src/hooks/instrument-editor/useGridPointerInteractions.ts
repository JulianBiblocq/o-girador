import React, { useRef, useEffect, useCallback } from 'react';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { useWindow } from '../../contexts/WindowContext';
import { useGridPaintAndEraseGesture } from './useGridPaintAndEraseGesture';
import { Pattern } from '../../types';

interface UseGridPointerInteractionsParams {
  trackId: number;
  pattern: Pattern;
  instrument: { id: string; type: string; [key: string]: any };
  activeTool: string;
  isAlternating: boolean;
  lang: string;
  isLeftHanded: boolean;
  selectedPatternId: number;
  selectedVariationId: string | null;
  selectedStepIdx: number | null;
  selectedStepIndices: number[];
  isMultiSelectActive: boolean;
  handleScissorsClick: (idx: number, val?: any) => void;
  handleStepMouseDownMulti: (e: any, idx: number, force?: boolean) => void;
  handleStepMouseEnterMulti: (idx: number) => void;
  handleVariationStepValueChange: (tId: number, pId: number, vId: string, idx: any, val: any, opts?: { skipUndo?: boolean }) => void;
  handleTrackStepValueChange: (tId: number, pId: number, idx: any, val: any, lyrics?: any, notes?: any, opts?: { skipUndo?: boolean }) => void;
  setSelectedStepIdx: (idx: number) => void;
  setSelectedStepIndices: React.Dispatch<React.SetStateAction<number[]>>;
  setSelectedSubIndex: (sub: 0 | 1 | null) => void;
  setSelectedPatternId: (pId: number) => void;
  setSelectedVariationId: (vId: string | null) => void;
}

export function useGridPointerInteractions(params: UseGridPointerInteractionsParams) {
  const {
    trackId, pattern, instrument, activeTool, isAlternating, lang, isLeftHanded,
    selectedPatternId, selectedVariationId, selectedStepIdx, selectedStepIndices,
    isMultiSelectActive, handleScissorsClick, handleStepMouseDownMulti, handleStepMouseEnterMulti,
    handleVariationStepValueChange, handleTrackStepValueChange,
    setSelectedStepIdx, setSelectedStepIndices, setSelectedSubIndex,
    setSelectedPatternId, setSelectedVariationId,
  } = params;

  const hostWin = useWindow();
  const ctrlDragAnchorRef = useRef<number | null>(null);
  const activeToolRef = useRef(activeTool);
  activeToolRef.current = activeTool;

  useEffect(() => {
    const clearDrag = () => { ctrlDragAnchorRef.current = null; };
    hostWin.addEventListener('mouseup', clearDrag);
    hostWin.addEventListener('blur', clearDrag);
    return () => {
      hostWin.removeEventListener('mouseup', clearDrag);
      hostWin.removeEventListener('blur', clearDrag);
    };
  }, [hostWin]);

  const onCommitStep = useCallback((idx: number, finalVal: any, varId: string | null, opts?: { skipUndo?: boolean }) => {
    if (varId) handleVariationStepValueChange(trackId, pattern.id, varId, idx, finalVal, opts);
    else handleTrackStepValueChange(trackId, pattern.id, idx, finalVal, undefined, undefined, opts);
  }, [trackId, pattern.id, handleVariationStepValueChange, handleTrackStepValueChange]);

  const onSelectCell = useCallback((idx: number, sub: 0 | 1 | null, varId: string | null) => {
    setSelectedPatternId(pattern.id); setSelectedVariationId(varId);
    setSelectedStepIdx(idx); setSelectedStepIndices([]); setSelectedSubIndex(sub);
    useSequencerStore.setState({ selectedStepIdx: idx, selectedSubIndex: sub, selectedStepIsPreRoll: false });
  }, [pattern.id, setSelectedPatternId, setSelectedVariationId, setSelectedStepIdx, setSelectedStepIndices, setSelectedSubIndex]);

  const gesture = useGridPaintAndEraseGesture({
    trackId, patternId: pattern.id, instrument, activeTool, isAlternating, lang, isLeftHanded, onCommitStep, onSelectCell,
  });

  const handleCellMouseDown = useCallback((e: React.MouseEvent<any>, idx: number, value: any, subIndex?: 0 | 1) => {
    e.stopPropagation();
    if (e.button === 2) {
      e.preventDefault(); setSelectedPatternId(pattern.id); setSelectedVariationId(null);
      gesture.beginErase(idx, subIndex, null); return;
    }
    if (e.button !== 0) return;

    if (activeToolRef.current === 'scissors' && !isMultiSelectActive && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
      e.preventDefault(); setSelectedPatternId(pattern.id); setSelectedVariationId(null);
      handleScissorsClick(idx, value); return;
    }

    const isSameGrid = selectedPatternId === pattern.id && selectedVariationId === null;
    setSelectedPatternId(pattern.id); setSelectedVariationId(null);
    useSequencerStore.getState().setSelectedStepRange(null);

    if (e.shiftKey) {
      e.preventDefault();
      const anchor = isSameGrid && selectedStepIdx !== null ? selectedStepIdx : idx;
      const lo = Math.min(anchor, idx), hi = Math.max(anchor, idx);
      const range = Array.from({ length: hi - lo + 1 }, (_, k) => lo + k);
      setSelectedStepIndices(e.ctrlKey || e.metaKey ? Array.from(new Set([...(isSameGrid ? selectedStepIndices : []), ...range])) : range);
      if (!isSameGrid || selectedStepIdx === null) setSelectedStepIdx(idx);
      return;
    }

    if (e.ctrlKey || e.metaKey) {
      e.preventDefault(); ctrlDragAnchorRef.current = idx;
      const base = isSameGrid
        ? (selectedStepIndices.length > 0 ? selectedStepIndices : (selectedStepIdx !== null && selectedStepIdx !== idx ? [selectedStepIdx] : []))
        : [];
      setSelectedStepIndices(base.includes(idx) ? base.filter((x) => x !== idx) : [...base, idx]);
      setSelectedStepIdx(idx); return;
    }

    if (isMultiSelectActive) { handleStepMouseDownMulti(e, idx, true); return; }
    gesture.beginPaintOrToggle(idx, subIndex, null);
  }, [pattern.id, selectedPatternId, selectedVariationId, selectedStepIdx, selectedStepIndices, isMultiSelectActive, handleScissorsClick, handleStepMouseDownMulti, setSelectedPatternId, setSelectedVariationId, setSelectedStepIndices, setSelectedStepIdx, gesture]);

  const handleCellMouseEnter = useCallback((idx: number, e?: React.MouseEvent, subIndex?: 0 | 1) => {
    if (ctrlDragAnchorRef.current !== null && e && (e.buttons & 1) === 1) {
      const lo = Math.min(ctrlDragAnchorRef.current, idx), hi = Math.max(ctrlDragAnchorRef.current, idx);
      const range = Array.from({ length: hi - lo + 1 }, (_, k) => lo + k);
      setSelectedStepIndices((prev) => Array.from(new Set([...prev, ...range])));
      return;
    }
    if (isMultiSelectActive && e && (e.buttons & 1) === 1) { handleStepMouseEnterMulti(idx); return; }
    gesture.continueGestureOnEnter(idx, e, subIndex, null);
  }, [isMultiSelectActive, handleStepMouseEnterMulti, setSelectedStepIndices, gesture]);

  return { isMouseDownRef: gesture.pointerModeRef, handleCellMouseDown, handleCellMouseEnter };
}
