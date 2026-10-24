/**
 * Popover tactile de validation & correction rapide des frappes complètes (< 135 lignes).
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
  const strokes = getStrokesForRole(roleKey);
  const isFr = lang === 'fr';
  const curStr = Array.isArray(currentValue) ? `${currentValue[0]}/${currentValue[1]}` : (currentValue === 0 || !currentValue ? '·' : String(currentValue));

  const renderStrokeBtn = (st: string) => (
    <button
      key={st}
      type="button"
      onClick={() => onSelectStroke(st)}
      className={`min-w-[38px] min-h-[38px] flex items-center justify-center font-mono font-black text-sm border-2 border-[#1a1a1a] shadow-[1px_1px_0px_#1a1a1a] cursor-pointer transition-transform active:translate-y-0.5 ${
        curStr === st ? 'bg-[#8b2a1a] text-[#f4ecd8]' : 'bg-white hover:bg-[#fef3c7] text-[#1a1a1a]'
      }`}
    >
      {st}
    </button>
  );

  return (
    <div onClick={onClose} className="fixed inset-0 z-[400] flex items-center justify-center p-2.5 bg-black/70 backdrop-blur-xs select-none">
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-[320px] max-h-[90vh] overflow-y-auto bg-[#f4ecd8] border-3 border-[#1a1a1a] shadow-[5px_5px_0px_#000] p-3 flex flex-col gap-2.5 font-sans text-xs text-[#1a1a1a]">
        {/* EN-TÊTE */}
        <div className="flex items-center justify-between border-b-2 border-black/20 pb-1.5">
          <span className="font-cactus font-bold text-xs uppercase text-[#8b2a1a]">
            {roleKey.toUpperCase()} • T{Math.floor(stepIndex / 4) + 1}.{(stepIndex % 4) + 1}
          </span>
          <button type="button" onClick={onClose} className="text-[#1a1a1a] hover:text-[#8b2a1a] p-0.5 cursor-pointer">
            <X size={16} />
          </button>
        </div>

        {/* ACTIONS MAJEURES DU HAUT : VALIDER / SILENCE */}
        <div className="grid grid-cols-2 gap-1.5">
          {isVigilance ? (
            <button
              type="button"
              onClick={onValidateCurrent}
              className="py-2 px-2 bg-[#15803d] hover:bg-[#166534] text-white border-2 border-black font-cactus font-bold text-xs uppercase flex items-center justify-center gap-1 shadow-[2px_2px_0px_#000] cursor-pointer"
            >
              <Check size={14} />
              <span className="truncate">{isFr ? `Valider "${curStr}"` : `Validar "${curStr}"`}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onToggleVigilance}
              className="py-2 px-2 bg-[#d97706] hover:bg-[#b45309] text-white border-2 border-black font-cactus font-bold text-xs uppercase flex items-center justify-center gap-1 shadow-[2px_2px_0px_#000] cursor-pointer"
            >
              <AlertTriangle size={14} />
              <span className="truncate">{isFr ? 'Doute' : 'Dúvida'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => onSelectStroke(0)}
            className={`py-2 px-2 border-2 border-black font-cactus font-bold text-xs uppercase flex items-center justify-center gap-1 shadow-[2px_2px_0px_#000] cursor-pointer ${
              curStr === '·' || curStr === '0' ? 'bg-[#8b2a1a] text-[#f4ecd8]' : 'bg-white hover:bg-stone-100 text-[#1a1a1a]'
            }`}
          >
            <Delete size={14} />
            <span>{isFr ? 'Silence (0)' : 'Silêncio (0)'}</span>
          </button>
        </div>

        {/* SECTION 1 : COUPS FORTS (MAJ) */}
        <div>
          <div className="font-cactus font-bold text-[10px] text-[#8b2a1a] uppercase mb-1">{isFr ? 'Coups Forts (Majuscules) :' : 'Toques Fortes (Maiúsculas) :'}</div>
          <div className="flex flex-wrap gap-1">{strokes.strong.map(renderStrokeBtn)}</div>
        </div>

        {/* SECTION 2 : COUPS FAIBLES (min) */}
        <div>
          <div className="font-cactus font-bold text-[10px] text-[#8b2a1a] uppercase mb-1">{isFr ? 'Coups Faibles (minuscules) :' : 'Toques Fracos (minúsculas) :'}</div>
          <div className="flex flex-wrap gap-1">{strokes.weak.map(renderStrokeBtn)}</div>
        </div>

        {/* SECTION 3 : SPÉCIAUX / RAS */}
        {strokes.special.length > 0 && (
          <div>
            <div className="font-cactus font-bold text-[10px] text-[#8b2a1a] uppercase mb-1">{isFr ? 'Doubles Coups / Ras :' : 'Toques Duplos / Ras :'}</div>
            <div className="flex flex-wrap gap-1">{strokes.special.map(renderStrokeBtn)}</div>
          </div>
        )}

        {/* BASCULE TOUTES LES LETTRES */}
        <div className="border-t border-black/20 pt-2 flex flex-col gap-1.5">
          <button
            type="button"
            onClick={() => setShowAllLetters((prev) => !prev)}
            className="text-[10px] font-cactus font-bold uppercase text-[#8b2a1a] hover:underline cursor-pointer text-left"
          >
            {showAllLetters ? (isFr ? '- Moins de frappes' : '- Menos toques') : (isFr ? '+ Toutes les lettres (Alphabet)' : '+ Todas as letras')}
          </button>
          {showAllLetters && (
            <div className="flex flex-wrap gap-1 pt-1">
              {ALL_STROKE_LETTERS.map(renderStrokeBtn)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
