import React, { useEffect } from 'react';
import { useWindow } from '../../contexts/WindowContext';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { useSequencerSettingsStore } from '../../stores/useSequencerSettingsStore';
import { isEditableTarget, isInputElementLike } from '../../utils/crossRealmDom';
import { applyVocalRangeDuplicateState } from '../../stores/helpers/vocalRangeDuplicateHelper';
import { Pattern } from '../../types';

interface UseEditorUnifiedStepShortcutsParams {
  effectiveEditTrackId: number; isVocalContext: boolean; displayedPatterns: Pattern[];
  selectedPatternId: number; selectedVariationId: string | null; selectedStepIdx: number | null;
  selectedStepIndices: number[]; selectedStepIsPreRoll: boolean; isMultiSelectActive: boolean;
  setSelectedStepIdx: (idx: number | null) => void;
  setSelectedStepIndices: React.Dispatch<React.SetStateAction<number[]>>;
  setSelectedSubIndex: (sub: 0 | 1 | null) => void;
  setSelectedStepIsPreRoll: (isPre: boolean) => void;
}

export function useEditorUnifiedStepShortcuts(p: UseEditorUnifiedStepShortcutsParams) {
  const {
    effectiveEditTrackId, isVocalContext, displayedPatterns, selectedPatternId,
    selectedVariationId, selectedStepIdx, selectedStepIndices, selectedStepIsPreRoll,
    isMultiSelectActive, setSelectedStepIdx, setSelectedStepIndices, setSelectedSubIndex, setSelectedStepIsPreRoll,
  } = p;
  const hostWin = useWindow();

  useEffect(() => {
    const hostDoc = hostWin?.document || document;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (useSequencerSettingsStore.getState().isSettingsOpen) return;
      if (hostDoc.querySelector('[data-testid="custom-dialog-backdrop"]')) return;

      const activeEl = hostDoc.activeElement as HTMLElement | null;
      const isPercCell = Boolean(activeEl?.classList?.contains('step-input-cell'));
      if (isPercCell && activeEl) {
        const domPtnId = activeEl.getAttribute('data-pattern-id');
        const domVarId = activeEl.getAttribute('data-variation-id') || null;
        if ((domPtnId && Number(domPtnId) !== selectedPatternId) || domVarId !== (selectedVariationId ?? null)) {
          activeEl.blur();
        }
      }
      const isVoiceField = Boolean(activeEl && (activeEl.classList.contains('v-syl') || activeEl.classList.contains('v-note')));
      if (isEditableTarget(activeEl) && !isPercCell && !isVoiceField) return;

      const activePattern = displayedPatterns.find((pt) => pt.id === selectedPatternId) ?? displayedPatterns[0];
      if (!activePattern) return;
      const store = useSequencerStore.getState();
      const key = e.key.toLowerCase();
      const isCtrlOrCmd = e.ctrlKey || e.metaKey;
      const rangeArgs = { trackId: effectiveEditTrackId, patternId: activePattern.id, variationId: selectedVariationId, selectedStepIndices, selectedStepIdx };

      if (!isCtrlOrCmd && e.altKey && key === 'v' && isVocalContext) {
        e.preventDefault(); e.stopPropagation();
        store.pasteVoiceSteps(effectiveEditTrackId, activePattern.id, Boolean(selectedStepIsPreRoll), selectedStepIdx ?? 0, true);
        return;
      }

      if ((e.key === 'Delete' || e.key === 'Backspace') && !isCtrlOrCmd && !e.altKey) {
        if (isVoiceField) return;
        if (isVocalContext && store.selectedStepRange) {
          e.preventDefault(); e.stopPropagation();
          store.cutVoiceStepsRange(store.selectedStepRange, effectiveEditTrackId, activePattern.id);
        } else if (!isVocalContext && (selectedStepIndices.length > 0 || isMultiSelectActive)) {
          e.preventDefault(); e.stopPropagation();
          store.clearEditorStepsSelection(rangeArgs);
        }
        return;
      }

      if (!isCtrlOrCmd) return;
      if (isVoiceField && isInputElementLike(activeEl)) {
        const s0 = activeEl.selectionStart, s1 = activeEl.selectionEnd;
        if (['c', 'x', 'v'].includes(key) && s0 !== null && s1 !== null && s0 !== s1) return;
        if (key === 'd' && activeEl.value.length > 0 && !(s0 === 0 && s1 === activeEl.value.length)) return;
        if (key === 'a') return;
      }

      if (key === 'a') {
        e.preventDefault(); e.stopPropagation();
        if (isVocalContext) {
          store.setSelectedStepRange({ start: { isPreRoll: false, step: 0 }, end: { isPreRoll: false, step: Math.max(0, (activePattern.steps || 16) - 1) }, patternId: activePattern.id, trackId: effectiveEditTrackId });
        } else {
          const varObj = selectedVariationId ? activePattern.variations?.find((v) => v.id === selectedVariationId) : null;
          const total = varObj ? (varObj.steps?.length || activePattern.steps || 16) : (activePattern.steps || 16);
          setSelectedStepIndices(Array.from({ length: total }, (_, i) => i));
          if (selectedStepIdx === null) setSelectedStepIdx(0);
        }
      } else if (key === 'c') {
        e.preventDefault(); e.stopPropagation();
        if (isVocalContext) store.copyVoiceStepsRange(store.selectedStepRange, effectiveEditTrackId, activePattern.id);
        else store.copyEditorStepsSelection(rangeArgs);
      } else if (key === 'x') {
        e.preventDefault(); e.stopPropagation();
        if (isVocalContext) store.cutVoiceStepsRange(store.selectedStepRange, effectiveEditTrackId, activePattern.id);
        else {
          const anchor = store.cutEditorStepsSelection(rangeArgs);
          if (anchor !== null) { setSelectedStepIdx(anchor); setSelectedStepIndices([]); setSelectedSubIndex(null); }
        }
      } else if (key === 'v') {
        e.preventDefault(); e.stopPropagation();
        if (isVocalContext) {
          let tPre = Boolean(selectedStepIsPreRoll), tStep = selectedStepIdx ?? 0;
          if (store.selectedStepRange && (!store.selectedStepRange.patternId || store.selectedStepRange.patternId === activePattern.id)) {
            const preLen = activePattern.preRollActiveSteps?.length || 16;
            const linA = store.selectedStepRange.start.isPreRoll ? store.selectedStepRange.start.step : preLen + store.selectedStepRange.start.step;
            const linB = store.selectedStepRange.end.isPreRoll ? store.selectedStepRange.end.step : preLen + store.selectedStepRange.end.step;
            const first = linA <= linB ? store.selectedStepRange.start : store.selectedStepRange.end;
            tPre = first.isPreRoll; tStep = first.step;
          }
          store.pasteVoiceSteps(effectiveEditTrackId, activePattern.id, tPre, tStep, Boolean(e.shiftKey || e.altKey));
        } else {
          const pasted = store.pasteEditorStepsClipboard(rangeArgs);
          if (pasted?.length) {
            setSelectedStepIdx(pasted[0]);
            setSelectedStepIndices(pasted.length > 1 || selectedStepIndices.length > 0 || isMultiSelectActive ? pasted : []);
            setSelectedSubIndex(null);
          }
        }
      } else if (key === 'd') {
        e.preventDefault(); e.stopPropagation();
        if (isVocalContext) {
          const dup = applyVocalRangeDuplicateState(store.tracks, effectiveEditTrackId, activePattern.id, store.selectedStepRange, selectedStepIdx, selectedStepIsPreRoll);
          if (dup) {
            store.pushUndoState();
            useSequencerStore.setState({ tracks: dup.tracks, tracksVersion: store.tracksVersion + 1, selectedStepRange: dup.nextRange, selectedStepIdx: dup.nextStepIdx, selectedStepIsPreRoll: dup.nextIsPreRoll });
            setSelectedStepIdx(dup.nextStepIdx); setSelectedStepIsPreRoll(dup.nextIsPreRoll);
          }
        } else {
          const duplicated = store.duplicateEditorStepsSelection(rangeArgs);
          if (duplicated?.length) {
            setSelectedStepIdx(duplicated[0]);
            setSelectedStepIndices(duplicated.length > 1 || selectedStepIndices.length > 0 || isMultiSelectActive ? duplicated : []);
            setSelectedSubIndex(null);
          }
        }
      }
    };

    hostWin.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => hostWin.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [hostWin, effectiveEditTrackId, isVocalContext, displayedPatterns, selectedPatternId, selectedVariationId, selectedStepIdx, selectedStepIndices, selectedStepIsPreRoll, isMultiSelectActive, setSelectedStepIdx, setSelectedStepIndices, setSelectedSubIndex, setSelectedStepIsPreRoll]);
}
