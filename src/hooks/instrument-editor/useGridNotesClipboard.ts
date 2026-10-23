
import React, { useEffect } from 'react';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { Pattern } from '../../types';

interface UseGridNotesClipboardParams {
  pattern: Pattern;
  trackId: number;
  selectedPatternId: number;
  instrument: { id: string; type: string; [key: string]: any };
  currentWindow: any;
}

export function useGridNotesClipboard(params: UseGridNotesClipboardParams) {
  const { pattern, trackId, selectedPatternId, instrument, currentWindow } = params;

  useEffect(() => {
    const handleNotesClipboardGlobalKeyDown = (e: KeyboardEvent) => {
      const isCtrlOrCmd = e.ctrlKey || e.metaKey;
      if (!isCtrlOrCmd) return;
      const key = e.key.toLowerCase();
      if (!['c', 'x', 'v'].includes(key)) return;

      const state = useSequencerStore.getState();
      const isTimelineContext = Boolean(state.activeTimelineCell) || (state.selectedTimelineCells && state.selectedTimelineCells.length > 0) || Boolean(document.activeElement?.closest('#timeline-scroll-container, .timeline-scroll-grid, [data-timeline-grid]'));
      if (isTimelineContext) return;

      const activeEl = document.activeElement as HTMLElement | null;
      const isVoiceInput = Boolean(activeEl && (activeEl.classList.contains('v-syl') || activeEl.classList.contains('v-note') || Boolean(activeEl.closest?.('.voice-step-cell, [data-step-type="voice"]'))));
      const isVoiceTrack = instrument?.type === 'voice' || String(trackId) === 'puxador' || String(trackId) === 'coro' || String(trackId) === 'toada';
      const hasActiveVoiceContext = isVoiceInput || state.selectedStepRange !== null || (isVoiceTrack && state.selectedStepIdx !== null);
      if (!hasActiveVoiceContext) return;

      if (activeEl instanceof HTMLInputElement) {
        const selStart = activeEl.selectionStart;
        const selEnd = activeEl.selectionEnd;
        if (selStart !== null && selEnd !== null && selStart !== selEnd) return;
      }

      if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA') && !activeEl.closest('[data-track-id]') && !activeEl.closest('[data-step-index]') && !activeEl.classList.contains('step-input-cell')) return;

      const currentPtnId = pattern?.id;
      const domPatternIdAttr = activeEl?.closest?.('[data-pattern-id]')?.getAttribute('data-pattern-id') || activeEl?.closest?.('[data-pattern-card]')?.getAttribute('data-pattern-card');
      const domPatternId = domPatternIdAttr ? parseInt(domPatternIdAttr, 10) : null;
      if (domPatternId !== null && domPatternId !== currentPtnId) return;

      if ((key === 'c' || key === 'x') && state.selectedStepRange?.patternId && state.selectedStepRange.patternId !== currentPtnId) return;
      const curSelectedPatternId = state.selectedPatternId ?? selectedPatternId;
      if (curSelectedPatternId && domPatternId === null && curSelectedPatternId !== currentPtnId) return;

      e.preventDefault(); e.stopPropagation(); (e as any).stopImmediatePropagation?.();

      if (key === 'c') {
        state.copyVoiceStepsRange(state.selectedStepRange, trackId, currentPtnId);
        return;
      }
      if (key === 'x') {
        state.cutVoiceStepsRange(state.selectedStepRange, trackId, currentPtnId);
        return;
      }
      if (key === 'v') {
        const isNotesOnly = Boolean(e.shiftKey || e.altKey);
        let targetTrackId = trackId;
        let targetPatternId = currentPtnId;
        let targetIsPreRoll = false;
        let targetStep = 0;

        if (activeEl) {
          const cellEl = activeEl.closest?.('.voice-step-cell, [data-step-type="voice"]');
          if (cellEl) {
            const stepIdxAttr = cellEl.getAttribute('data-step-index');
            const isPreRollAttr = cellEl.getAttribute('data-is-preroll');
            const trackIdAttr = cellEl.getAttribute('data-track-id');
            const patternIdAttr = cellEl.getAttribute('data-pattern-id');
            if (stepIdxAttr !== null) targetStep = parseInt(stepIdxAttr, 10);
            if (isPreRollAttr !== null) targetIsPreRoll = isPreRollAttr === 'true';
            if (trackIdAttr !== null) targetTrackId = parseInt(trackIdAttr, 10) || targetTrackId;
            if (patternIdAttr !== null) targetPatternId = parseInt(patternIdAttr, 10) || targetPatternId;
          } else if (state.selectedStepIdx !== null && state.selectedStepIdx !== undefined) {
            targetIsPreRoll = Boolean(state.selectedStepIsPreRoll);
            targetStep = state.selectedStepIdx;
          }
        } else if (state.selectedStepRange) {
          const preRollCount = pattern?.preRollActiveSteps?.length || 16;
          const toLinear = (p: { isPreRoll: boolean; step: number }) => p.isPreRoll ? p.step : (preRollCount + p.step);
          const startIsFirst = toLinear(state.selectedStepRange.start) <= toLinear(state.selectedStepRange.end);
          const anchor = startIsFirst ? state.selectedStepRange.start : state.selectedStepRange.end;
          targetIsPreRoll = anchor.isPreRoll;
          targetStep = anchor.step;
          if (state.selectedStepRange.patternId) targetPatternId = state.selectedStepRange.patternId;
        } else if (state.selectedStepIdx !== null && state.selectedStepIdx !== undefined) {
          targetIsPreRoll = Boolean(state.selectedStepIsPreRoll);
          targetStep = state.selectedStepIdx;
        }

        state.pasteVoiceSteps(targetTrackId, targetPatternId, targetIsPreRoll, targetStep, isNotesOnly);
      }
    };

    const targetWin = currentWindow || window;
    targetWin.addEventListener('keydown', handleNotesClipboardGlobalKeyDown, { capture: true });
    return () => targetWin.removeEventListener('keydown', handleNotesClipboardGlobalKeyDown, { capture: true });
  }, [pattern?.id, pattern?.preRollActiveSteps?.length, selectedPatternId, trackId, instrument?.type, currentWindow]);
}
