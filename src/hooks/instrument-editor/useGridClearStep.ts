/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { Pattern } from '../../types';

interface UseGridClearStepParams {
  trackId: number;
  pattern: Pattern;
  selectedVariationId: string | null;
  selectedStepIdx: number | null;
  handleVariationStepValueChange: (tId: number, pId: number, vId: string, idx: any, val: any) => void;
  handleTrackStepValueChange: (tId: number, pId: number, idx: any, val: any) => void;
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
  setVoiceStepContextMenu
}: UseGridClearStepParams) {
  const handleClearStep = React.useCallback((idx: number, subIndex?: 0 | 1) => {
    const rawVal = pattern?.activeSteps?.[idx];
    if (rawVal === 0 || rawVal === '0' || rawVal === '' || rawVal === null || rawVal === undefined) {
      return;
    }

    let finalVal: string | number | [string, string] = 0;
    if (Array.isArray(rawVal)) {
      if (subIndex !== undefined) {
        const arr: [string, string] = [...rawVal] as [string, string];
        arr[subIndex] = '0';
        if ((arr[0] === '0' || !arr[0]) && (arr[1] === '0' || !arr[1])) {
          finalVal = 0;
          setSelectedSubIndex(null);
        } else {
          finalVal = arr;
          setSelectedSubIndex(subIndex);
        }
      } else {
        finalVal = 0;
        setSelectedSubIndex(null);
      }
    } else {
      finalVal = 0;
      setSelectedSubIndex(null);
    }

    if (selectedVariationId) {
      handleVariationStepValueChange(trackId, pattern.id, selectedVariationId, idx, finalVal as any);
    } else {
      handleTrackStepValueChange(trackId, pattern.id, idx, finalVal as any);
    }

    if (selectedStepIdx === idx && finalVal === 0) {
      setSelectedSubIndex(null);
    }
  }, [pattern?.activeSteps, pattern?.id, selectedVariationId, selectedStepIdx, trackId, handleVariationStepValueChange, handleTrackStepValueChange, setSelectedSubIndex]);

  const handleCellContextMenu = React.useCallback((e: React.MouseEvent<any>, idx: number, _value: any, subIndex?: 0 | 1) => {
    e.preventDefault();
    handleClearStep(idx, subIndex);
  }, [handleClearStep]);

  const handleVoiceContextMenu = React.useCallback((e: React.MouseEvent<any>, idx: number, isPreRoll?: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    const state = useSequencerStore.getState();
    if (!state.selectedStepRange) {
      useSequencerStore.setState({
        selectedStepIdx: idx,
        selectedStepIsPreRoll: Boolean(isPreRoll)
      });
      setSelectedStepIdx(idx);
      if (setSelectedStepIsPreRoll) setSelectedStepIsPreRoll(Boolean(isPreRoll));
    }
    setVoiceStepContextMenu({
      x: e.clientX,
      y: e.clientY,
      stepIdx: idx,
      isPreRoll: Boolean(isPreRoll)
    });
  }, [setSelectedStepIdx, setSelectedStepIsPreRoll, setVoiceStepContextMenu]);

  return { handleClearStep, handleCellContextMenu, handleVoiceContextMenu };
}
