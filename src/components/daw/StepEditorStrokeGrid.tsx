import React from 'react';
import type { InstrumentConfig } from '../../types';
import { isDarkText, getVisualStrokeSymbol } from '../../data';
import { audioEngine } from '../../hooks/useAudioSync';

interface StepEditorStrokeGridProps {
  choicesToShow: (string | number)[];
  isSplitMode: boolean;
  liveCurrentVal: string | number | (string | number)[];
  editingHalf: 0 | 1;
  loadingStroke: string | null;
  inst: InstrumentConfig | null;
  isLeftHanded: boolean;
  allowedStrokesCount: number;
  isExpanded: boolean;
  onExpand: () => void;
  onSelectStroke: (stroke: string | number) => void;
  lang: string;
}

export const StepEditorStrokeGrid: React.FC<StepEditorStrokeGridProps> = ({
  choicesToShow,
  isSplitMode,
  liveCurrentVal,
  editingHalf,
  loadingStroke,
  inst,
  isLeftHanded,
  allowedStrokesCount,
  isExpanded,
  onExpand,
  onSelectStroke,
  lang,
}) => {
  const isSilenceSelected = isSplitMode
    ? Array.isArray(liveCurrentVal) && (liveCurrentVal[editingHalf] === 0 || liveCurrentVal[editingHalf] === '0')
    : liveCurrentVal === 0 || liveCurrentVal === '0' || !liveCurrentVal;

  return (
    <div className="grid grid-cols-3 gap-1">
      {choicesToShow.map((stroke) => {
        let isSelected = false;
        if (isSplitMode) {
          const currentHalfVal = Array.isArray(liveCurrentVal) ? liveCurrentVal[editingHalf] : liveCurrentVal;
          isSelected = String(currentHalfVal) === String(stroke);
        } else {
          isSelected = String(liveCurrentVal) === String(stroke);
        }
        const isLoaded = inst && audioEngine ? audioEngine.isStrokeLoaded(inst.id, String(stroke)) : true;
        const isStrokeLoading = loadingStroke === String(stroke);

        let bgColor = 'transparent';
        let textColor = '#000';

        if (inst) {
          const visualStroke = getVisualStrokeSymbol(stroke, isLeftHanded, inst.id);
          bgColor = inst.colors[visualStroke as string] || '#111';
          textColor = inst.colors.text || '#fff';
          if (isDarkText(inst.id, String(visualStroke))) {
            textColor = '#1a1a1a';
          }
        }

        return (
          <button
            key={stroke}
            onClick={() => onSelectStroke(stroke)}
            className={`h-8 font-black text-xs border flex items-center justify-center cursor-pointer transition-all ${
              isSelected
                ? 'border-2 border-black scale-105 shadow-[1px_1px_2px_rgba(0,0,0,0.3)]'
                : 'border-black/50 opacity-80 hover:opacity-100'
            } ${!isLoaded ? 'opacity-40 grayscale border-dashed shadow-none hover:opacity-75 hover:grayscale-0' : ''}`}
            style={{ backgroundColor: bgColor, color: textColor }}
          >
            {isStrokeLoading ? (
              <span className="animate-spin text-[10px]">⏳</span>
            ) : inst ? (
              getVisualStrokeSymbol(stroke, isLeftHanded, inst.id)
            ) : (
              stroke
            )}
          </button>
        );
      })}

      {allowedStrokesCount > choicesToShow.length && !isExpanded && (
        <button
          onClick={onExpand}
          className="col-span-3 h-8 font-cactus font-black text-xs border-2 border-black bg-[#f4ecd8] text-black shadow-[2px_2px_0px_#000] hover:bg-black hover:text-[#f4ecd8] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer flex items-center justify-center select-none"
        >
          + {lang === 'fr' ? 'Déplier' : 'Desdobrar'}
        </button>
      )}

      <button
        onClick={() => onSelectStroke(0)}
        className={`col-span-3 h-8 font-black text-[10px] border border-black uppercase flex items-center justify-center cursor-pointer transition-colors ${
          isSilenceSelected
            ? 'bg-[#8b2a1a] text-[#f4ecd8]'
            : 'bg-transparent text-[#8b2a1a] hover:bg-[#8b2a1a] hover:text-[#f4ecd8]'
        }`}
        title={lang === 'fr' ? 'Vider la case (Silence)' : 'Limpar o passo (Pausa)'}
      >
        {lang === 'fr' ? 'Silence (0)' : 'Pausa (0)'}
      </button>
    </div>
  );
};
