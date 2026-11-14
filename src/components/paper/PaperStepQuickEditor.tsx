/**
 * Sélecteur Rapide Cordel pour l'édition de pas dans la grille papier (< 105 lignes).
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
        const exact = palette.find((s) => s === e.key);
        const found = exact ?? palette.find((s) => s.toLowerCase() === e.key.toLowerCase());
        if (found) { e.preventDefault(); onSelectStroke(found); onClose(); }
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [palette, onClose, onSelectStroke, onToggleVigilance]);

  return (
    <div onClick={onClose} className="fixed inset-0 z-[400] flex items-center justify-center p-2 bg-black/60 backdrop-blur-xs select-none">
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-[310px] bg-[var(--cordel-parchment-bg)] border-3 border-[var(--cordel-ink-dark)] shadow-[4px_4px_0px_var(--cordel-ink-dark)] p-2.5 flex flex-col gap-2 font-sans text-xs text-[var(--cordel-ink-dark)]">
        <div className="flex items-center justify-between border-b-2 border-[var(--cordel-ink-dark)]/20 pb-1">
          <span className="font-cactus font-bold text-xs uppercase text-[var(--cordel-wood)]">
            {roleKey.toUpperCase()} • T{Math.floor(stepIndex / 4) + 1}.{(stepIndex % 4) + 1} <span className="font-mono text-sm ml-1 px-1 bg-black/10 border border-black/30">[{curStr}]</span>
          </span>
          <button type="button" onClick={onClose} className="text-[var(--cordel-ink-dark)] hover:text-[var(--cordel-wood)] p-0.5 cursor-pointer">
            <X size={16} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-1.5">
          <button
            type="button"
            onClick={() => { onSelectStroke(0); onClose(); }}
            className="py-1.5 px-2 bg-[var(--cordel-parchment-surface)] hover:bg-[var(--cordel-parchment-panel)] text-[var(--cordel-ink-dark)] border-2 border-[var(--cordel-ink-dark)] font-cactus font-bold text-xs uppercase flex items-center justify-center gap-1 shadow-[1px_1px_0px_var(--cordel-ink-dark)] cursor-pointer"
          >
            <Eraser size={14} className="text-[var(--cordel-wood)]" />
            <span>{isFr ? '· Vider' : '· Limpar'}</span>
          </button>
          <button
            type="button"
            onClick={onToggleVigilance}
            className={`py-1.5 px-2 border-2 border-[var(--cordel-ink-dark)] font-cactus font-bold text-xs uppercase flex items-center justify-center gap-1 shadow-[1px_1px_0px_var(--cordel-ink-dark)] cursor-pointer ${
              isVigilance ? 'bg-[var(--vu-level-warn)] text-[var(--cordel-ink-dark)]' : 'bg-[var(--cordel-parchment-surface)] text-[var(--cordel-wood)]'
            }`}
          >
            <AlertTriangle size={14} />
            <span>{isFr ? '! Doute' : '! Dúvida'}</span>
          </button>
        </div>

        <div>
          <div className="font-cactus font-bold text-[10px] text-[var(--cordel-wood)] uppercase mb-1">{isFr ? 'Frappes du pupitre :' : 'Toques do naipe :'}</div>
          <div className="flex flex-wrap gap-1 max-h-[160px] overflow-y-auto">
            {palette.map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => { onSelectStroke(st); onClose(); }}
                className={`min-w-[32px] h-8 px-1.5 flex items-center justify-center font-mono font-bold text-xs border border-[var(--cordel-ink-dark)] shadow-[1px_1px_0px_var(--cordel-ink-dark)] cursor-pointer transition-colors ${
                  curStr === st ? 'bg-[var(--cordel-wood)] text-[var(--cordel-parchment-bg)]' : 'bg-[var(--cordel-parchment-surface)] hover:bg-[var(--cordel-wood)] hover:text-[var(--cordel-parchment-bg)] text-[var(--cordel-ink-dark)]'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        <div className="border-t border-[var(--cordel-ink-dark)]/20 pt-1 text-[9px] text-[var(--cordel-ink-dark)]/70 font-mono leading-tight">
          {isFr ? 'Clavier : [Suppr/0/.] Vider • [Lettre] Frappe • [?] Doute • [Échap]' : 'Teclado : [Del/0/.] Limpar • [Letra] Toque • [?] Dúvida • [Esc]'}
        </div>
      </div>
    </div>
  );
};
