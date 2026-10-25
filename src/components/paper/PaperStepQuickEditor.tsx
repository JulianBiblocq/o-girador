/**
 * Sélecteur Rapide Cordel pour l'édition de pas dans la grille papier (< 100 lignes).
 */
import React, { useEffect, useMemo } from 'react';
import { PaperStepValue } from '../../types/paperWorkshop.types';
import { getStrokesForRole } from '../../utils/paper/paperPopoverStrokes';
import { Eraser, AlertTriangle, X } from 'lucide-react';

interface Props {
  roleKey: string;
  stepIndex: number;
  currentValue: PaperStepValue;
  isVigilance: boolean;
  onSelectStroke: (val: PaperStepValue) => void;
  onToggleVigilance: () => void;
  onClose: () => void;
  lang?: 'fr' | 'pt';
}

export const PaperStepQuickEditor: React.FC<Props> = ({
  roleKey, stepIndex, currentValue, isVigilance, onSelectStroke, onToggleVigilance, onClose, lang = 'fr',
}) => {
  const isFr = lang === 'fr';
  const curStr = Array.isArray(currentValue) ? `${currentValue[0]}/${currentValue[1]}` : (currentValue === 0 || !currentValue ? '·' : String(currentValue));
  const palette = useMemo(() => {
    const cfg = getStrokesForRole(roleKey);
    return Array.from(new Set([...cfg.strong, ...cfg.weak, ...cfg.special]));
  }, [roleKey]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); }
      else if (['Delete', 'Backspace', '0', '.', ' '].includes(e.key)) { e.preventDefault(); onSelectStroke(0); onClose(); }
      else if (e.key === '?' || e.key === '!') { e.preventDefault(); onToggleVigilance(); }
      else {
        const found = palette.find((s) => s.toLowerCase() === e.key.toLowerCase());
        if (found) { e.preventDefault(); onSelectStroke(e.shiftKey ? found.toUpperCase() : e.key); onClose(); }
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [palette, onClose, onSelectStroke, onToggleVigilance]);

  return (
    <div onClick={onClose} className="fixed inset-0 z-[400] flex items-center justify-center p-2 bg-black/60 backdrop-blur-xs select-none">
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-[310px] bg-[#f4ecd8] border-3 border-[#1a1a1a] shadow-[4px_4px_0px_#000] p-2.5 flex flex-col gap-2 font-sans text-xs text-[#1a1a1a]">
        <div className="flex items-center justify-between border-b-2 border-[#1a1a1a]/20 pb-1">
          <span className="font-cactus font-bold text-xs uppercase text-[#8b2a1a]">
            {roleKey.toUpperCase()} • T{Math.floor(stepIndex / 4) + 1}.{(stepIndex % 4) + 1} <span className="font-mono text-sm ml-1 px-1 bg-black/10 border border-black/30">[{curStr}]</span>
          </span>
          <button type="button" onClick={onClose} className="text-[#1a1a1a] hover:text-[#8b2a1a] p-0.5 cursor-pointer">
            <X size={16} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-1.5">
          <button
            type="button"
            onClick={() => { onSelectStroke(0); onClose(); }}
            className="py-1.5 px-2 bg-white hover:bg-stone-100 text-[#1a1a1a] border-2 border-[#1a1a1a] font-cactus font-bold text-xs uppercase flex items-center justify-center gap-1 shadow-[1px_1px_0px_#000] cursor-pointer"
          >
            <Eraser size={14} className="text-[#8b2a1a]" />
            <span>{isFr ? '· Vider' : '· Limpar'}</span>
          </button>
          <button
            type="button"
            onClick={onToggleVigilance}
            className={`py-1.5 px-2 border-2 border-[#1a1a1a] font-cactus font-bold text-xs uppercase flex items-center justify-center gap-1 shadow-[1px_1px_0px_#000] cursor-pointer ${
              isVigilance ? 'bg-[#d97706] text-white' : 'bg-[#fef3c7] text-[#b45309]'
            }`}
          >
            <AlertTriangle size={14} />
            <span>{isFr ? '! Doute' : '! Dúvida'}</span>
          </button>
        </div>

        <div>
          <div className="font-cactus font-bold text-[10px] text-[#8b2a1a] uppercase mb-1">{isFr ? 'Frappes du pupitre :' : 'Toques do naipe :'}</div>
          <div className="flex flex-wrap gap-1 max-h-[160px] overflow-y-auto">
            {palette.map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => { onSelectStroke(st); onClose(); }}
                className={`min-w-[32px] h-8 px-1.5 flex items-center justify-center font-mono font-bold text-xs border border-[#1a1a1a] shadow-[1px_1px_0px_#1a1a1a] cursor-pointer transition-colors ${
                  curStr === st ? 'bg-[#8b2a1a] text-[#f4ecd8]' : 'bg-white hover:bg-[#8b2a1a] hover:text-[#f4ecd8] text-[#1a1a1a]'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        <div className="border-t border-[#1a1a1a]/20 pt-1 text-[9px] text-[#666] font-mono leading-tight">
          {isFr ? 'Clavier : [Suppr/0/.] Vider • [Lettre] Frappe • [?] Doute • [Échap]' : 'Teclado : [Del/0/.] Limpar • [Letra] Toque • [?] Dúvida • [Esc]'}
        </div>
      </div>
    </div>
  );
};
