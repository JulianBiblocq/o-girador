
import React from 'react';
import * as Tone from 'tone';
import { audioEngine } from '../useAudioSync';
import { getComplementaryStroke, getDefaultSplitPair } from '../../utils/instrumentStrokes';
import { getSculptNumber } from '../../components/instrument-editor/grid/gridConstants';
import { Pattern } from '../../types';

interface UseGridScissorsLogicParams {
  trackId: number;
  pattern: Pattern;
  instrument: { id: string; type: string; [key: string]: any };
  isLeftHanded: boolean;
  selectedVariationId: string | null;
  handleVariationStepValueChange: (tId: number, pId: number, vId: string, idx: any, val: any) => void;
  handleTrackStepValueChange: (tId: number, pId: number, idx: any, val: any) => void;
  setSelectedStepIdx: (idx: number) => void;
  setSelectedStepIndices: (indices: number[]) => void;
  setSelectedSubIndex: (sub: 0 | 1 | null) => void;
}

export function useGridScissorsLogic({
  trackId,
  pattern,
  instrument,
  isLeftHanded,
  selectedVariationId,
  handleVariationStepValueChange,
  handleTrackStepValueChange,
  setSelectedStepIdx,
  setSelectedStepIndices,
  setSelectedSubIndex
}: UseGridScissorsLogicParams) {
  return React.useCallback((idx: number, value?: string | number | [string, string]) => {
    const currentStep = (value !== undefined && value !== null)
      ? value
      : (pattern?.activeSteps?.[idx] !== undefined && pattern?.activeSteps?.[idx] !== null
          ? pattern.activeSteps[idx]
          : 0);

    let finalVal: string | number | [string, string];

    // A. Clic sur un pas déjà scindé : Colle -> fusionne en conservant val[0]
    if (Array.isArray(currentStep)) {
      const first = currentStep[0];
      finalVal = (first === '0' || !first) ? 0 : first;
      setSelectedSubIndex(null);
    }
    // B. Clic sur un pas vide : Scission avec paire par défaut
    else if (
      currentStep === 0 || 
      currentStep === '0' || 
      !currentStep || 
      String(currentStep).trim() === '' || 
      String(currentStep).trim() === '0'
    ) {
      finalVal = getDefaultSplitPair(instrument?.id, instrument?.type);
      setSelectedSubIndex(0);
    }
    // C. Clic sur un pas avec note : déduit le coup complémentaire
    else {
      const baseVal = String(currentStep).trim();
      const compVal = getComplementaryStroke(baseVal, instrument?.id, instrument?.type, isLeftHanded);
      finalVal = [baseVal, compVal];
      setSelectedSubIndex(0);
    }

    setSelectedStepIdx(idx);
    setSelectedStepIndices([idx]);

    if (selectedVariationId) {
      handleVariationStepValueChange(trackId, pattern.id, selectedVariationId, idx, finalVal as any);
    } else {
      handleTrackStepValueChange(trackId, pattern.id, idx, finalVal as any);
    }

    const noteToPreview = Array.isArray(finalVal) ? finalVal[0] : finalVal;
    if (noteToPreview !== 0 && noteToPreview !== '0' && noteToPreview !== '') {
      try {
        if (audioEngine) {
          const vol = getSculptNumber(pattern?.volumes?.[idx], 80) / 100;
          const dec = getSculptNumber(pattern?.decays?.[idx], 100) / 100;
          audioEngine.playNote(trackId, String(noteToPreview), Tone.now(), vol, dec);
        }
      } catch (_) {}
    }
  }, [trackId, pattern?.id, pattern?.activeSteps, pattern?.volumes, pattern?.decays, instrument?.id, instrument?.type, isLeftHanded, selectedVariationId, handleVariationStepValueChange, handleTrackStepValueChange, setSelectedStepIdx, setSelectedStepIndices, setSelectedSubIndex]);
}
