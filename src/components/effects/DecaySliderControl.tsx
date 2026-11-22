import React, { useState, useCallback } from 'react';
import { EditableNumber } from './EditableNumber';
import { StudioRangeSlider } from '../ui/StudioRangeSlider';

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
  const [dragPreviewVal, setDragPreviewVal] = useState<number | null>(null);
  const minVal = 10;
  const resetDecay = isVoice ? 10 : 100;
  const clampedInitial = Math.max(minVal, Math.min(100, Math.round(initialValue)));
  const displayVal = dragPreviewVal ?? clampedInitial;

  const handleCommit = useCallback((finalVal: number, hadScrub: boolean) => {
    if (finalVal !== clampedInitial || hadScrub) onCommit(finalVal);
  }, [clampedInitial, onCommit]);

  const handleReset = useCallback((resetVal: number) => {
    setDragPreviewVal(null);
    onCommit(resetVal);
  }, [onCommit]);

  return (
    <>
      <div className="flex justify-between text-[10px] font-bold items-center select-none">
        {isVoice ? (
          <>
            <span>{lang === 'fr' ? 'Durée de la note' : 'Duração da nota'}</span>
            <span
              onDoubleClick={() => handleReset(resetDecay)}
              className="font-mono text-[var(--cordel-param-decay)] cursor-pointer hover:underline"
            >
              {getVoiceDurationLabel(displayVal, lang)}
            </span>
          </>
        ) : (
          <>
            <span>{lang === 'fr' ? 'Résonance' : 'Ressonância'} (Decay)</span>
            <EditableNumber
              value={displayVal}
              suffix="%"
              min={minVal}
              max={100}
              onChange={(newVal: number) => {
                setDragPreviewVal(null);
                onCommit(newVal);
              }}
            />
          </>
        )}
      </div>
      <StudioRangeSlider
        value={clampedInitial}
        min={minVal}
        max={100}
        step={isVoice ? 5 : 1}
        resetValue={resetDecay}
        accentVar="var(--cordel-param-decay)"
        ariaLabel={isVoice ? (lang === 'fr' ? 'Durée de la note' : 'Duração da nota') : 'Decay'}
        resetTitle={lang === 'fr' ? `Double-clic : réinitialiser à ${resetDecay}%` : `Duplo clique: redefinir para ${resetDecay}%`}
        onVisualChange={setDragPreviewVal}
        onCommit={handleCommit}
        onReset={handleReset}
      />
    </>
  );
};
