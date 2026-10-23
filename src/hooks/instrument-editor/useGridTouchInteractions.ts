
import React, { useRef } from 'react';
import * as Tone from 'tone';
import { audioEngine } from '../useAudioSync';
import { getNextNuanceState, getAlternatingStroke } from '../../utils/instrumentStrokes';
import { getSculptNumber } from '../../components/instrument-editor/grid/gridConstants';
import { Pattern } from '../../types';
import type { UseGridTouchInteractionsParams } from './gridTouchTypes';

export function useGridTouchInteractions(params: UseGridTouchInteractionsParams) {
  const {
    trackId, pattern, instrument, activeTool, isAlternating, lang, isLeftHanded,
    selectedVariationId, isMultiSelectActive, handleScissorsClick, handleStepTouchStartMulti,
    onStepTouchStart, handleVariationStepValueChange, handleTrackStepValueChange,
    setSelectedStepIdx, setSelectedStepIndices, setSelectedSubIndex
  } = params;

  const touchStartPosRef = useRef<{ x: number; y: number } | null>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressFiredRef = useRef<boolean>(false);

  const handleStart = React.useCallback((e: any, stepIdx: number, currentVal: any, subIndex?: 0 | 1) => {
    if ('shiftKey' in e && e.shiftKey) return;
    if (onStepTouchStart) {
      let valToEdit = currentVal;
      if (Array.isArray(currentVal)) {
        valToEdit = subIndex !== undefined ? currentVal[subIndex] : currentVal[0];
      }
      onStepTouchStart(e, pattern.id, stepIdx, instrument.id, valToEdit, (newVal: any, merge?: boolean) => {
        let finalVal = Array.isArray(newVal) ? newVal : String(newVal);
        if (merge) finalVal = String(newVal);
        else if (subIndex !== undefined && Array.isArray(currentVal)) {
          const arr = [...currentVal] as [string, string];
          arr[subIndex] = String(newVal);
          finalVal = arr;
        }
        if (selectedVariationId) handleVariationStepValueChange(trackId, pattern.id, selectedVariationId, stepIdx, finalVal);
        else handleTrackStepValueChange(trackId, pattern.id, stepIdx, finalVal);
      }, trackId, Array.isArray(currentVal), subIndex);
    }
  }, [onStepTouchStart, pattern.id, instrument.id, selectedVariationId, trackId, handleVariationStepValueChange, handleTrackStepValueChange]);

  const handleCellTouchStart = React.useCallback((e: React.TouchEvent<any>, idx: number, value: any, subIndex?: 0 | 1) => {
    if (activeTool === 'scissors') { e.preventDefault(); e.stopPropagation(); return; }
    e.stopPropagation();
    if (isMultiSelectActive) { handleStepTouchStartMulti(e, idx); return; }

    isLongPressFiredRef.current = false;
    if (e.touches && e.touches.length > 0) {
      touchStartPosRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);

    longPressTimerRef.current = setTimeout(() => {
      isLongPressFiredRef.current = true;
      handleStart(e, idx, value, subIndex);
    }, 400);
  }, [activeTool, isMultiSelectActive, handleStepTouchStartMulti, handleStart]);

  const handleCellTouchMove = React.useCallback((e: React.TouchEvent<any>) => {
    if (touchStartPosRef.current && e.touches && e.touches.length > 0) {
      const dx = e.touches[0].clientX - touchStartPosRef.current.x;
      const dy = e.touches[0].clientY - touchStartPosRef.current.y;
      if (dx * dx + dy * dy > 64 && longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
    }
  }, []);

  const handleCellTouchEnd = React.useCallback((e: React.TouchEvent<any>, idx: number, value: any, subIndex?: 0 | 1) => {
    if (longPressTimerRef.current) { clearTimeout(longPressTimerRef.current); longPressTimerRef.current = null; }
    if (isLongPressFiredRef.current) { isLongPressFiredRef.current = false; return; }
    if (isMultiSelectActive) return;

    if (activeTool === 'scissors') {
      e.preventDefault();
      e.stopPropagation();
      handleScissorsClick(idx, value);
      return;
    }

    const currentSubVal = (subIndex !== undefined && Array.isArray(value)) ? value[subIndex] : (Array.isArray(value) ? value[0] : value);
    let nextVal: string | number;
    if (activeTool === '0' || activeTool === '' || activeTool === undefined) nextVal = 0;
    else if (isAlternating) nextVal = getAlternatingStroke(idx, activeTool, instrument?.id, instrument?.type, lang, isLeftHanded);
    else nextVal = getNextNuanceState(currentSubVal, activeTool, instrument?.id, instrument?.type, lang, isLeftHanded);

    let finalVal: string | number | [string, string] = nextVal;
    if (Array.isArray(value)) {
      const arr = [...value] as [string, string];
      const targetSub = subIndex !== undefined ? subIndex : 0;
      arr[targetSub] = String(nextVal);
      finalVal = arr;
      setSelectedSubIndex(targetSub);
    } else {
      setSelectedSubIndex(null);
    }

    if (selectedVariationId) handleVariationStepValueChange(trackId, pattern.id, selectedVariationId, idx, finalVal as any);
    else handleTrackStepValueChange(trackId, pattern.id, idx, finalVal as any);

    setSelectedStepIdx(idx);
    setSelectedStepIndices([idx]);

    const noteToPreview = Array.isArray(finalVal) ? (subIndex !== undefined ? finalVal[subIndex] : finalVal[0]) : finalVal;
    if (noteToPreview !== 0 && noteToPreview !== '0' && noteToPreview !== '' && noteToPreview !== undefined) {
      try {
        if (audioEngine) {
          const rawVol = pattern?.volumes?.[idx];
          const rawDec = pattern?.decays?.[idx];
          const subIdx = subIndex ?? 0;
          const vol = (getSculptNumber(Array.isArray(rawVol) ? rawVol[subIdx] : rawVol, 100)) / 100;
          const dec = (getSculptNumber(Array.isArray(rawDec) ? rawDec[subIdx] : rawDec, 100)) / 100;
          audioEngine.playNote(trackId, String(noteToPreview), Tone.now(), vol, dec);
        }
      } catch (_) {}
    }
  }, [activeTool, handleScissorsClick, isMultiSelectActive, isAlternating, instrument?.id, instrument?.type, lang, isLeftHanded, selectedVariationId, handleVariationStepValueChange, trackId, pattern.id, handleTrackStepValueChange, setSelectedSubIndex, setSelectedStepIdx, setSelectedStepIndices, pattern?.volumes, pattern?.decays]);

  return { handleCellTouchStart, handleCellTouchMove, handleCellTouchEnd };
}
