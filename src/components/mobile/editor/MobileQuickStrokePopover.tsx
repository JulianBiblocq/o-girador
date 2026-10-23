/**
 * Popover compact de sélection tactile de frappes sur appui long (< 90 lignes).
 */

import React from 'react';
import { PaperStepValue } from '../../../types/paperWorkshop.types';
import { X } from 'lucide-react';

interface Props {
  pupitreKey: string;
  stepIndex: number;
  currentValue: PaperStepValue;
  onSelectStroke: (val: PaperStepValue) => void;
  onClose: () => void;
  lang?: 'fr' | 'pt';
}

const AVAILABLE_STROKES: { label: string; value: PaperStepValue }[] = [
  { label: 'D (Forte)', value: 'D' },
  { label: 'd (Faible)', value: 'd' },
  { label: 'E (Forte)', value: 'E' },
  { label: 'e (Faible)', value: 'e' },
  { label: 'D/E (Simultané)', value: ['D', 'E'] },
  { label: '· (Silence)', value: 0 },
];

export const MobileQuickStrokePopover: React.FC<Props> = ({
  pupitreKey, stepIndex, currentValue, onSelectStroke, onClose, lang = 'pt',
}) => {
  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-2xs select-none"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xs bg-[var(--cordel-bg)] border-2 border-[var(--cordel-border)] shadow-[4px_4px_0px_#000] p-3 flex flex-col gap-2.5"
      >
        <div className="flex items-center justify-between border-b border-[var(--cordel-border)] pb-1.5">
          <span className="font-cactus font-bold text-xs uppercase text-[#b94a2c]">
            {pupitreKey.toUpperCase()} — {lang === 'fr' ? `Pas ${stepIndex + 1}` : `Passo ${stepIndex + 1}`}
          </span>
          <button onClick={onClose} className="p-0.5 text-[var(--cordel-text)] hover:text-[#b94a2c]">
            <X size={14} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-1.5">
          {AVAILABLE_STROKES.map((st, idx) => {
            const isCurrent = JSON.stringify(st.value) === JSON.stringify(currentValue);
            return (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  onSelectStroke(st.value);
                  onClose();
                }}
                className={`py-2 px-2 text-left font-cactus font-bold text-xs uppercase cordel-border-sm transition-all shadow-[1px_1px_0px_var(--cordel-border)] active:translate-y-0.5 ${
                  isCurrent
                    ? 'bg-[#b94a2c] text-[#f4ecd8] border-[#f4ecd8]'
                    : 'bg-[#1a1a1a] text-[var(--cordel-text)] hover:border-[#b94a2c]'
                }`}
              >
                {st.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
