/**
 * Popover tactile de validation & correction rapide des frappes SSOT (< 135 lignes).
 */
import React, { useState } from 'react';
import { PaperStepValue } from '../../types/paperWorkshop.types';
import { getStrokesForRole, ALL_STROKE_LETTERS } from '../../utils/paper/paperPopoverStrokes';
import { Check, AlertTriangle, X, Delete } from 'lucide-react';

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

export const PaperStepValidationPopover: React.FC<Props> = ({
  roleKey, stepIndex, currentValue, isVigilance,
  onValidateCurrent, onSelectStroke, onToggleVigilance, onClose, lang = 'fr',
}) => {
  const [showAllLetters, setShowAllLetters] = useState(false);
  const normRole = (roleKey || '').toLowerCase().replace(/[0-9]+$/, '');
  const isTimbal = normRole === 'tb';
  const strokes = getStrokesForRole(roleKey);
  const isFr = lang === 'fr';
  const curStr = Array.isArray(currentValue) ? `${currentValue[0]}/${currentValue[1]}` : (currentValue === 0 || !currentValue ? '·' : String(currentValue));

  const renderStrokeBtn = (st: string) => (
    <button
      key={st}
      type="button"
      onClick={() => onSelectStroke(st.includes('/') ? (st.split('/') as [string, string]) : st)}
      className={`min-w-[38px] min-h-[38px] px-1 flex items-center justify-center font-mono font-black text-sm border-2 border-[var(--cordel-border-strong)] shadow-[1px_1px_0px_var(--cordel-shadow-color)] cursor-pointer transition-transform active:translate-y-0.5 ${
        curStr === st
          ? 'bg-[var(--cordel-wood)] text-[var(--cordel-on-accent)]'
          : 'bg-[var(--cordel-surface-elevated)] hover:bg-[var(--cordel-accent)] hover:text-[var(--cordel-on-accent)] text-[var(--cordel-text)]'
      }`}
    >
      {st}
    </button>
  );

  const upperLabel = isTimbal
    ? (isFr ? 'Main Droite (Majuscules) :' : 'Mão Direita (Maiúsculas) :')
    : (isFr ? 'Coups Forts (Majuscules) :' : 'Toques Fortes (Maiúsculas) :');
  const lowerLabel = isTimbal
    ? (isFr ? 'Main Gauche (minuscules) :' : 'Mão Esquerda (minúsculas) :')
    : (isFr ? 'Coups Faibles (minuscules) :' : 'Toques Fracos (minúsculas) :');

  return (
    <div onClick={onClose} className="fixed inset-0 z-[400] flex items-center justify-center p-2.5 bg-[var(--cordel-ink-dark)]/75 backdrop-blur-xs select-none">
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-[320px] max-h-[90vh] overflow-y-auto bg-[var(--cordel-bg)] border-3 border-[var(--cordel-border-strong)] shadow-[5px_5px_0px_var(--cordel-shadow-color)] p-3 flex flex-col gap-2.5 font-sans text-xs text-[var(--cordel-text)]">
        <div className="flex items-center justify-between border-b-2 border-[var(--cordel-border)] pb-1.5">
          <span className="font-cactus font-bold text-xs uppercase text-[var(--cordel-accent-readable)]">
            {roleKey.toUpperCase()} • T{Math.floor(stepIndex / 4) + 1}.{(stepIndex % 4) + 1}
          </span>
          <button type="button" onClick={onClose} className="text-[var(--cordel-text)] hover:text-[var(--cordel-accent-readable)] p-0.5 cursor-pointer">
            <X size={16} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-1.5">
          {isVigilance ? (
            <button
              type="button"
              onClick={onValidateCurrent}
              className="py-2 px-2 bg-[var(--cordel-status-success)] text-[var(--cordel-on-accent)] border-2 border-[var(--cordel-border-strong)] font-cactus font-bold text-xs uppercase flex items-center justify-center gap-1 shadow-[2px_2px_0px_var(--cordel-shadow-color)] cursor-pointer"
            >
              <Check size={14} />
              <span className="truncate">{isFr ? `Valider "${curStr}"` : `Validar "${curStr}"`}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onToggleVigilance}
              className="py-2 px-2 bg-[var(--cordel-gold)] text-[var(--cordel-ink-dark)] border-2 border-[var(--cordel-border-strong)] font-cactus font-bold text-xs uppercase flex items-center justify-center gap-1 shadow-[2px_2px_0px_var(--cordel-shadow-color)] cursor-pointer"
            >
              <AlertTriangle size={14} />
              <span className="truncate">{isFr ? 'Doute' : 'Dúvida'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => onSelectStroke(0)}
            className={`py-2 px-2 border-2 border-[var(--cordel-border-strong)] font-cactus font-bold text-xs uppercase flex items-center justify-center gap-1 shadow-[2px_2px_0px_var(--cordel-shadow-color)] cursor-pointer ${
              curStr === '·' || curStr === '0'
                ? 'bg-[var(--cordel-wood)] text-[var(--cordel-on-accent)]'
                : 'bg-[var(--cordel-surface-elevated)] hover:bg-[var(--cordel-surface)] text-[var(--cordel-text)]'
            }`}
          >
            <Delete size={14} />
            <span>{isFr ? 'Silence (0)' : 'Silêncio (0)'}</span>
          </button>
        </div>

        <div>
          <div className="font-cactus font-bold text-[10px] text-[var(--cordel-accent-readable)] uppercase mb-1">{upperLabel}</div>
          <div className="flex flex-wrap gap-1">{strokes.strong.map(renderStrokeBtn)}</div>
        </div>

        {strokes.weak.length > 0 && (
          <div>
            <div className="font-cactus font-bold text-[10px] text-[var(--cordel-accent-readable)] uppercase mb-1">{lowerLabel}</div>
            <div className="flex flex-wrap gap-1">{strokes.weak.map(renderStrokeBtn)}</div>
          </div>
        )}

        {strokes.special.length > 0 && (
          <div>
            <div className="font-cactus font-bold text-[10px] text-[var(--cordel-accent-readable)] uppercase mb-1">{isFr ? 'Doubles Coups Scindés (Ra) :' : 'Toques Duplos Divididos (Rá) :'}</div>
            <div className="flex flex-wrap gap-1">{strokes.special.map(renderStrokeBtn)}</div>
          </div>
        )}

        <div className="border-t border-[var(--cordel-border)] pt-2 flex flex-col gap-1.5">
          <button
            type="button"
            onClick={() => setShowAllLetters((prev) => !prev)}
            className="text-[10px] font-cactus font-bold uppercase text-[var(--cordel-accent-readable)] hover:underline cursor-pointer text-left"
          >
            {showAllLetters ? (isFr ? '- Moins de frappes' : '- Menos toques') : (isFr ? '+ Toutes les lettres reconnues' : '+ Todas as letras reconhecidas')}
          </button>
          {showAllLetters && <div className="flex flex-wrap gap-1 pt-1">{ALL_STROKE_LETTERS.map(renderStrokeBtn)}</div>}
        </div>
      </div>
    </div>
  );
};
