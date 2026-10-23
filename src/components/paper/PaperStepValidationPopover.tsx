/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Mini-popover de validation & correction rapide d'un pas du scan (< 95 lignes).
 */
import React from 'react';
import { PaperStepValue } from '../../types/paperWorkshop.types';
import { Check, AlertTriangle, X } from 'lucide-react';

interface Props {
  roleKey: string;
  stepIndex: number;
  currentValue: PaperStepValue;
  isVigilance: boolean;
  onValidateCurrent: () => void;
  onSelectStroke: (val: PaperStepValue) => void;
  onToggleVigilance: () => void;
  onClose: () => void;
  lang?: 'fr' | 'pt';
}

const STROKES_BY_ROLE: Record<string, string[]> = {
  al: ['D', 'd', 'E', 'e', 'I', 'B'],
  mc: ['D', 'd', 'E', 'e', 'I', 'B'],
  me: ['D', 'd', 'E', 'e', 'I', 'B'],
  rp: ['D', 'd', 'E', 'e', 'I', 'B'],
  cx: ['D', 'd', 'E', 'e', 'R', 'r', 'F'],
  tr: ['D', 'd', 'E', 'e', 'R', 'r', 'F'],
  gg: ['G', 'g', 'A', 'a'],
  ab: ['D', 'd', 'E', 'e', 'S', 'V'],
  mi: ['P', 'p', 'T', 't', 'L', 'B'],
  tb: ['G', 'g', 'A', 'a', 'S', 's'],
};

export const PaperStepValidationPopover: React.FC<Props> = ({
  roleKey, stepIndex, currentValue, isVigilance,
  onValidateCurrent, onSelectStroke, onToggleVigilance, onClose, lang = 'fr',
}) => {
  const normRole = roleKey.toLowerCase();
  const validStrokes = STROKES_BY_ROLE[normRole] || ['D', 'd', 'E', 'e'];
  const curStr = Array.isArray(currentValue) ? `${currentValue[0]}/${currentValue[1]}` : (currentValue === 0 || !currentValue ? '·' : String(currentValue));

  return (
    <div onClick={onClose} className="fixed inset-0 z-[400] flex items-center justify-center p-3 bg-black/60 select-none">
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-[280px] bg-[var(--cordel-bg,#f4ecd8)] border-3 border-black shadow-[4px_4px_0px_#000] p-2.5 flex flex-col gap-2 font-sans text-xs">
        <div className="flex items-center justify-between border-b border-black/20 pb-1">
          <span className="font-cactus font-bold text-xs uppercase text-[#8b2a1a] dark:text-[#f59e0b]">
            {roleKey.toUpperCase()} • T{Math.floor(stepIndex / 4) + 1}.{(stepIndex % 4) + 1}
          </span>
          <button type="button" onClick={onClose} className="text-[#1a1a1a] dark:text-[#f4ecd8] hover:text-[#8b2a1a] cursor-pointer">
            <X size={14} />
          </button>
        </div>

        {isVigilance ? (
          <button
            type="button"
            onClick={onValidateCurrent}
            className="w-full py-1.5 px-2 bg-[#15803d] hover:bg-[#166534] text-white border-2 border-black font-cactus font-bold text-xs uppercase flex items-center justify-center gap-1.5 shadow-[2px_2px_0px_#000] cursor-pointer"
          >
            <Check size={13} />
            <span>{lang === 'fr' ? `Valider "${curStr}"` : `Confirmar "${curStr}"`}</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={onToggleVigilance}
            className="w-full py-1.5 px-2 bg-[#d97706] hover:bg-[#b45309] text-white border-2 border-black font-cactus font-bold text-xs uppercase flex items-center justify-center gap-1.5 shadow-[2px_2px_0px_#000] cursor-pointer"
          >
            <AlertTriangle size={13} />
            <span>{lang === 'fr' ? 'Poser un point de vigilance' : 'Marcar ponto de vigilância'}</span>
          </button>
        )}

        <div className="text-[10px] font-bold text-[#8b2a1a] dark:text-[#f59e0b] uppercase">
          {lang === 'fr' ? 'Corriger la frappe :' : 'Corrigir toque :'}
        </div>
        <div className="grid grid-cols-4 gap-1">
          {validStrokes.map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => onSelectStroke(st)}
              className={`py-1 text-center font-mono font-bold text-xs border border-black transition-all shadow-[1px_1px_0px_#000] cursor-pointer ${
                curStr === st ? 'bg-[#8b2a1a] text-[#f4ecd8]' : 'bg-white hover:bg-[#fef3c7] text-[#1a1a1a]'
              }`}
            >
              {st}
            </button>
          ))}
          <button
            type="button"
            onClick={() => onSelectStroke(0)}
            className={`col-span-2 py-1 text-center font-cactus font-bold text-xs uppercase border border-black shadow-[1px_1px_0px_#000] cursor-pointer ${
              curStr === '·' || curStr === '0' ? 'bg-[#8b2a1a] text-[#f4ecd8]' : 'bg-white hover:bg-stone-100 text-[#1a1a1a]'
            }`}
          >
            {lang === 'fr' ? 'Silence (0)' : 'Silêncio (0)'}
          </button>
        </div>
      </div>
    </div>
  );
};
