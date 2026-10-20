/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef } from 'react';
import * as Tone from 'tone';
import { Pattern } from '../../../types';
import { audioEngine } from '../../../hooks/useAudioSync';
import { getWheelNuanceState } from '../../../utils/instrumentStrokes';

export function usePatternVariationsWheel(params: {
  variationsContainerRef: React.RefObject<HTMLDivElement | null>;
  ptn: Pattern;
  inst: any;
  selectedPatternId: number;
  selectedVariationId: string | null;
  lang: string;
  isLeftHanded: boolean;
  trackId: number;
  selectedSubIndex?: 0 | 1 | null;
  onVariationStepValueChange?: (patternId: number, variationId: string, stepIdx: number | number[], val: string | string[]) => void;
  setSelectedPatternId: (id: number) => void;
  setSelectedVariationId: (id: string | null) => void;
  setSelectedStepIdx: (idx: number | null) => void;
  setSelectedStepIndices: (indices: number[]) => void;
  setSelectedSubIndex?: (subIndex: 0 | 1 | null) => void;
  onSelectPattern: (id: number) => void;
}) {
  const ptnRef = useRef(params.ptn);
  ptnRef.current = params.ptn;
  const instRef = useRef(params.inst);
  instRef.current = params.inst;
  const selectedPatternIdRef = useRef(params.selectedPatternId);
  selectedPatternIdRef.current = params.selectedPatternId;
  const selectedVariationIdRef = useRef(params.selectedVariationId);
  selectedVariationIdRef.current = params.selectedVariationId;
  const selectedSubIndexRef = useRef(params.selectedSubIndex);
  selectedSubIndexRef.current = params.selectedSubIndex;

  useEffect(() => {
    const el = params.variationsContainerRef.current;
    if (!el) return;

    const handleVariationWheel = (e: WheelEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const stepTarget = target.closest('[data-step-index][data-variation-id]') as HTMLElement | null;
      if (!stepTarget) return;

      const stepIdxAttr = stepTarget.getAttribute('data-step-index');
      const varId = stepTarget.getAttribute('data-variation-id');
      if (stepIdxAttr === null || !varId) return;

      const currentPtn = ptnRef.current;
      const isContextSelected = currentPtn?.id === selectedPatternIdRef.current || selectedVariationIdRef.current === varId;
      if (!isContextSelected) return;

      e.preventDefault();
      e.stopPropagation();

      const stepIdx = parseInt(stepIdxAttr, 10);
      const direction = e.deltaY < 0 ? 'up' : 'down';
      const variation = currentPtn?.variations?.find((v) => v.id === varId);
      if (!variation) return;

      const currentVal = variation.steps[stepIdx] ?? 0;
      const subIdx = selectedSubIndexRef.current;
      const valToNuance = Array.isArray(currentVal) ? currentVal[subIdx === 1 ? 1 : 0] : currentVal;

      const nextVal = getWheelNuanceState(
        valToNuance as string | number, direction,
        instRef.current?.id, instRef.current?.type, params.lang, params.isLeftHanded
      );

      let finalVal: string | number | [string, string] = nextVal;
      if (Array.isArray(currentVal)) {
        const arr = [...currentVal] as [string, string];
        arr[subIdx === 1 ? 1 : 0] = String(nextVal);
        finalVal = arr;
      }

      if (nextVal !== valToNuance) {
        params.onVariationStepValueChange?.(currentPtn.id, varId, stepIdx, Array.isArray(finalVal) ? (finalVal as any) : String(finalVal));
        params.onSelectPattern?.(currentPtn.id);
        params.setSelectedPatternId(currentPtn.id);
        params.setSelectedVariationId(varId);
        params.setSelectedStepIdx(stepIdx);
        params.setSelectedStepIndices([stepIdx]);
        if (!Array.isArray(currentVal)) params.setSelectedSubIndex?.(null);

        if (nextVal !== 0 && nextVal !== '0' && audioEngine) {
          try {
            const rawVol = variation.volumes?.[stepIdx];
            const vol = ((Array.isArray(rawVol) ? (subIdx === 1 ? rawVol[1] : rawVol[0]) : (rawVol ?? 80)) as number) / 100;
            const rawDec = variation.decays?.[stepIdx];
            const dec = ((Array.isArray(rawDec) ? (subIdx === 1 ? rawDec[1] : rawDec[0]) : (rawDec ?? 100)) as number) / 100;
            audioEngine.playNote(params.trackId, String(nextVal), Tone.now(), vol, dec);
          } catch (_) {}
        }
      }
    };

    el.addEventListener('wheel', handleVariationWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleVariationWheel);
  }, [params]);
}
