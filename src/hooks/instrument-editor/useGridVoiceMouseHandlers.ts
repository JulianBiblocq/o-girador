/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { Pattern } from '../../types';

interface UseGridVoiceMouseHandlersParams {
  trackId: number;
  pattern: Pattern;
  activeTool: string;
  isMultiSelectActive: boolean;
  selectedStepIdx: number | null;
  selectedStepIsPreRoll?: boolean;
  handleVoiceStepClear: (tId: number, pId: number, idx: number, isPre?: boolean) => void;
  handleStepMouseDownMulti: (e: any, idx: number) => void;
  handleStepMouseEnterMulti: (idx: number) => void;
  handleVoiceFocusStep: (idx: number, isPre?: boolean) => void;
}

export function useGridVoiceMouseHandlers(params: UseGridVoiceMouseHandlersParams) {
  const {
    trackId, pattern, activeTool, isMultiSelectActive, selectedStepIdx,
    selectedStepIsPreRoll, handleVoiceStepClear, handleStepMouseDownMulti,
    handleStepMouseEnterMulti, handleVoiceFocusStep
  } = params;

  const handleVoiceMouseDown = React.useCallback((e: React.MouseEvent<HTMLDivElement>, idx: number) => {
    if (activeTool === '0') { handleVoiceStepClear(trackId, pattern.id, idx); return; }
    if (e.shiftKey) {
      e.preventDefault(); e.stopPropagation();
      const state = useSequencerStore.getState();
      const currentStart = state.selectedStepRange?.start ?? ((selectedStepIdx !== null && selectedStepIdx !== undefined)
        ? { isPreRoll: Boolean(selectedStepIsPreRoll), step: selectedStepIdx }
        : { isPreRoll: false, step: idx });
      useSequencerStore.getState().setSelectedStepRange({
        start: currentStart, end: { isPreRoll: false, step: idx },
        patternId: pattern.id, trackId
      });
      return;
    }
    useSequencerStore.getState().setSelectedStepRange(null);
    if (isMultiSelectActive) { handleStepMouseDownMulti(e as any, idx); return; }
    handleVoiceFocusStep(idx, false);
  }, [activeTool, isMultiSelectActive, handleStepMouseDownMulti, handleVoiceStepClear, handleVoiceFocusStep, trackId, pattern.id, selectedStepIdx, selectedStepIsPreRoll]);

  const handleVoicePreRollMouseDown = React.useCallback((e: React.MouseEvent<HTMLDivElement>, idx: number) => {
    if (activeTool === '0') { handleVoiceStepClear(trackId, pattern.id, idx, true); return; }
    if (e.shiftKey) {
      e.preventDefault(); e.stopPropagation();
      const state = useSequencerStore.getState();
      const currentStart = state.selectedStepRange?.start ?? ((selectedStepIdx !== null && selectedStepIdx !== undefined)
        ? { isPreRoll: Boolean(selectedStepIsPreRoll), step: selectedStepIdx }
        : { isPreRoll: true, step: idx });
      useSequencerStore.getState().setSelectedStepRange({
        start: currentStart, end: { isPreRoll: true, step: idx },
        patternId: pattern.id, trackId
      });
      return;
    }
    useSequencerStore.getState().setSelectedStepRange(null);
    handleVoiceFocusStep(idx, true);
  }, [activeTool, handleVoiceStepClear, handleVoiceFocusStep, trackId, pattern.id, selectedStepIdx, selectedStepIsPreRoll]);

  const handleVoiceMouseEnter = React.useCallback((idx: number, e?: React.MouseEvent) => {
    if (e && e.buttons === 2) { handleVoiceStepClear(trackId, pattern.id, idx); return; }
    if (isMultiSelectActive) handleStepMouseEnterMulti(idx);
  }, [isMultiSelectActive, handleStepMouseEnterMulti, handleVoiceStepClear, trackId, pattern.id]);

  return { handleVoiceMouseDown, handleVoicePreRollMouseDown, handleVoiceMouseEnter };
}
