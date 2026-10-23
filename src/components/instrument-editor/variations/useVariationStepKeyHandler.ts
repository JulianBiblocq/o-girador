
import React from 'react';
import * as Tone from 'tone';
import { audioEngine } from '../../../hooks/useAudioSync';
import { getWheelNuanceState } from '../../../utils/instrumentStrokes';

export function handleVariationStepKeyDown(params: {
  e: React.KeyboardEvent<HTMLInputElement>;
  stepIdx: number;
  val: string | number | [string, string];
  ptnId: number;
  variationId: string;
  volumes?: any[];
  decays?: any[];
  inst: any;
  lang: string;
  isLeftHanded: boolean;
  trackId: number;
  onVariationStepValueChange?: (ptnId: number, varId: string, idx: number, val: string) => void;
  setSelectedStepIdx: (idx: number | null) => void;
  setSelectedStepIndices: (indices: number[]) => void;
  handleTogglePlay: () => void;
}) {
  const {
    e, stepIdx, val, ptnId, variationId, volumes, decays, inst, lang,
    isLeftHanded, trackId, onVariationStepValueChange, setSelectedStepIdx,
    setSelectedStepIndices, handleTogglePlay,
  } = params;

  const inputEl = e.currentTarget;
  const cardGrid = inputEl.closest('.step-boxes');
  const inputs = cardGrid ? Array.from(cardGrid.querySelectorAll('input')) : [];
  const indexInGrid = inputs.indexOf(inputEl);

  if (e.code === 'Space') {
    e.preventDefault();
    handleTogglePlay();
    return;
  }

  if (e.key === 'Delete' || e.key === 'Backspace' || e.key === '0') {
    e.preventDefault();
    onVariationStepValueChange?.(ptnId, variationId, stepIdx, '0');
    if (e.key === 'Backspace' && indexInGrid > 0) {
      const prevEl = inputs[indexInGrid - 1] as HTMLInputElement;
      prevEl.focus();
      prevEl.select();
      setSelectedStepIdx(stepIdx - 1);
      setSelectedStepIndices([stepIdx - 1]);
    }
    return;
  }

  if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
    e.preventDefault();
    e.stopPropagation();
    const dir = e.key === 'ArrowUp' ? 'up' : 'down';
    const nextVal = getWheelNuanceState(val as string | number, dir, inst.id, inst.type, lang, isLeftHanded);
    if (nextVal !== val) {
      onVariationStepValueChange?.(ptnId, variationId, stepIdx, String(nextVal));
      if (nextVal !== 0 && nextVal !== '0' && audioEngine) {
        try {
          const rawVol = volumes?.[stepIdx];
          const vol = ((Array.isArray(rawVol) ? rawVol[0] : (rawVol ?? 80)) as number) / 100;
          const rawDec = decays?.[stepIdx];
          const dec = ((Array.isArray(rawDec) ? rawDec[0] : (rawDec ?? 100)) as number) / 100;
          audioEngine.playNote(trackId, String(nextVal), Tone.now(), vol, dec);
        } catch (_) {}
      }
    }
    return;
  }

  if (e.key === 'ArrowRight' || e.key === 'Tab' || e.key === 'Enter') {
    e.preventDefault();
    if (indexInGrid < inputs.length - 1) {
      const nextEl = inputs[indexInGrid + 1] as HTMLInputElement;
      nextEl.focus();
      nextEl.select();
      setSelectedStepIdx(stepIdx + 1);
      setSelectedStepIndices([stepIdx + 1]);
    }
    return;
  }

  if (e.key === 'ArrowLeft') {
    e.preventDefault();
    if (indexInGrid > 0) {
      const prevEl = inputs[indexInGrid - 1] as HTMLInputElement;
      prevEl.focus();
      prevEl.select();
      setSelectedStepIdx(stepIdx - 1);
      setSelectedStepIndices([stepIdx - 1]);
    }
    return;
  }

  const char = e.key;
  if (char.length === 1 && char.match(/^[a-zA-Z0-9]$/) && !e.ctrlKey && !e.metaKey && !e.altKey) {
    e.preventDefault();
    onVariationStepValueChange?.(ptnId, variationId, stepIdx, char);
    if (audioEngine) {
      try {
        const rawVol = volumes?.[stepIdx];
        const vol = ((Array.isArray(rawVol) ? rawVol[0] : (rawVol ?? 80)) as number) / 100;
        const rawDec = decays?.[stepIdx];
        const dec = ((Array.isArray(rawDec) ? rawDec[0] : (rawDec ?? 100)) as number) / 100;
        audioEngine.playNote(trackId, char, Tone.now(), vol, dec);
      } catch (_) {}
    }
    if (indexInGrid < inputs.length - 1) {
      const nextEl = inputs[indexInGrid + 1] as HTMLInputElement;
      nextEl.focus();
      nextEl.select();
      setSelectedStepIdx(stepIdx + 1);
      setSelectedStepIndices([stepIdx + 1]);
    }
  }
}
