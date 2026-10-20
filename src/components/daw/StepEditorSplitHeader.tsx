import React from 'react';
import { Scissors, Droplet } from 'lucide-react';
import type { InstrumentConfig } from '../../types';
import { isDarkText, getVisualStrokeSymbol } from '../../data';

interface StepEditorSplitHeaderProps {
  isSplitMode: boolean;
  lang: string;
  onToggleSplit: () => void;
  editingHalf: 0 | 1;
  onSelectHalf: (half: 0 | 1) => void;
  liveCurrentVal: string | number | (string | number)[];
  inst: InstrumentConfig | null;
  isLeftHanded: boolean;
  allowedStrokes: (string | number)[];
}

export const StepEditorSplitHeader: React.FC<StepEditorSplitHeaderProps> = ({
  isSplitMode,
  lang,
  onToggleSplit,
  editingHalf,
  onSelectHalf,
  liveCurrentVal,
  inst,
  isLeftHanded,
  allowedStrokes,
}) => {
  return (
    <>
      <div className="flex justify-between items-center border-b border-black pb-1 mb-1">
        <div className="text-[9px] font-bold uppercase tracking-wider text-black/60">
          Golpes / Coups
        </div>
        <button
          onClick={onToggleSplit}
          className={`flex items-center gap-1 text-[9px] font-bold border border-black px-1.5 py-0.5 transition-colors cursor-pointer ${
            isSplitMode ? 'bg-[#8b2a1a] text-[#f4ecd8] border-[#8b2a1a]' : 'bg-transparent text-black hover:bg-black/10'
          }`}
          title={lang === 'pt' ? (isSplitMode ? 'Colar (juntar)' : 'Dividir (tesoura)') : (isSplitMode ? 'Recoller (joindre)' : 'Diviser (ciseau)')}
        >
          {isSplitMode ? <Droplet size={10} className="fill-current" /> : <Scissors size={10} />}
          {isSplitMode ? (lang === 'pt' ? 'COLAR' : 'COLLER') : (lang === 'pt' ? 'DIVIDIR' : 'DIVISER')}
        </button>
      </div>

      {isSplitMode && (
        <div className="flex gap-1 mb-1">
          {([0, 1] as const).map((halfIdx) => {
            const val = Array.isArray(liveCurrentVal) ? liveCurrentVal[halfIdx] : (halfIdx === 0 ? liveCurrentVal : allowedStrokes[0]);
            let bgColor = 'transparent';
            let textColor = '#000';

            if (inst && val !== 0 && val !== '0') {
              const visualStroke = getVisualStrokeSymbol(val, isLeftHanded, inst.id);
              bgColor = inst.colors[visualStroke as string] || '#111';
              textColor = inst.colors.text || '#fff';
              if (isDarkText(inst.id, String(visualStroke))) {
                textColor = '#1a1a1a';
              }
            } else if (val === 0 || val === '0') {
              bgColor = '#8b2a1a';
              textColor = '#f4ecd8';
            }

            return (
              <button
                key={halfIdx}
                className={`flex-1 h-7 border font-black text-xs flex items-center justify-center cursor-pointer transition-all ${
                  editingHalf === halfIdx ? 'border-2 border-black scale-105 shadow-sm z-10' : 'border-black/30 opacity-70 hover:opacity-100'
                }`}
                onClick={() => onSelectHalf(halfIdx)}
                style={{ backgroundColor: bgColor, color: textColor }}
              >
                {val === 0 || val === '0' ? '-' : (inst ? getVisualStrokeSymbol(val, isLeftHanded, inst.id) : val)}
              </button>
            );
          })}
        </div>
      )}
    </>
  );
};
