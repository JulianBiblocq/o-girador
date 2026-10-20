/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

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
    if (activeTool === 'scissors') {
      e.preventDefault(); e.stopPropagation(); if (e.button !== 0) return;
      handleScissorsClick(idx, value); return;
    }
    e.stopPropagation(); if (e.button !== 0) return;
    setSelectedPatternId(pattern.id); setSelectedVariationId(null);

    if (e.shiftKey || e.ctrlKey || e.metaKey) {
      if (!isMultiSelectActive) setIsMultiSelectActive(true);
      handleStepMouseDownMulti(e, idx, true); return;
    }

    if (isMultiSelectActive) {
      setIsMultiSelectActive(false); setSelectedStepIndices([idx]); setSelectedStepIdx(idx); setSelectedSubIndex(subIndex ?? null); return;
    }

    setSelectedStepIdx(idx); setSelectedStepIndices([idx]); setSelectedSubIndex(subIndex ?? null);
    useSequencerStore.setState({ selectedStepIdx: idx, selectedSubIndex: subIndex ?? null, selectedStepIsPreRoll: false });

    isMouseDownRef.current = true;
    const tool = activeToolRef.current;
    let strokeToApply: string | number;
    if (tool === '0' || tool === '' || tool === undefined) strokeToApply = 0;
    else if (isAlternatingRef.current) strokeToApply = getAlternatingStroke(idx, tool, instrument?.id, instrument?.type, lang, isLeftHanded);
    else {
      const curSub = (subIndex !== undefined && Array.isArray(value)) ? value[subIndex] : (Array.isArray(value) ? value[0] : value);
      strokeToApply = getNextNuanceState(curSub, tool, instrument?.id, instrument?.type, lang, isLeftHanded);
    }

    paintValueRef.current = strokeToApply === '0' ? 0 : strokeToApply;
    let finalVal: string | number | [string, string] = strokeToApply;
    if (Array.isArray(value)) {
      const arr = [...value] as [string, string]; const targetSub = subIndex ?? 0;
      arr[targetSub] = String(strokeToApply); finalVal = arr; setSelectedSubIndex(targetSub);
    } else setSelectedSubIndex(null);

    if (selectedVariationId) handleVariationStepValueChange(trackId, pattern.id, selectedVariationId, idx, finalVal as any);
    else handleTrackStepValueChange(trackId, pattern.id, idx, finalVal as any);

    const noteToPreview = Array.isArray(finalVal) ? (subIndex !== undefined ? finalVal[subIndex] : finalVal[0]) : finalVal;
    playGridStepPreview(trackId, pattern, noteToPreview, idx, subIndex);
  }, [activeTool, handleScissorsClick, pattern, isMultiSelectActive, handleStepMouseDownMulti, setSelectedPatternId, setSelectedVariationId, setIsMultiSelectActive, setSelectedStepIndices, setSelectedStepIdx, setSelectedSubIndex, instrument, lang, isLeftHanded, selectedVariationId, handleVariationStepValueChange, trackId, handleTrackStepValueChange]);

  const handleCellMouseEnter = React.useCallback((idx: number, e?: React.MouseEvent) => {
    if (e && e.buttons === 2) { handleClearStep(idx); return; }
    if (activeToolRef.current === 'scissors') return;
    if (isMultiSelectActive) { handleStepMouseEnterMulti(idx); return; }
    if (isMouseDownRef.current) {
      const tool = activeToolRef.current;
      let strokeToApply: string | number;
      if (tool === '0' || tool === '' || tool === undefined) strokeToApply = 0;
      else if (isAlternatingRef.current) strokeToApply = getAlternatingStroke(idx, tool, instrument?.id, instrument?.type, lang, isLeftHanded);
      else strokeToApply = paintValueRef.current;

      if (selectedVariationId) handleVariationStepValueChange(trackId, pattern.id, selectedVariationId, idx, strokeToApply as any);
      else handleTrackStepValueChange(trackId, pattern.id, idx, strokeToApply as any);

      playGridStepPreview(trackId, pattern, strokeToApply, idx);
    }
  }, [handleClearStep, isMultiSelectActive, handleStepMouseEnterMulti, selectedVariationId, handleVariationStepValueChange, trackId, pattern, handleTrackStepValueChange, instrument, lang, isLeftHanded]);

  return { isMouseDownRef, handleCellMouseDown, handleCellMouseEnter };
}
