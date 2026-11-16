/**
 * Popover compact de sélection tactile des frappes SSOT du pupitre sur appui long (< 100 lignes).
 */
import React from 'react';
import { PaperStepValue } from '../../../types/paperWorkshop.types';
import { getStrokesForRole } from '../../../utils/paper/paperPopoverStrokes';
import { X, Delete } from 'lucide-react';

interface Props {
  pupitreKey: string;
  stepIndex: number;
  currentValue: PaperStepValue;
  onSelectStroke: (val: PaperStepValue) => void;
  onClose: () => void;
  lang?: 'fr' | 'pt';
}

export const MobileQuickStrokePopover: React.FC<Props> = ({
  pupitreKey, stepIndex, currentValue, onSelectStroke, onClose, lang = 'pt',
}) => {
  const isFr = lang === 'fr';
  const normRole = (pupitreKey || '').toLowerCase().replace(/[0-9]+$/, '');
  const isTimbal = normRole === 'tb';
  const strokes = getStrokesForRole(pupitreKey);
  const curStr = Array.isArray(currentValue)
    ? `${currentValue[0]}/${currentValue[1]}`
    : currentValue === 0 || !currentValue ? '·' : String(currentValue);

  const pick = (token: string) => {
    const val: PaperStepValue = token.includes('/') ? (token.split('/') as [string, string]) : token;
    onSelectStroke(val);
    onClose();
  };

  const renderBtn = (st: string) => (
    <button
      key={st}
      type="button"
      onClick={() => pick(st)}
      className={`min-w-[38px] h-9 px-2 font-mono font-bold text-xs border-2 border-[var(--cordel-border-strong)] shadow-[1px_1px_0px_var(--cordel-shadow-color)] active:translate-y-0.5 cursor-pointer ${
        curStr === st
          ? 'bg-[var(--cordel-wood)] text-[var(--cordel-on-accent)]'
          : 'bg-[var(--cordel-surface-elevated)] text-[var(--cordel-text)] hover:bg-[var(--cordel-accent)] hover:text-[var(--cordel-on-accent)]'
      }`}
    >
      {st}
    </button>
  );

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--cordel-ink-dark)]/70 backdrop-blur-2xs select-none"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xs bg-[var(--cordel-bg)] border-2 border-[var(--cordel-border-strong)] shadow-[4px_4px_0px_var(--cordel-shadow-color)] p-3 flex flex-col gap-2.5 text-[var(--cordel-text)]"
      >
        <div className="flex items-center justify-between border-b border-[var(--cordel-border)] pb-1.5">
          <span className="font-cactus font-bold text-xs uppercase text-[var(--cordel-accent-readable)]">
            {pupitreKey.toUpperCase()} — {isFr ? `Pas ${stepIndex + 1}` : `Passo ${stepIndex + 1}`}
          </span>
          <button type="button" onClick={onClose} className="p-0.5 text-[var(--cordel-text)] hover:text-[var(--cordel-accent-readable)] cursor-pointer">
            <X size={14} />
          </button>
        </div>

        <button
          type="button"
          onClick={() => { onSelectStroke(0); onClose(); }}
          className={`w-full py-1.5 px-2 border-2 border-[var(--cordel-border-strong)] font-cactus font-bold text-xs uppercase flex items-center justify-center gap-1.5 shadow-[1px_1px_0px_var(--cordel-shadow-color)] cursor-pointer ${
            curStr === '·' || curStr === '0' ? 'bg-[var(--cordel-wood)] text-[var(--cordel-on-accent)]' : 'bg-[var(--cordel-surface)] text-[var(--cordel-text)]'
          }`}
        >
          <Delete size={13} />
          <span>{isFr ? '· Silence (0)' : '· Silêncio (0)'}</span>
        </button>

        <div>
          <div className="font-cactus font-bold text-[10px] uppercase text-[var(--cordel-text-muted)] mb-1">
            {isTimbal ? (isFr ? 'Main Droite (MAJ)' : 'Mão Direita (MAI)') : (isFr ? 'Coups Forts (MAJ)' : 'Toques Fortes (MAI)')}
          </div>
          <div className="flex flex-wrap gap-1.5">{strokes.strong.map(renderBtn)}</div>
        </div>

        {strokes.weak.length > 0 && (
          <div>
            <div className="font-cactus font-bold text-[10px] uppercase text-[var(--cordel-text-muted)] mb-1">
              {isTimbal ? (isFr ? 'Main Gauche (min)' : 'Mão Esquerda (min)') : (isFr ? 'Coups Faibles (min)' : 'Toques Fracos (min)')}
            </div>
            <div className="flex flex-wrap gap-1.5">{strokes.weak.map(renderBtn)}</div>
          </div>
        )}

        {strokes.special.length > 0 && (
          <div>
            <div className="font-cactus font-bold text-[10px] uppercase text-[var(--cordel-text-muted)] mb-1">
              {isFr ? 'Doubles coups scindés (Ra)' : 'Toques duplos divididos (Rá)'}
            </div>
            <div className="flex flex-wrap gap-1.5">{strokes.special.map(renderBtn)}</div>
          </div>
        )}
      </div>
    </div>
  );
};
