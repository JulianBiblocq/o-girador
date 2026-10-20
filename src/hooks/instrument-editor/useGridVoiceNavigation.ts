/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useCallback } from 'react';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { useAudioStore } from '../../stores/useAudioStore';
import { Pattern } from '../../types';

interface UseGridVoiceNavigationParams {
  gridRef: React.RefObject<HTMLDivElement | null>;
  trackId: number;
  pattern: Pattern;
  selectedPatternId: number;
  selectedStepIdx: number | null;
  selectedStepIsPreRoll?: boolean;
  activeTool: string;
  isMultiSelectActive: boolean;
  focusCell: (stepIdx: number, subIndex?: 0 | 1 | null) => void;
  handleStepMouseDownMulti: (e: any, idx: number) => void;
  setSelectedStepIdx: (idx: number) => void;
  setSelectedStepIndices: (indices: number[]) => void;
  setSelectedStepIsPreRoll?: (isPre: boolean) => void;
  setSelectedPatternId: (pId: number) => void;
  setSelectedSubIndex: (sub: 0 | 1 | null) => void;
}

export function useGridVoiceNavigation(params: UseGridVoiceNavigationParams) {
  const {
    gridRef, trackId, pattern, selectedPatternId, selectedStepIdx, selectedStepIsPreRoll,
    activeTool, isMultiSelectActive, focusCell, handleStepMouseDownMulti,
    setSelectedStepIdx, setSelectedStepIndices, setSelectedStepIsPreRoll,
    setSelectedPatternId, setSelectedSubIndex
  } = params;

  const focusVoiceStep = useCallback((stepIdx: number, type: 'note' | 'syl' = 'note', forceInPreRoll?: boolean) => {
    const activeEl = document.activeElement;
    const isInPreRoll = forceInPreRoll !== undefined ? forceInPreRoll : (activeEl?.closest('.pre-roll-section') !== null);
    const preRollCount = pattern?.preRollActiveSteps?.length || 16;
    const patternSteps = pattern?.steps || 16;
    let targetStepIdx = stepIdx;
    let targetIsInPreRoll = isInPreRoll;

    if (isInPreRoll && stepIdx >= preRollCount) { targetIsInPreRoll = false; targetStepIdx = 0; }
    else if (!isInPreRoll && stepIdx < 0) {
      const hasPreRoll = Boolean(gridRef.current?.querySelector('.pre-roll-section'));
      if (hasPreRoll) { targetIsInPreRoll = true; targetStepIdx = preRollCount - 1; }
      else targetStepIdx = 0;
    } else if (targetIsInPreRoll) {
      if (stepIdx < 0) targetStepIdx = 0; else if (stepIdx >= preRollCount) targetStepIdx = preRollCount - 1;
    } else {
      if (stepIdx < 0) targetStepIdx = 0; else if (stepIdx >= patternSteps) targetStepIdx = patternSteps - 1;
    }

    const container = targetIsInPreRoll ? gridRef.current?.querySelector('.pre-roll-section') : (gridRef.current?.querySelector('.main-measure-section') || gridRef.current?.querySelector(`[id^="detail-voice-"]`));
    const targetCard = container?.querySelector(`[data-step-type="voice"][data-step-index="${targetStepIdx}"]`) as HTMLElement | null;
    if (targetCard) {
      const targetInput = targetCard.querySelector(type === 'syl' ? '.v-syl' : '.v-note') as HTMLInputElement | null;
      if (targetInput) { targetInput.focus(); targetInput.select(); } else targetCard.focus?.();
      setSelectedStepIdx(targetStepIdx); setSelectedStepIndices([targetStepIdx]);
      if (setSelectedStepIsPreRoll) setSelectedStepIsPreRoll(targetIsInPreRoll);
      useSequencerStore.setState({ selectedStepIdx: targetStepIdx, selectedStepIsPreRoll: targetIsInPreRoll, selectedSubIndex: null, selectedStepRange: null });
    }
  }, [pattern?.steps, pattern?.preRollActiveSteps, setSelectedStepIdx, setSelectedStepIndices, setSelectedStepIsPreRoll, gridRef]);

  const handleVoiceNav = useCallback((el: HTMLInputElement, key: string, type: 'syl' | 'note') => {
    const currentCard = el.closest('[data-step-index]');
    if (!currentCard) return;
    const currentIdx = parseInt(currentCard.getAttribute('data-step-index') || '0', 10);
    const isInPreRoll = el.closest('.pre-roll-section') !== null;
    if (key === 'ArrowRight' || key === 'Enter') focusVoiceStep(currentIdx + 1, type, isInPreRoll);
    else if (key === 'ArrowLeft') focusVoiceStep(currentIdx - 1, type, isInPreRoll);
    else if (key === 'ArrowDown') focusVoiceStep(currentIdx + 8, type, isInPreRoll);
    else if (key === 'ArrowUp') focusVoiceStep(currentIdx - 8, type, isInPreRoll);
  }, [focusVoiceStep]);

  const handleVoiceFocusStep = useCallback((idx: number, isPreRoll?: boolean) => {
    setSelectedStepIdx(idx); setSelectedStepIndices([idx]); setSelectedPatternId(pattern.id);
    if (setSelectedStepIsPreRoll) setSelectedStepIsPreRoll(Boolean(isPreRoll));
    useAudioStore.getState().setVoiceInputMode('step');
    useSequencerStore.getState().setSelectedPatternId(pattern.id);
    useSequencerStore.setState({ selectedStepIdx: idx, selectedStepIsPreRoll: Boolean(isPreRoll), selectedSubIndex: null, selectedStepRange: null });
  }, [setSelectedStepIdx, setSelectedStepIndices, setSelectedPatternId, setSelectedStepIsPreRoll, pattern.id]);

  useEffect(() => {
    const handleFocusVoiceStepEvent = (e: Event) => {
      const customEvt = e as CustomEvent<{ stepIdx: number; type?: 'note' | 'syl'; isInPreRoll?: boolean; patternId?: number | string }>;
      if (customEvt.detail?.patternId && pattern?.id && String(customEvt.detail.patternId) !== String(pattern.id)) return;
      if (selectedPatternId && pattern?.id && selectedPatternId !== pattern.id) return;
      if (customEvt.detail && typeof customEvt.detail.stepIdx === 'number') focusVoiceStep(customEvt.detail.stepIdx, customEvt.detail.type || 'note', customEvt.detail.isInPreRoll);
    };
    window.addEventListener('focus-voice-step', handleFocusVoiceStepEvent);
    return () => window.removeEventListener('focus-voice-step', handleFocusVoiceStepEvent);
  }, [focusVoiceStep, selectedPatternId, pattern?.id]);

  useEffect(() => {
    const handleFocusPercussionStepEvent = (e: Event) => {
      const customEvt = e as CustomEvent<{ stepIdx: number; subIndex?: 0 | 1 | null; patternId?: number | string }>;
      if (customEvt.detail?.patternId && pattern?.id && String(customEvt.detail.patternId) !== String(pattern.id)) return;
      if (selectedPatternId && pattern?.id && selectedPatternId !== pattern.id) return;
      if (customEvt.detail && typeof customEvt.detail.stepIdx === 'number') {
        const nextIdx = customEvt.detail.stepIdx;
        setSelectedStepIdx(nextIdx); setSelectedStepIndices([nextIdx]);
        if (customEvt.detail.subIndex !== undefined) setSelectedSubIndex(customEvt.detail.subIndex);
        focusCell(nextIdx, customEvt.detail.subIndex);
      }
    };
    window.addEventListener('focus-percussion-step', handleFocusPercussionStepEvent);
    return () => window.removeEventListener('focus-percussion-step', handleFocusPercussionStepEvent);
  }, [focusCell, setSelectedStepIdx, setSelectedStepIndices, setSelectedSubIndex, selectedPatternId, pattern?.id]);

  return { focusVoiceStep, handleVoiceNav, handleVoiceFocusStep };
}
