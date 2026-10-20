/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';

interface UseGridMultiSelectKeyboardParams {
  isMultiSelectActive: boolean;
  selectedStepIndices: number[];
  patternId?: number;
  selectedVariationId: string | null;
  trackId: number;
  currentWindow: any;
  handleVariationStepValueChange: (tId: number, pId: number, vId: string, indices: any, val: any) => void;
  handleTrackStepValueChange: (tId: number, pId: number, indices: any, val: any) => void;
  setSelectedStepIndices: (indices: number[]) => void;
}

export function useGridMultiSelectKeyboard(params: UseGridMultiSelectKeyboardParams) {
  const {
    isMultiSelectActive, selectedStepIndices, patternId, selectedVariationId,
    trackId, currentWindow, handleVariationStepValueChange,
    handleTrackStepValueChange, setSelectedStepIndices
  } = params;

  useEffect(() => {
    if (!isMultiSelectActive || selectedStepIndices.length === 0 || !patternId) return;

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement &&
        (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') &&
        !(document.activeElement as HTMLInputElement).readOnly
      ) {
        return;
      }
      if (e.ctrlKey || e.metaKey) return;
      const key = e.key;

      if (key === 'Delete' || key === 'Backspace' || key === '0') {
        e.preventDefault();
        if (selectedVariationId) handleVariationStepValueChange(trackId, patternId, selectedVariationId, selectedStepIndices, '0');
        else handleTrackStepValueChange(trackId, patternId, selectedStepIndices, '0');
        setSelectedStepIndices([]);
        return;
      }

      if (key.length === 1 && /^[a-zA-Z0-9]$/.test(key)) {
        e.preventDefault();
        if (selectedVariationId) handleVariationStepValueChange(trackId, patternId, selectedVariationId, selectedStepIndices, key);
        else handleTrackStepValueChange(trackId, patternId, selectedStepIndices, key);
        setSelectedStepIndices([]);
      }
    };

    const targetWin = currentWindow || window;
    targetWin.addEventListener('keydown', handleGlobalKeyDown);
    return () => targetWin.removeEventListener('keydown', handleGlobalKeyDown);
  }, [isMultiSelectActive, selectedStepIndices, patternId, selectedVariationId, trackId, currentWindow, handleVariationStepValueChange, handleTrackStepValueChange, setSelectedStepIndices]);
}
