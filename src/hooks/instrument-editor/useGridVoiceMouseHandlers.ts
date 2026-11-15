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
    handleStepMouseEnterMulti, handleVoiceFocusStep,
  } = params;

  const applyVoiceModifierOrMultiDown = React.useCallback((e: React.MouseEvent<HTMLDivElement>, idx: number, isPreRoll: boolean): boolean => {
    const store = useSequencerStore.getState();
    if (e.shiftKey) {
      e.preventDefault(); e.stopPropagation();
      const currentStart = store.selectedStepRange?.patternId === pattern.id
        ? store.selectedStepRange.start
        : ((selectedStepIdx !== null && selectedStepIdx !== undefined)
          ? { isPreRoll: Boolean(selectedStepIsPreRoll), step: selectedStepIdx }
          : { isPreRoll, step: idx });
      store.setSelectedStepRange({ start: currentStart, end: { isPreRoll, step: idx }, patternId: pattern.id, trackId });
      return true;
    }
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault(); e.stopPropagation();
      const existing = store.selectedStepRange;
      const isExactSameSingle = Boolean(
        existing && existing.patternId === pattern.id &&
        existing.start.step === idx && Boolean(existing.start.isPreRoll) === isPreRoll &&
        existing.end.step === idx && Boolean(existing.end.isPreRoll) === isPreRoll
      );
      if (isExactSameSingle) {
        store.setSelectedStepRange(null);
      } else {
        store.setSelectedStepRange({ start: { isPreRoll, step: idx }, end: { isPreRoll, step: idx }, patternId: pattern.id, trackId });
      }
      return true;
    }
    if (isMultiSelectActive) {
      store.setSelectedStepRange({ start: { isPreRoll, step: idx }, end: { isPreRoll, step: idx }, patternId: pattern.id, trackId });
      if (!isPreRoll) handleStepMouseDownMulti(e as any, idx);
      return true;
    }
    return false;
  }, [pattern.id, trackId, selectedStepIdx, selectedStepIsPreRoll, isMultiSelectActive, handleStepMouseDownMulti]);

  const handleVoiceMouseDown = React.useCallback((e: React.MouseEvent<HTMLDivElement>, idx: number) => {
    if (activeTool === '0' && !e.shiftKey && !e.ctrlKey && !e.metaKey && !isMultiSelectActive) {
      handleVoiceStepClear(trackId, pattern.id, idx);
      return;
    }
    if (applyVoiceModifierOrMultiDown(e, idx, false)) return;
    useSequencerStore.getState().setSelectedStepRange(null);
    handleVoiceFocusStep(idx, false);
  }, [activeTool, isMultiSelectActive, applyVoiceModifierOrMultiDown, handleVoiceStepClear, handleVoiceFocusStep, trackId, pattern.id]);

  const handleVoicePreRollMouseDown = React.useCallback((e: React.MouseEvent<HTMLDivElement>, idx: number) => {
    if (activeTool === '0' && !e.shiftKey && !e.ctrlKey && !e.metaKey && !isMultiSelectActive) {
      handleVoiceStepClear(trackId, pattern.id, idx, true);
      return;
    }
    if (applyVoiceModifierOrMultiDown(e, idx, true)) return;
    useSequencerStore.getState().setSelectedStepRange(null);
    handleVoiceFocusStep(idx, true);
  }, [activeTool, isMultiSelectActive, applyVoiceModifierOrMultiDown, handleVoiceStepClear, handleVoiceFocusStep, trackId, pattern.id]);

  const handleVoiceMouseEnter = React.useCallback((idx: number, e?: React.MouseEvent) => {
    if (e && e.buttons === 2) { handleVoiceStepClear(trackId, pattern.id, idx); return; }
    if (isMultiSelectActive && e && (e.buttons & 1) === 1) {
      const store = useSequencerStore.getState();
      const start = store.selectedStepRange?.patternId === pattern.id
        ? store.selectedStepRange.start
        : { isPreRoll: false, step: idx };
      store.setSelectedStepRange({ start, end: { isPreRoll: false, step: idx }, patternId: pattern.id, trackId });
      handleStepMouseEnterMulti(idx);
    }
  }, [isMultiSelectActive, handleStepMouseEnterMulti, handleVoiceStepClear, trackId, pattern.id]);

  return { handleVoiceMouseDown, handleVoicePreRollMouseDown, handleVoiceMouseEnter };
}
