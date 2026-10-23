
import React from 'react';
import { StepSculptValue } from '../../../types';
import { useSequencerStore } from '../../../stores/useSequencerStore';
import { getSculptNumber } from './gridConstants';

interface VoiceStepSculptBarsProps {
  i: number;
  volume: StepSculptValue;
  decay: StepSculptValue;
  totalShift: number;
  onSelectForSculpt?: (index: number) => void;
}

export const VoiceStepSculptBars: React.FC<VoiceStepSculptBarsProps> = ({
  i,
  volume,
  decay,
  totalShift,
  onSelectForSculpt
}) => {
  const lang = useSequencerStore(state => state.lang);

  return (
    <div
      className="w-full flex flex-col gap-[2px] p-[2px] bg-[#ece4d0] border-t border-[#1a1a1a]/20 shrink-0 select-none cursor-pointer min-h-[20px]"
      style={{ touchAction: 'manipulation' }}
      onClick={(e) => {
        e.stopPropagation();
        onSelectForSculpt?.(i);
      }}
      onMouseDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
      title={lang === 'fr' ? "Sélectionner ce pas pour le Sculpteur" : "Selecionar este passo para o Escultor"}
    >
      <div className="h-[2px] bg-[#1a1a1a]/10 w-full relative">
        <div className="h-[2px] bg-green-600 rounded-none transition-all" style={{ width: `${getSculptNumber(volume)}%` }} />
      </div>
      <div className="h-[2px] bg-[#1a1a1a]/10 w-full relative">
        <div className="h-[2px] bg-amber-500 rounded-none transition-all" style={{ width: `${getSculptNumber(decay)}%` }} />
      </div>
      <div className="h-[3px] bg-[#1a1a1a]/15 w-full relative overflow-hidden">
        <div className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-[#1a1a1a]/30" />
        {totalShift !== 0 && (
          <div
            className="absolute top-0 bottom-0 bg-[#2980b9] transition-all"
            style={{
              left: totalShift > 0 ? '50%' : 'auto',
              right: totalShift < 0 ? '50%' : 'auto',
              width: `${Math.min(50, Math.abs(totalShift) / 2)}%`
            }}
          />
        )}
      </div>
    </div>
  );
};
