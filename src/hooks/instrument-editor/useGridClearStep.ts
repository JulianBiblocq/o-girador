import React from 'react';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { Pattern } from '../../types';
import { readFreshStepState, computeErasedStepResult } from './gridStepMutationHelpers';

interface UseGridClearStepParams {
  trackId: number;
  pattern: Pattern;
  selectedVariationId: string | null;
  selectedStepIdx: number | null;
  handleVariationStepValueChange: (tId: number, pId: number, vId: string, idx: any, val: any, opts?: { skipUndo?: boolean }) => void;
  handleTrackStepValueChange: (tId: number, pId: number, idx: any, val: any, lyrics?: any, notes?: any, opts?: { skipUndo?: boolean }) => void;
  setSelectedSubIndex: (sub: 0 | 1 | null) => void;
  setSelectedStepIdx: (idx: number) => void;
  setSelectedStepIsPreRoll?: (isPre: boolean) => void;
  setVoiceStepContextMenu: (menu: { x: number; y: number; stepIdx: number; isPreRoll: boolean } | null) => void;
}

export function useGridClearStep({
  trackId,
  pattern,
  selectedVariationId,
  selectedStepIdx,
  handleVariationStepValueChange,
  handleTrackStepValueChange,
  setSelectedSubIndex,
  setSelectedStepIdx,
  setSelectedStepIsPreRoll,
  setVoiceStepContextMenu,
}: UseGridClearStepParams) {
  const handleClearStep = React.useCallback((idx: number, subIndex?: 0 | 1, variationIdOverride?: string | null) => {
    const targetVarId = variationIdOverride !== undefined ? variationIdOverride : selectedVariationId;
    const { rawVal } = readFreshStepState(trackId, pattern.id, targetVarId, idx);
    const res = computeErasedStepResult(rawVal, subIndex);
    if (!res.changed) return;

    setSelectedSubIndex(res.nextSub);
    if (targetVarId) {
      handleVariationStepValueChange(trackId, pattern.id, targetVarId, idx, res.finalVal as any);
    } else {
      handleTrackStepValueChange(trackId, pattern.id, idx, res.finalVal as any);
    }

    if (selectedStepIdx === idx && res.finalVal === 0) {
      setSelectedSubIndex(null);
    }
  }, [trackId, pattern.id, selectedVariationId, selectedStepIdx, handleVariationStepValueChange, handleTrackStepValueChange, setSelectedSubIndex]);

  const handleCellContextMenu = React.useCallback((e: React.MouseEvent<any>, _idx: number, _value: any, _subIndex?: 0 | 1) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleVoiceContextMenu = React.useCallback((e: React.MouseEvent<any>, idx: number, isPreRoll?: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    const state = useSequencerStore.getState();
    if (!state.selectedStepRange) {
      useSequencerStore.setState({ selectedStepIdx: idx, selectedStepIsPreRoll: Boolean(isPreRoll) });
      setSelectedStepIdx(idx);
      if (setSelectedStepIsPreRoll) setSelectedStepIsPreRoll(Boolean(isPreRoll));
    }
    setVoiceStepContextMenu({ x: e.clientX, y: e.clientY, stepIdx: idx, isPreRoll: Boolean(isPreRoll) });
  }, [setSelectedStepIdx, setSelectedStepIsPreRoll, setVoiceStepContextMenu]);

  return { handleClearStep, handleCellContextMenu, handleVoiceContextMenu };
}
