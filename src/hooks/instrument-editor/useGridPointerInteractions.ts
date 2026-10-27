
import React, { useRef } from 'react';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { getNextNuanceState, getAlternatingStroke } from '../../utils/instrumentStrokes';
import { playGridStepPreview } from './playGridStepPreview';
import { Pattern } from '../../types';

interface UseGridPointerInteractionsParams {
  trackId: number;
  pattern: Pattern;
  instrument: { id: string; type: string; [key: string]: any };
  activeTool: string;
  isAlternating: boolean;
  lang: string;
  isLeftHanded: boolean;
  selectedVariationId: string | null;
  isMultiSelectActive: boolean;
  handleScissorsClick: (idx: number, val?: any) => void;
  handleClearStep: (idx: number, subIndex?: 0 | 1) => void;
  handleStepMouseDownMulti: (e: any, idx: number, force?: boolean) => void;
  handleStepMouseEnterMulti: (idx: number) => void;
  handleVariationStepValueChange: (tId: number, pId: number, vId: string, idx: any, val: any) => void;
  handleTrackStepValueChange: (tId: number, pId: number, idx: any, val: any) => void;
  setSelectedStepIdx: (idx: number) => void;
  setSelectedStepIndices: (indices: number[]) => void;
  setSelectedSubIndex: (sub: 0 | 1 | null) => void;
  setSelectedPatternId: (pId: number) => void;
  setSelectedVariationId: (vId: string | null) => void;
  setIsMultiSelectActive: (active: boolean) => void;
}

export function useGridPointerInteractions(params: UseGridPointerInteractionsParams) {
  const {
    trackId, pattern, instrument, activeTool, isAlternating, lang, isLeftHanded,
    selectedVariationId, isMultiSelectActive, handleScissorsClick, handleClearStep,
    handleStepMouseDownMulti, handleStepMouseEnterMulti,
    handleVariationStepValueChange, handleTrackStepValueChange,
    setSelectedStepIdx, setSelectedStepIndices, setSelectedSubIndex,
    setSelectedPatternId, setSelectedVariationId, setIsMultiSelectActive
  } = params;

  const isMouseDownRef = useRef(false);
  const paintValueRef = useRef<string | number>(0);
  const activeToolRef = useRef(activeTool);
  activeToolRef.current = activeTool;
  const isAlternatingRef = useRef(isAlternating);
  isAlternatingRef.current = isAlternating;

  const handleCellMouseDown = React.useCallback((e: React.MouseEvent<any>, idx: number, value: any, subIndex?: 0 | 1) => {
    if (activeToolRef.current === 'scissors') {
      e.preventDefault(); e.stopPropagation(); if (e.button !== 0) return;
      handleScissorsClick(idx, value); return;
    }
    e.stopPropagation(); if (e.button !== 0) return;
    setSelectedPatternId(pattern.id); setSelectedVariationId(null);

    if (e.shiftKey) {
      e.preventDefault();
      e.stopPropagation();
      const state = useSequencerStore.getState();
      const currentStart = state.selectedStepRange?.start ?? ((state.selectedStepIdx !== null && state.selectedStepIdx !== undefined)
        ? { isPreRoll: false, step: state.selectedStepIdx }
        : { isPreRoll: false, step: idx });
      useSequencerStore.getState().setSelectedStepRange({
        start: currentStart,
        end: { isPreRoll: false, step: idx },
        patternId: pattern.id,
        trackId
      });
      return;
    }

    if (e.ctrlKey || e.metaKey) {
      if (!isMultiSelectActive) setIsMultiSelectActive(true);
      handleStepMouseDownMulti(e, idx, true);
      return;
    }

    useSequencerStore.getState().setSelectedStepRange(null);

    if (isMultiSelectActive) {
      setIsMultiSelectActive(false); setSelectedStepIndices([idx]); setSelectedStepIdx(idx); setSelectedSubIndex(subIndex ?? null); return;
    }

    setSelectedStepIdx(idx); setSelectedStepIndices([idx]); setSelectedSubIndex(subIndex ?? null);
    useSequencerStore.setState({ selectedStepIdx: idx, selectedSubIndex: subIndex ?? null, selectedStepIsPreRoll: false });

    isMouseDownRef.current = true;
    const tool = activeToolRef.current;
    let strokeToApply: string | number;
    if (!tool || tool === '0' || tool === '') {
      strokeToApply = 0;
    } else {
      const curSub = (subIndex !== undefined && Array.isArray(value)) ? value[subIndex] : (Array.isArray(value) ? value[0] : value);
      const normCur = String(curSub ?? '0').trim();
      const isAlternationEligible = (tool === 'D' || tool === 'E') && isAlternatingRef.current;
      if (isAlternationEligible) {
        strokeToApply = getAlternatingStroke(idx, tool, instrument?.id, instrument?.type, lang, isLeftHanded);
      } else if (normCur === tool) {
        strokeToApply = 0;
      } else {
        strokeToApply = tool;
      }
    }

    paintValueRef.current = strokeToApply === '0' ? 0 : strokeToApply;
    let finalVal: string | number | [string, string] = strokeToApply === '0' ? 0 : strokeToApply;
    if (Array.isArray(value)) {
      const arr = [...value] as [string, string]; const targetSub = subIndex ?? 0;
      arr[targetSub] = String(strokeToApply); finalVal = arr; setSelectedSubIndex(targetSub);
    } else setSelectedSubIndex(null);

    if (selectedVariationId) handleVariationStepValueChange(trackId, pattern.id, selectedVariationId, idx, finalVal as any);
    else handleTrackStepValueChange(trackId, pattern.id, idx, finalVal as any);

    const noteToPreview = Array.isArray(finalVal) ? (subIndex !== undefined ? finalVal[subIndex] : finalVal[0]) : finalVal;
    playGridStepPreview(trackId, pattern, noteToPreview, idx, subIndex);
  }, [handleScissorsClick, pattern, isMultiSelectActive, handleStepMouseDownMulti, setSelectedPatternId, setSelectedVariationId, setIsMultiSelectActive, setSelectedStepIndices, setSelectedStepIdx, setSelectedSubIndex, instrument, lang, isLeftHanded, selectedVariationId, handleVariationStepValueChange, trackId, handleTrackStepValueChange]);

  const handleCellMouseEnter = React.useCallback((idx: number, e?: React.MouseEvent) => {
    if (e && e.buttons === 2) { handleClearStep(idx); return; }
    if (activeToolRef.current === 'scissors') return;
    if (isMultiSelectActive) { handleStepMouseEnterMulti(idx); }
    // Drag-to-paint désactivé : pose au clic uniquement
  }, [handleClearStep, isMultiSelectActive, handleStepMouseEnterMulti]);

  return { isMouseDownRef, handleCellMouseDown, handleCellMouseEnter };
}
