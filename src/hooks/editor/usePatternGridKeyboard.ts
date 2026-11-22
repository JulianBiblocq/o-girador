import { useEffect } from 'react';
import { useWindow } from '../../contexts/WindowContext';
import { useSequencerSettingsStore } from '../../stores/useSequencerSettingsStore';
import { isEditableTarget } from '../../utils/crossRealmDom';
import type { UsePatternGridKeyboardParams } from './usePatternGridKeyboardTypes';

export type { UsePatternGridKeyboardParams };

export function usePatternGridKeyboard(params: UsePatternGridKeyboardParams) {
  const {
    isMultiSelectActive, selectedPatternId, selectedStepIdx, selectedStepIndices,
    selectedSubIndex, selectedStepIsPreRoll, pattern, trackId, isVoice, instrument, selectedVariationId,
    handleVariationStepValueChange, handleTrackStepValueChange, handleVoiceStepClear,
    focusVoiceStep, focusCell, setSelectedStepIdx, setSelectedStepIndices, setSelectedSubIndex,
  } = params;
  const hostWin = useWindow();

  useEffect(() => {
    if (isMultiSelectActive || selectedStepIndices.length > 0 || selectedStepIdx === null || !pattern || pattern.id !== selectedPatternId) {
      return;
    }

    const hostDoc = hostWin?.document || document;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (useSequencerSettingsStore.getState().isSettingsOpen || e.defaultPrevented) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      const activeEl = hostDoc.activeElement as HTMLElement | null;
      const isPercCell = Boolean(activeEl?.classList?.contains('step-input-cell'));
      if (!isPercCell && isEditableTarget(activeEl)) return;

      const idx = selectedStepIdx;
      const varObj = selectedVariationId ? pattern.variations?.find((v: any) => v.id === selectedVariationId) : null;
      const stepsArr = varObj ? varObj.steps : pattern.activeSteps;
      const totalSteps = (varObj ? varObj.steps?.length : pattern.steps) || 16;
      const currentVal = stepsArr?.[idx];

      if (e.key === 'Delete' || (!isVoice && e.key === '0')) {
        e.preventDefault(); e.stopPropagation();
        if (isVoice) {
          handleVoiceStepClear(trackId, pattern.id, idx, selectedStepIsPreRoll);
        } else {
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
          let finalVal: any = 0;
          if (Array.isArray(currentVal) && selectedSubIndex === 1) {
            const arr = [...currentVal] as [string, string];
            arr[1] = '0';
            finalVal = arr[0] === '0' && arr[1] === '0' ? 0 : arr;
            setSelectedSubIndex(0); focusCell(idx, 0);
          } else {
            if (Array.isArray(currentVal) && selectedSubIndex === 0) {
              const arr = [...currentVal] as [string, string];
              arr[0] = '0';
              finalVal = arr[0] === '0' && arr[1] === '0' ? 0 : arr;
            } else {
              setSelectedSubIndex(null);
            }
            if (idx > 0) {
              const prev = idx - 1, pVal = stepsArr?.[prev], pSub = Array.isArray(pVal) ? 1 : null;
              setSelectedStepIdx(prev); setSelectedStepIndices([]); setSelectedSubIndex(pSub); focusCell(prev, pSub);
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
        return;
      }

      if (e.key === 'ArrowRight') {
        e.preventDefault();
        if (Array.isArray(currentVal) && selectedSubIndex === 0) { setSelectedSubIndex(1); focusCell(idx, 1); }
        else if (idx < totalSteps - 1) {
          const next = idx + 1, nVal = stepsArr?.[next], nSub = Array.isArray(nVal) ? 0 : null;
          setSelectedStepIdx(next); setSelectedStepIndices([]); setSelectedSubIndex(nSub); focusCell(next, nSub);
        }
        return;
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (Array.isArray(currentVal) && selectedSubIndex === 1) { setSelectedSubIndex(0); focusCell(idx, 0); }
        else if (idx > 0) {
          const prev = idx - 1, pVal = stepsArr?.[prev], pSub = Array.isArray(pVal) ? 1 : null;
          setSelectedStepIdx(prev); setSelectedStepIndices([]); setSelectedSubIndex(pSub); focusCell(prev, pSub);
        }
        return;
      }

      const activeMatchesCell = isPercCell && activeEl &&
        Number(activeEl.getAttribute('data-pattern-id')) === pattern.id &&
        (activeEl.getAttribute('data-variation-id') || null) === (selectedVariationId ?? null) &&
        Number(activeEl.getAttribute('data-step-index')) === idx;

      if (!activeMatchesCell && e.key.length === 1 && /^[a-zA-Z/.]$/.test(e.key)) {
        e.preventDefault(); e.stopPropagation();
        const char = (['marcante', 'meiao', 'repique', 'alfaia'].includes(instrument?.id || '') && e.key === 'a') ? 'A' : e.key;
        let finalVal: any = char;
        if (Array.isArray(currentVal)) {
          const sub = selectedSubIndex === 1 ? 1 : 0;
          const arr = [...currentVal] as [string, string];
          arr[sub] = char;
          finalVal = arr;
        }
        if (selectedVariationId) handleVariationStepValueChange(trackId, pattern.id, selectedVariationId, idx, finalVal);
        else handleTrackStepValueChange(trackId, pattern.id, idx, finalVal);
      }
    };

    hostWin.addEventListener('keydown', handleKeyDown);
    return () => hostWin.removeEventListener('keydown', handleKeyDown);
  }, [hostWin, isMultiSelectActive, selectedPatternId, selectedStepIdx, selectedStepIndices, selectedStepIsPreRoll, selectedSubIndex, pattern, selectedVariationId, trackId, isVoice, instrument, handleVariationStepValueChange, handleTrackStepValueChange, handleVoiceStepClear, focusVoiceStep, focusCell, setSelectedStepIdx, setSelectedStepIndices, setSelectedSubIndex]);
}
