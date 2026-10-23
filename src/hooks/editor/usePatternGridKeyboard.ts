
import { useEffect } from 'react';
import { useSequencerStore } from '../../stores/useSequencerStore';
import type { UsePatternGridKeyboardParams } from './usePatternGridKeyboardTypes';

export type { UsePatternGridKeyboardParams };

export function usePatternGridKeyboard(params: UsePatternGridKeyboardParams) {
  const {
    isMultiSelectActive, selectedStepIdx, selectedSubIndex, selectedStepIsPreRoll,
    pattern, trackId, isVoice, selectedVariationId,
    handleVariationStepValueChange, handleTrackStepValueChange, handleVoiceStepClear,
    focusVoiceStep, focusCell, setSelectedStepIdx, setSelectedStepIndices, setSelectedSubIndex,
  } = params;

  useEffect(() => {
    if (isMultiSelectActive || selectedStepIdx === null || !pattern) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA') && !(activeEl as HTMLInputElement).readOnly) {
        return;
      }
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      const idx = selectedStepIdx;
      const totalSteps = pattern.steps || 16;
      const currentVal = pattern.activeSteps?.[idx];

      if (e.key === 'Delete') {
        e.preventDefault(); e.stopPropagation();
        if (isVoice) {
          handleVoiceStepClear(trackId, pattern.id, idx, selectedStepIsPreRoll);
        } else {
          useSequencerStore.getState().pushUndoState();
          let finalVal: any = 0;
          if (Array.isArray(currentVal) && (selectedSubIndex === 0 || selectedSubIndex === 1)) {
            const arr = [...currentVal] as [string, string];
            arr[selectedSubIndex] = '0';
            finalVal = arr[0] === '0' && arr[1] === '0' ? 0 : arr;
          } else {
            setSelectedSubIndex(null);
          }
          if (selectedVariationId) handleVariationStepValueChange(trackId, pattern.id, selectedVariationId, idx, finalVal);
          else handleTrackStepValueChange(trackId, pattern.id, idx, finalVal);
        }
        return;
      }

      if (e.key === 'Backspace') {
        e.preventDefault(); e.stopPropagation();
        if (isVoice) {
          handleVoiceStepClear(trackId, pattern.id, idx, selectedStepIsPreRoll);
          focusVoiceStep(idx - 1, 'syl', selectedStepIsPreRoll);
        } else {
          useSequencerStore.getState().pushUndoState();
          let finalVal: any = 0;
          if (Array.isArray(currentVal) && selectedSubIndex === 1) {
            const arr = [...currentVal] as [string, string];
            arr[1] = '0';
            finalVal = arr[0] === '0' && arr[1] === '0' ? 0 : arr;
            setSelectedSubIndex(0);
            focusCell(idx, 0);
          } else if (Array.isArray(currentVal) && selectedSubIndex === 0) {
            const arr = [...currentVal] as [string, string];
            arr[0] = '0';
            finalVal = arr[0] === '0' && arr[1] === '0' ? 0 : arr;
            if (idx > 0) {
              const prev = idx - 1;
              const pVal = pattern.activeSteps?.[prev];
              const pSub = Array.isArray(pVal) ? 1 : null;
              setSelectedStepIdx(prev); setSelectedStepIndices([prev]); setSelectedSubIndex(pSub); focusCell(prev, pSub);
            }
          } else {
            setSelectedSubIndex(null);
            if (idx > 0) {
              const prev = idx - 1;
              const pVal = pattern.activeSteps?.[prev];
              const pSub = Array.isArray(pVal) ? 1 : null;
              setSelectedStepIdx(prev); setSelectedStepIndices([prev]); setSelectedSubIndex(pSub); focusCell(prev, pSub);
            }
          }
          if (selectedVariationId) handleVariationStepValueChange(trackId, pattern.id, selectedVariationId, idx, finalVal);
          else handleTrackStepValueChange(trackId, pattern.id, idx, finalVal);
        }
        return;
      }

      if (isVoice) {
        if (e.key === 'ArrowRight') { e.preventDefault(); focusVoiceStep(idx + 1, 'syl', selectedStepIsPreRoll); }
        else if (e.key === 'ArrowLeft') { e.preventDefault(); focusVoiceStep(idx - 1, 'syl', selectedStepIsPreRoll); }
        else if (e.key === 'ArrowDown' && (idx % 16) < 8 && idx + 8 < totalSteps) { e.preventDefault(); focusVoiceStep(idx + 8, 'syl', selectedStepIsPreRoll); }
        else if (e.key === 'ArrowUp' && (idx % 16) >= 8) { e.preventDefault(); focusVoiceStep(idx - 8, 'syl', selectedStepIsPreRoll); }
      } else {
        // Navigation Percussion avec prise en compte des pas scindés
        if (e.key === 'ArrowRight') {
          e.preventDefault();
          if (Array.isArray(currentVal) && selectedSubIndex === 0) {
            setSelectedSubIndex(1); focusCell(idx, 1);
          } else if (idx < totalSteps - 1) {
            const next = idx + 1;
            const nVal = pattern.activeSteps?.[next];
            const nSub = Array.isArray(nVal) ? 0 : null;
            setSelectedStepIdx(next); setSelectedStepIndices([next]); setSelectedSubIndex(nSub); focusCell(next, nSub);
          }
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault();
          if (Array.isArray(currentVal) && selectedSubIndex === 1) {
            setSelectedSubIndex(0); focusCell(idx, 0);
          } else if (idx > 0) {
            const prev = idx - 1;
            const pVal = pattern.activeSteps?.[prev];
            const pSub = Array.isArray(pVal) ? 1 : null;
            setSelectedStepIdx(prev); setSelectedStepIndices([prev]); setSelectedSubIndex(pSub); focusCell(prev, pSub);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isMultiSelectActive, selectedStepIdx, selectedStepIsPreRoll, selectedSubIndex, pattern,
    selectedVariationId, trackId, isVoice, handleVariationStepValueChange, handleTrackStepValueChange,
    handleVoiceStepClear, focusVoiceStep, focusCell, setSelectedStepIdx, setSelectedStepIndices, setSelectedSubIndex,
  ]);
}
