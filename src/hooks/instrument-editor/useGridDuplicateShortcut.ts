
import React, { useEffect } from 'react';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { duplicateVocalStep, duplicatePercussionStep } from './duplicateStepHelpers';
import { Pattern } from '../../types';

interface UseGridDuplicateShortcutParams {
  gridRef: React.RefObject<HTMLDivElement | null>;
  trackId: number;
  pattern: Pattern;
  selectedPatternId: number;
  selectedStepIdx: number | null;
  selectedVariationId: string | null;
  instrument: { id: string; type: string; [key: string]: any };
  currentWindow: any;
  setSelectedStepIdx: (idx: number) => void;
  setSelectedStepIndices: (indices: number[]) => void;
  setSelectedSubIndex: (sub: 0 | 1 | null) => void;
}

export function useGridDuplicateShortcut(params: UseGridDuplicateShortcutParams) {
  const {
    gridRef, trackId, pattern, selectedPatternId, selectedStepIdx,
    selectedVariationId, instrument, currentWindow, setSelectedStepIdx,
    setSelectedStepIndices, setSelectedSubIndex
  } = params;

  const handleDuplicateStep = React.useCallback(() => {
    if (selectedStepIdx === null || pattern?.id !== selectedPatternId) return;
    const totalSteps = pattern?.steps || 16;
    const srcIdx = selectedStepIdx;
    const targetIdx = srcIdx + 1;
    if (targetIdx >= totalSteps) return;

    const isVoice = instrument?.type === 'voice' || String(trackId) === 'puxador' || String(trackId) === 'coro' || String(trackId) === 'toada';
    useSequencerStore.getState().pushUndoState();

    if (isVoice) {
      duplicateVocalStep(trackId, pattern, srcIdx, targetIdx, instrument?.id);
    } else {
      duplicatePercussionStep(trackId, pattern, selectedVariationId, srcIdx, targetIdx);
      setSelectedSubIndex(null);
    }

    setSelectedStepIdx(targetIdx);
    setSelectedStepIndices([targetIdx]);

    requestAnimationFrame(() => {
      const container = gridRef.current;
      if (!container) return;
      const targetCard = container.querySelector(`[data-step-index="${targetIdx}"]`) as HTMLElement | null;
      if (targetCard) {
        const inp = targetCard.querySelector('input') as HTMLInputElement | null;
        if (inp) { inp.focus(); inp.select(); } else targetCard.focus?.();
      }
    });
  }, [selectedStepIdx, pattern, selectedPatternId, instrument?.type, instrument?.id, trackId, selectedVariationId, setSelectedStepIdx, setSelectedStepIndices, setSelectedSubIndex, gridRef]);

  useEffect(() => {
    if (selectedStepIdx === null || pattern?.id !== selectedPatternId) return;

    const handleDuplicateKeyDown = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== 'd') return;
      const seqState = useSequencerStore.getState();
      const isTimelineContext = Boolean(seqState.activeTimelineCell) || (seqState.selectedTimelineCells && seqState.selectedTimelineCells.length > 0) || Boolean(document.activeElement?.closest('#timeline-scroll-container, .timeline-scroll-grid, [data-timeline-grid]'));
      if (isTimelineContext) return;

      const activeEl = document.activeElement as HTMLElement | null;
      if (activeEl instanceof HTMLInputElement && activeEl.classList.contains('v-syl')) {
        const selStart = activeEl.selectionStart;
        const selEnd = activeEl.selectionEnd;
        const valLen = activeEl.value.length;
        if (!(selStart === 0 && selEnd === valLen && valLen > 0)) return;
      }
      if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA') && !activeEl.closest('[data-track-id]') && !activeEl.closest('[data-step-index]')) return;

      e.preventDefault(); e.stopPropagation(); (e as any).stopImmediatePropagation?.();
      handleDuplicateStep();
    };

    const targetWin = currentWindow || window;
    targetWin.addEventListener('keydown', handleDuplicateKeyDown, { capture: true });
    return () => targetWin.removeEventListener('keydown', handleDuplicateKeyDown, { capture: true });
  }, [selectedStepIdx, pattern?.id, selectedPatternId, currentWindow, handleDuplicateStep]);

  return { handleDuplicateStep };
}
