/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { EditableNumber } from './EditableNumber';

export const getVoiceDurationLabel = (val: number, lang: string): string => {
  if (val <= 10) return lang === 'fr' ? '1 double croche (1 pas)' : '1 semicolcheia';
  if (val <= 20) return lang === 'fr' ? '1 croche (2 pas)' : '1 colcheia';
  if (val <= 30) return lang === 'fr' ? '3 double croches (3 pas)' : '3 semicolcheias';
  if (val <= 40) return lang === 'fr' ? '1 noire (1 temps)' : '1 semínima (1 tempo)';
  if (val <= 50) return lang === 'fr' ? '5 double croches' : '5 semicolcheias';
  if (val <= 60) return lang === 'fr' ? '1 noire + croche (6 pas)' : '1 semínima + colcheia';
  if (val <= 70) return lang === 'fr' ? '7 double croches' : '7 semicolcheias';
  if (val <= 80) return lang === 'fr' ? '1 blanche (2 temps)' : '1 mínima (2 tempos)';
  if (val <= 90) return lang === 'fr' ? '3 temps (12 pas)' : '3 tempos';
  return lang === 'fr' ? '1 ronde (4 temps)' : '1 semibreve (4 tempos)';
};

interface DecaySliderControlProps {
  initialValue: number;
  isVoice: boolean;
  lang: string;
  onCommit: (val: number) => void;
}

export const DecaySliderControl: React.FC<DecaySliderControlProps> = ({
  initialValue,
  isVoice,
  lang,
  onCommit,
}) => {
  const [localVal, setLocalVal] = useState(initialValue);
  const labelRef = useRef<HTMLSpanElement>(null);
  const valRef = useRef(initialValue);
  const isDraggingRef = useRef(false);

  useEffect(() => {
    if (!isDraggingRef.current) {
      setLocalVal(initialValue);
      valRef.current = initialValue;
      if (labelRef.current) {
        labelRef.current.textContent = isVoice
          ? getVoiceDurationLabel(initialValue, lang)
          : `${initialValue}%`;
      }
    }
  }, [initialValue, isVoice, lang]);

  const handlePointerDown = (e: React.PointerEvent<HTMLInputElement>) => {
    isDraggingRef.current = true;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch (_) {}
  };

  const handleInput = (e: React.FormEvent<HTMLInputElement>) => {
    const nextVal = parseInt((e.target as HTMLInputElement).value, 10);
    valRef.current = nextVal;
    if (labelRef.current) {
      labelRef.current.textContent = isVoice ? getVoiceDurationLabel(nextVal, lang) : `${nextVal}%`;
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLInputElement>) => {
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch (_) {}
      setLocalVal(valRef.current);
      onCommit(valRef.current);
    }
  };

  return (
    <>
      <div className="flex justify-between text-[10px] font-bold items-center">
        {isVoice ? (
          <>
            <span>⏱️ {lang === 'fr' ? 'Durée de la note' : 'Duração da nota'}</span>
            <span ref={labelRef} className="font-mono text-amber-800">
              {getVoiceDurationLabel(localVal, lang)}
            </span>
          </>
        ) : (
          <>
            <span>🎛️ {lang === 'fr' ? 'Résonance' : 'Ressonância'} (Decay)</span>
            <EditableNumber
              value={localVal}
              suffix="%"
              min={10}
              max={100}
              onChange={(newVal: number) => {
                setLocalVal(newVal);
                valRef.current = newVal;
                if (labelRef.current) labelRef.current.textContent = `${newVal}%`;
                onCommit(newVal);
              }}
            />
          </>
        )}
      </div>
      <input
        type="range"
        min="10"
        max="100"
        step={isVoice ? '5' : '1'}
        defaultValue={localVal}
        key={`decay-slider-${initialValue}`}
        onPointerDown={handlePointerDown}
        onInput={handleInput}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className="w-full accent-amber-500 cursor-pointer h-2 bg-[#1a1a1a]/10 touch-none"
      />
    </>
  );
};
