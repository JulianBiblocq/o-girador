import React from 'react';
import type { InstrumentConfig } from '../../types';
import { isDarkText, getVisualStrokeSymbol } from '../../data';

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
        const currentHalfVal = isSplitMode && Array.isArray(liveCurrentVal) ? liveCurrentVal[editingHalf] : liveCurrentVal;
        const isSelected = String(currentHalfVal) === String(stroke);

        let bgColor = 'transparent';
        let textColor = 'var(--cordel-text)';
        if (inst) {
          const visualStroke = getVisualStrokeSymbol(stroke, isLeftHanded, inst.id);
          bgColor = inst.colors[visualStroke as string] || 'var(--cordel-ink-dark)';
          textColor = inst.colors.text || 'var(--cordel-on-accent)';
          if (isDarkText(inst.id, String(visualStroke))) {
            textColor = 'var(--cordel-ink-dark)';
          }
        }

        return (
          <button
            key={stroke}
            type="button"
            onClick={() => onSelectStroke(stroke)}
            className={`h-8 font-black text-xs border flex items-center justify-center cursor-pointer transition-all ${
              isSelected
                ? 'border-2 border-[var(--cordel-border-strong)] scale-105 shadow-[1px_1px_0px_var(--cordel-shadow-color)]'
                : 'border-[var(--cordel-border)] opacity-85 hover:opacity-100'
            }`}
            style={{ backgroundColor: bgColor, color: textColor }}
          >
            {inst ? getVisualStrokeSymbol(stroke, isLeftHanded, inst.id) : stroke}
          </button>
        );
      })}

      {allowedStrokesCount > choicesToShow.length && !isExpanded && (
        <button
          type="button"
          onClick={onExpand}
          className="col-span-3 h-8 font-cactus font-black text-xs border-2 border-[var(--cordel-border-strong)] bg-[var(--cordel-bg)] text-[var(--cordel-text)] shadow-[2px_2px_0px_var(--cordel-shadow-color)] hover:bg-[var(--cordel-wood)] hover:text-[var(--cordel-on-accent)] transition-all cursor-pointer flex items-center justify-center select-none"
        >
          + {lang === 'fr' ? 'Déplier' : 'Desdobrar'}
        </button>
      )}

      <button
        type="button"
        onClick={() => onSelectStroke(0)}
        className={`col-span-3 h-8 font-black text-[10px] border border-[var(--cordel-border-strong)] uppercase flex items-center justify-center cursor-pointer transition-colors ${
          isSilenceSelected
            ? 'bg-[var(--cordel-wood)] text-[var(--cordel-on-accent)]'
            : 'bg-transparent text-[var(--cordel-accent-readable)] hover:bg-[var(--cordel-wood)] hover:text-[var(--cordel-on-accent)]'
        }`}
        title={lang === 'fr' ? 'Vider la case (Silence)' : 'Limpar o passo (Pausa)'}
      >
        {lang === 'fr' ? 'Silence (0)' : 'Pausa (0)'}
      </button>
    </div>
  );
};
