
import React, { useEffect } from 'react';
import * as Tone from 'tone';
import { audioEngine } from '../useAudioSync';
import { getWheelNuanceState } from '../../utils/instrumentStrokes';
import { getSculptNumber } from '../../components/instrument-editor/grid/gridConstants';
import { Pattern } from '../../types';

interface UseGridArrowNuanceShortcutsParams {
  trackId: number;
  pattern: Pattern;
  selectedPatternId: number;
  selectedStepIdx: number | null;
  selectedSubIndex?: 0 | 1 | null;
  selectedVariationId: string | null;
  instrument: { id: string; type: string; [key: string]: any };
  lang: string;
  isLeftHanded: boolean;
  handleVariationStepValueChange: (tId: number, pId: number, vId: string, idx: any, val: any) => void;
  handleTrackStepValueChange: (tId: number, pId: number, idx: any, val: any) => void;
}

export function useGridArrowNuanceShortcuts(params: UseGridArrowNuanceShortcutsParams) {
  const {
    trackId, pattern, selectedPatternId, selectedStepIdx, selectedSubIndex,
    selectedVariationId, instrument, lang, isLeftHanded,
    handleVariationStepValueChange, handleTrackStepValueChange
  } = params;

  useEffect(() => {
    if (selectedStepIdx === null || pattern?.id !== selectedPatternId || selectedVariationId !== null) return;

    const handleGridVerticalArrows = (e: KeyboardEvent) => {
      const isVoice = instrument?.type === 'voice' || String(trackId) === 'puxador' || String(trackId) === 'coro' || String(trackId) === 'toada';
      if (isVoice) return;

      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();

        const idx = selectedStepIdx;
        const currentVal = pattern?.activeSteps?.[idx] ?? 0;
        const dir = e.key === 'ArrowUp' ? 'up' : 'down';

        let valToCycle = currentVal;
        const sub = selectedSubIndex !== null && selectedSubIndex !== undefined ? selectedSubIndex : 0;
        if (Array.isArray(currentVal)) valToCycle = currentVal[sub];

        const nextVal = getWheelNuanceState(
          valToCycle as string | number, dir, instrument?.id, instrument?.type, lang, isLeftHanded
        );

        let finalVal: string | number | [string, string] = nextVal;
        if (Array.isArray(currentVal)) {
          const arr = [...currentVal] as [string, string];
          arr[sub] = String(nextVal);
          finalVal = arr;
        }

        if (selectedVariationId) handleVariationStepValueChange(trackId, pattern.id, selectedVariationId, idx, finalVal as any);
        else handleTrackStepValueChange(trackId, pattern.id, idx, finalVal as any);

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

    window.addEventListener('keydown', handleGridVerticalArrows, { capture: true });
    return () => window.removeEventListener('keydown', handleGridVerticalArrows, { capture: true });
  }, [selectedStepIdx, selectedSubIndex, pattern?.id, pattern?.activeSteps, pattern?.volumes, pattern?.decays, selectedVariationId, instrument?.id, instrument?.type, lang, isLeftHanded, trackId, selectedPatternId, handleVariationStepValueChange, handleTrackStepValueChange]);
}
