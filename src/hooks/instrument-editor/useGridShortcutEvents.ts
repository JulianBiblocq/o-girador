/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { getGlobalClipboard, copyRelativeSteps, pasteRelativeSteps } from './relativeClipboardHelpers';
import { Pattern } from '../../types';

interface UseGridShortcutEventsParams {
  pattern: Pattern;
  trackId: number;
  selectedPatternId: number;
  selectedStepIdx: number | null;
  selectedStepIndices: number[];
  selectedVariationId: string | null;
  instrument: { id: string; type: string; [key: string]: any };
  isMultiSelectActive: boolean;
  canPaste?: boolean;
  onCopyPattern?: (pattern: any) => void;
  onPastePattern?: (patternId: number) => void;
  handleDuplicateStep: () => void;
  handleVariationStepValueChange: (tId: number, pId: number, vId: string, idx: any, val: any) => void;
  handleTrackStepValueChange: (tId: number, pId: number, idx: any, val: any, lyrics?: any, notes?: any) => void;
  setIsMultiSelectActive: (active: boolean) => void;
  setSelectedStepIndices: React.Dispatch<React.SetStateAction<number[]>>;
}

export function useGridShortcutEvents(params: UseGridShortcutEventsParams) {
  const {
    pattern, trackId, selectedPatternId, selectedStepIdx, selectedStepIndices,
    selectedVariationId, instrument, isMultiSelectActive, canPaste,
    onCopyPattern, onPastePattern, handleDuplicateStep,
    handleVariationStepValueChange, handleTrackStepValueChange,
    setIsMultiSelectActive, setSelectedStepIndices
  } = params;

  const [hasClipboard, setHasClipboard] = useState(false);

  useEffect(() => {
    setHasClipboard(!!getGlobalClipboard());
    const handleChanged = () => setHasClipboard(!!getGlobalClipboard());
    window.addEventListener('oGiradorClipboardChanged', handleChanged);
    return () => window.removeEventListener('oGiradorClipboardChanged', handleChanged);
  }, []);

  const handleCopyRelative = React.useCallback((ptn: any) => {
    copyRelativeSteps(selectedStepIndices, ptn);
  }, [selectedStepIndices]);

  const handlePasteRelative = React.useCallback((ptn: any, targetIdx: number) => {
    pasteRelativeSteps(ptn, targetIdx, instrument?.id, trackId, selectedVariationId, handleVariationStepValueChange, handleTrackStepValueChange, setSelectedStepIndices);
  }, [instrument?.id, selectedVariationId, trackId, handleVariationStepValueChange, handleTrackStepValueChange, setSelectedStepIndices]);

  useEffect(() => {
    const handleGridShortcut = (e: Event) => {
      const { key } = (e as CustomEvent<{ key: string }>).detail;
      if (!pattern || pattern.id !== selectedPatternId) return;

      if (key === 'a') {
        setIsMultiSelectActive(true);
        setSelectedStepIndices(Array.from({ length: pattern.steps }, (_, i) => i));
      } else if (key === 'c') {
        if (instrument?.type === 'voice') useSequencerStore.getState().copyVoiceStepsRange(useSequencerStore.getState().selectedStepRange, trackId, pattern.id);
        else if (selectedStepIndices.length > 0) handleCopyRelative(pattern);
        else onCopyPattern?.(pattern);
      } else if (key === 'x') {
        if (instrument?.type === 'voice') useSequencerStore.getState().cutVoiceStepsRange(useSequencerStore.getState().selectedStepRange, trackId, pattern.id);
        else if (selectedStepIndices.length > 0) {
          handleCopyRelative(pattern);
          if (selectedVariationId) handleVariationStepValueChange(trackId, pattern.id, selectedVariationId, selectedStepIndices, '0');
          else handleTrackStepValueChange(trackId, pattern.id, selectedStepIndices, '0');
          setSelectedStepIndices([]);
        } else {
          onCopyPattern?.(pattern);
          const allIndices = Array.from({ length: pattern.steps }, (_, i) => i);
          if (selectedVariationId) handleVariationStepValueChange(trackId, pattern.id, selectedVariationId, allIndices, '0');
          else handleTrackStepValueChange(trackId, pattern.id, allIndices, '0');
        }
      } else if (key === 'v') {
        if (instrument?.type === 'voice') {
          const state = useSequencerStore.getState();
          let targetIsPreRoll = false; let targetStep = 0;
          if (state.selectedStepRange) {
            const preRollCount = pattern.preRollActiveSteps?.length || 16;
            const toLinear = (p: { isPreRoll: boolean; step: number }) => p.isPreRoll ? p.step : (preRollCount + p.step);
            const anchor = toLinear(state.selectedStepRange.start) <= toLinear(state.selectedStepRange.end) ? state.selectedStepRange.start : state.selectedStepRange.end;
            targetIsPreRoll = anchor.isPreRoll; targetStep = anchor.step;
          } else if (state.selectedStepIdx !== null && state.selectedStepIdx !== undefined) {
            targetIsPreRoll = Boolean(state.selectedStepIsPreRoll); targetStep = state.selectedStepIdx;
          }
          state.pasteVoiceSteps(trackId, pattern.id, targetIsPreRoll, targetStep, false);
        } else if (getGlobalClipboard()) {
          const targetIdx = (isMultiSelectActive && selectedStepIndices.length > 0) ? selectedStepIndices[0] : (selectedStepIdx !== null ? selectedStepIdx : 0);
          handlePasteRelative(pattern, targetIdx);
        } else if (canPaste && onPastePattern) onPastePattern(pattern.id);
      } else if (key === 'd') {
        handleDuplicateStep();
      }
    };

    window.addEventListener('grid-shortcut', handleGridShortcut);
    return () => window.removeEventListener('grid-shortcut', handleGridShortcut);
  }, [pattern, selectedPatternId, instrument?.type, selectedStepIndices, onCopyPattern, selectedVariationId, trackId, handleVariationStepValueChange, handleTrackStepValueChange, setSelectedStepIndices, isMultiSelectActive, selectedStepIdx, canPaste, onPastePattern, handleDuplicateStep, handleCopyRelative, handlePasteRelative, setIsMultiSelectActive]);

  return { hasClipboard, handleCopyRelative, handlePasteRelative };
}
