
import React from 'react';
import { StepSculptValue } from '../../../types';
import { useSequencerStore } from '../../../stores/useSequencerStore';
import { SingleSculptColumn } from './SingleSculptColumn';

interface PercussionStepSculptBarsProps {
  i: number;
  val: string | number | [string, string];
  volume: StepSculptValue;
  decay: StepSculptValue;
  totalShift: number | [number, number];
  isFocused: boolean;
  selectedSubIndex?: 0 | 1 | null;
  onSelectForSculpt?: (index: number, subIndex?: 0 | 1) => void;
}

export const PercussionStepSculptBars: React.FC<PercussionStepSculptBarsProps> = ({
  i,
  val,
  volume,
  decay,
  totalShift,
  isFocused,
  selectedSubIndex,
  onSelectForSculpt
}) => {
  const lang = useSequencerStore(state => state.lang);
  const isSplit = Array.isArray(val);
  const vol0 = Array.isArray(volume) ? (volume[0] ?? 80) : (volume ?? 80);
  const vol1 = Array.isArray(volume) ? (volume[1] ?? 80) : (volume ?? 80);
  const decay0 = Array.isArray(decay) ? (decay[0] ?? 100) : (decay ?? 100);
  const decay1 = Array.isArray(decay) ? (decay[1] ?? 100) : (decay ?? 100);
  const shift0 = Array.isArray(totalShift) ? (totalShift[0] ?? 0) : (totalShift ?? 0);
  const shift1 = Array.isArray(totalShift) ? (totalShift[1] ?? 0) : (totalShift ?? 0);

  return (
    <div
      className="w-full min-w-0 mt-1.5 z-10 relative select-none min-h-[20px] py-0.5 cursor-pointer"
      style={{ touchAction: 'manipulation' }}
      onMouseDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
    >
      {isSplit ? (
        <div className="grid grid-cols-2 gap-[2px] w-full">
          <SingleSculptColumn
            vol={vol0}
            decay={decay0}
            shift={shift0}
            isFocusedSub={isFocused && selectedSubIndex === 0}
            title={lang === 'fr' ? 'Sculpter le 1er coup' : 'Esculpir o 1º golpe'}
            onClick={(e) => { e.stopPropagation(); onSelectForSculpt?.(i, 0); }}
          />
          <SingleSculptColumn
            vol={vol1}
            decay={decay1}
            shift={shift1}
            isFocusedSub={isFocused && selectedSubIndex === 1}
            title={lang === 'fr' ? 'Sculpter le 2ème coup' : 'Esculpir o 2º golpe'}
            onClick={(e) => { e.stopPropagation(); onSelectForSculpt?.(i, 1); }}
          />
        </div>
      ) : (
        <SingleSculptColumn
          vol={vol0}
          decay={decay0}
          shift={shift0}
          title={lang === 'fr' ? "Sélectionner ce pas pour le Sculpteur" : "Selecionar este passo para o Escultor"}
          onClick={(e) => { e.stopPropagation(); onSelectForSculpt?.(i); }}
        />
      )}
    </div>
  );
};
