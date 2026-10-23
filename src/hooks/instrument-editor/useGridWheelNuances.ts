
import React, { useEffect, useRef } from 'react';
import * as Tone from 'tone';
import { audioEngine } from '../useAudioSync';
import { getWheelNuanceState } from '../../utils/instrumentStrokes';
import { getSculptNumber } from '../../components/instrument-editor/grid/gridConstants';
import { Pattern } from '../../types';

interface UseGridWheelNuancesParams {
  gridRef: React.RefObject<HTMLDivElement | null>;
  trackId: number;
  pattern: Pattern;
  selectedPatternId: number;
  selectedVariationId: string | null;
  instrument: { id: string; type: string; [key: string]: any };
  lang: string;
  isLeftHanded: boolean;
  handleVariationStepValueChange: (tId: number, pId: number, vId: string, idx: any, val: any) => void;
  handleTrackStepValueChange: (tId: number, pId: number, idx: any, val: any) => void;
  setSelectedStepIdx: (idx: number) => void;
  setSelectedStepIndices: (indices: number[]) => void;
  setSelectedSubIndex: (sub: 0 | 1 | null) => void;
}

export function useGridWheelNuances(params: UseGridWheelNuancesParams) {
  const {
    gridRef, trackId, pattern, selectedPatternId, selectedVariationId,
    instrument, lang, isLeftHanded, handleVariationStepValueChange,
    handleTrackStepValueChange, setSelectedStepIdx, setSelectedStepIndices,
    setSelectedSubIndex
  } = params;

  const selectedPatternIdRef = useRef(selectedPatternId);
  selectedPatternIdRef.current = selectedPatternId;
  useEffect(() => {
    selectedPatternIdRef.current = selectedPatternId;
  }, [selectedPatternId]);

  useEffect(() => {
    const el = gridRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      if (pattern?.id !== selectedPatternIdRef.current) return;

      const target = e.target as HTMLElement | null;
      if (!target) return;
      const stepInput = target.closest('[data-track-id][data-step-index]') as HTMLElement | null;
      if (!stepInput) return;

      const targetTrackId = stepInput.getAttribute('data-track-id');
      const stepIdxAttr = stepInput.getAttribute('data-step-index');
      if (targetTrackId !== String(trackId) || stepIdxAttr === null) return;

      e.preventDefault();
      e.stopPropagation();

      const idx = parseInt(stepIdxAttr, 10);
      const direction = e.deltaY < 0 ? 'up' : 'down';
      const currentVal = pattern?.activeSteps?.[idx] ?? 0;
      let valToNuance = currentVal;
      const subIdxAttr = stepInput.getAttribute('data-sub-index');
      if (Array.isArray(currentVal) && subIdxAttr !== null) {
        valToNuance = currentVal[parseInt(subIdxAttr, 10)];
      }

      const nextVal = getWheelNuanceState(
        valToNuance as string | number,
        direction,
        instrument?.id,
        instrument?.type,
        lang,
        isLeftHanded
      );

      let finalVal: string | number | [string, string] = nextVal;
      if (Array.isArray(currentVal) && subIdxAttr !== null) {
        const subIdx = parseInt(subIdxAttr, 10);
        const arr = [...currentVal] as [string, string];
        arr[subIdx] = String(nextVal);
        finalVal = arr;
      }

      if (nextVal !== valToNuance) {
        if (selectedVariationId) {
          handleVariationStepValueChange(trackId, pattern.id, selectedVariationId, idx, finalVal as any);
        } else {
          handleTrackStepValueChange(trackId, pattern.id, idx, finalVal as any);
        }

        setSelectedStepIdx(idx);
        setSelectedStepIndices([idx]);
        if (subIdxAttr !== null) {
          setSelectedSubIndex(parseInt(subIdxAttr, 10) as 0 | 1);
        } else {
          setSelectedSubIndex(null);
        }

        if (nextVal !== 0 && nextVal !== '0') {
          try {
            if (audioEngine) {
              const vol = getSculptNumber(pattern?.volumes?.[idx], 100) / 100;
              const dec = getSculptNumber(pattern?.decays?.[idx], 100) / 100;
              audioEngine.playNote(trackId, String(nextVal), Tone.now(), vol, dec);
            }
          } catch (_) {}
        }
      }
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      el.removeEventListener('wheel', handleWheel);
    };
  }, [gridRef, trackId, pattern, instrument?.id, instrument?.type, lang, isLeftHanded, selectedVariationId, handleVariationStepValueChange, handleTrackStepValueChange, setSelectedStepIdx, setSelectedStepIndices, setSelectedSubIndex]);
}
