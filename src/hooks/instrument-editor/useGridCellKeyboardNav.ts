
import React from 'react';
import * as Tone from 'tone';
import { audioEngine } from '../useAudioSync';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { getWheelNuanceState } from '../../utils/instrumentStrokes';
import { getSculptNumber } from '../../components/instrument-editor/grid/gridConstants';
import { Pattern } from '../../types';
import type { UseGridCellKeyboardNavParams } from './gridCellKeyboardNavTypes';

export function useGridCellKeyboardNav(params: UseGridCellKeyboardNavParams) {
  const {
    trackId, pattern, activeTool, selectedVariationId, instrument, lang,
    isLeftHanded, focusCell, handleVariationStepValueChange,
    handleTrackStepValueChange, handleTrackStepKeyDown,
    setSelectedStepIdx, setSelectedStepIndices, setSelectedSubIndex
  } = params;

  return React.useCallback((e: React.KeyboardEvent<any>, idx: number, value: any, subIndex?: 0 | 1) => {
    if (activeTool === 'scissors' && !['ArrowRight', 'ArrowLeft', 'Tab'].includes(e.key)) {
      e.preventDefault(); e.stopPropagation(); return;
    }
    const totalSteps = pattern?.steps || 16;

    if (e.key === 'ArrowRight' || e.key === 'Tab') {
      e.preventDefault();
      if (Array.isArray(value) && subIndex === 0) { setSelectedSubIndex(1); focusCell(idx, 1); return; }
      if (idx < totalSteps - 1) {
        const nextIdx = idx + 1; const nextVal = pattern?.activeSteps?.[nextIdx];
        setSelectedStepIdx(nextIdx); setSelectedStepIndices([nextIdx]);
        if (Array.isArray(nextVal)) { setSelectedSubIndex(0); focusCell(nextIdx, 0); }
        else { setSelectedSubIndex(null); focusCell(nextIdx); }
      }
      return;
    }

    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      if (Array.isArray(value) && subIndex === 1) { setSelectedSubIndex(0); focusCell(idx, 0); return; }
      if (idx > 0) {
        const prevIdx = idx - 1; const prevVal = pattern?.activeSteps?.[prevIdx];
        setSelectedStepIdx(prevIdx); setSelectedStepIndices([prevIdx]);
        if (Array.isArray(prevVal)) { setSelectedSubIndex(1); focusCell(prevIdx, 1); }
        else { setSelectedSubIndex(null); focusCell(prevIdx); }
      }
      return;
    }

    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault(); e.stopPropagation(); (e.nativeEvent as any)?.stopImmediatePropagation?.();
      const dir = e.key === 'ArrowUp' ? 'up' : 'down';
      let valToCycle = value; const sub = subIndex ?? 0;
      if (Array.isArray(value)) valToCycle = value[sub];
      const nextVal = getWheelNuanceState(valToCycle, dir, instrument?.id, instrument?.type, lang, isLeftHanded);
      let finalVal: string | number | [string, string] = nextVal;
      if (Array.isArray(value)) { const arr = [...value] as [string, string]; arr[sub] = String(nextVal); finalVal = arr; }
      if (selectedVariationId) handleVariationStepValueChange(trackId, pattern.id, selectedVariationId, idx, finalVal as any);
      else handleTrackStepValueChange(trackId, pattern.id, idx, finalVal as any);
      if (nextVal !== 0 && nextVal !== '0' && audioEngine) {
        try {
          const vol = getSculptNumber(pattern?.volumes?.[idx], 80) / 100;
          const dec = getSculptNumber(pattern?.decays?.[idx], 100) / 100;
          audioEngine.playNote(trackId, String(nextVal), Tone.now(), vol, dec);
        } catch (_) {}
      }
      return;
    }

    if (e.key === 'Backspace') {
      e.preventDefault(); useSequencerStore.getState().pushUndoState();
      if (Array.isArray(value)) {
        if (subIndex === 1) {
          const arr = [...value] as [string, string]; arr[1] = '0';
          const finalVal = (arr[0] === '0' || !arr[0]) ? 0 : arr;
          if (selectedVariationId) handleVariationStepValueChange(trackId, pattern.id, selectedVariationId, idx, finalVal as any);
          else handleTrackStepValueChange(trackId, pattern.id, idx, finalVal as any);
          setSelectedSubIndex(0); focusCell(idx, 0);
        } else if (subIndex === 0) {
          const arr = [...value] as [string, string]; arr[0] = '0';
          const finalVal = (arr[1] === '0' || !arr[1]) ? 0 : arr;
          if (selectedVariationId) handleVariationStepValueChange(trackId, pattern.id, selectedVariationId, idx, finalVal as any);
          else handleTrackStepValueChange(trackId, pattern.id, idx, finalVal as any);
          if (idx > 0) {
            const prevIdx = idx - 1; const prevVal = pattern?.activeSteps?.[prevIdx];
            setSelectedStepIdx(prevIdx); setSelectedStepIndices([prevIdx]);
            if (Array.isArray(prevVal)) { setSelectedSubIndex(1); focusCell(prevIdx, 1); }
            else { setSelectedSubIndex(null); focusCell(prevIdx); }
          }
        }
      } else {
        if (selectedVariationId) handleVariationStepValueChange(trackId, pattern.id, selectedVariationId, idx, 0 as any);
        else handleTrackStepValueChange(trackId, pattern.id, idx, 0 as any);
        if (idx > 0) {
          const prevIdx = idx - 1; const prevVal = pattern?.activeSteps?.[prevIdx];
          setSelectedStepIdx(prevIdx); setSelectedStepIndices([prevIdx]);
          if (Array.isArray(prevVal)) { setSelectedSubIndex(1); focusCell(prevIdx, 1); }
          else { setSelectedSubIndex(null); focusCell(prevIdx); }
        }
      }
      return;
    }

    if (e.key === 'Delete' || e.key === '0') {
      e.preventDefault(); useSequencerStore.getState().pushUndoState();
      if (Array.isArray(value)) {
        if (subIndex === 0 || subIndex === 1) {
          const arr = [...value] as [string, string]; arr[subIndex] = '0';
          const finalVal = (arr[0] === '0' && arr[1] === '0') ? 0 : arr;
          if (selectedVariationId) handleVariationStepValueChange(trackId, pattern.id, selectedVariationId, idx, finalVal as any);
          else handleTrackStepValueChange(trackId, pattern.id, idx, finalVal as any);
          if (finalVal === 0) { setSelectedSubIndex(null); focusCell(idx); }
        }
      } else {
        if (selectedVariationId) handleVariationStepValueChange(trackId, pattern.id, selectedVariationId, idx, 0 as any);
        else handleTrackStepValueChange(trackId, pattern.id, idx, 0 as any);
      }
      return;
    }

    const inputEl = e.currentTarget as HTMLInputElement;
    handleTrackStepKeyDown(trackId, pattern.id, idx, e.key, inputEl?.value || '', inputEl);
  }, [activeTool, pattern, selectedVariationId, instrument, lang, isLeftHanded, focusCell, handleVariationStepValueChange, handleTrackStepValueChange, handleTrackStepKeyDown, setSelectedStepIdx, setSelectedStepIndices, setSelectedSubIndex, trackId]);
}
