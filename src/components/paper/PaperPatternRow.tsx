/**
 * Ligne d'instrument pupitre dans la grille de relecture papier (< 100 lignes).
 */
import React from 'react';
import { PaperStepValue } from '../../types/paperWorkshop.types';
import { resolvePupitreAbbr } from '../../utils/paper/paperNomenclatureHelper';
import { resizeStepArray } from '../../utils/paper/paperPatternResizeHelper';
import { AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react';

interface PaperPatternRowProps {
  pupitreKey: string;
  steps: any;
  displaySteps: number;
  secName: string;
  points: any[];
  selectedCell: { role: string; idx: number } | null;
  onSelectCell: (role: string, idx: number, val: PaperStepValue) => void;
  onShiftRow?: (role: string, dir: -1 | 1, currentSteps: PaperStepValue[]) => void;
  isFr: boolean;
}

export const PaperPatternRow: React.FC<PaperPatternRowProps> = ({
  pupitreKey, steps, displaySteps, secName, points,
  selectedCell, onSelectCell, onShiftRow, isFr,
}) => {
  const abbr = resolvePupitreAbbr(pupitreKey);
  const isBase = typeof steps === 'string' && (steps === 'base' || steps === 'idem' || steps === '%');
  const stepArr = Array.isArray(steps) ? resizeStepArray(steps, displaySteps) : (isBase ? [] : Array(displaySteps).fill(0));

  if (isBase) {
    return (
      <div className="flex items-center gap-1">
        <span className="w-6 font-mono font-extrabold text-[9px] bg-[#e6dec8] !text-[#1a1a1a] px-1 py-0.5 text-center shrink-0 border border-[#1a1a1a]">{abbr}</span>
        <span className="px-2 py-0.5 bg-[#d99b26]/20 !text-[#8b2a1a] border border-[#8b2a1a] font-bold text-[10px]">[ = Base ]</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <span className="w-6 font-mono font-extrabold text-[9px] bg-[#e6dec8] !text-[#1a1a1a] px-1 py-0.5 text-center shrink-0 border border-[#1a1a1a]">{abbr}</span>
      <div className="grid flex-1 border border-[#1a1a1a]" style={{ gridTemplateColumns: `repeat(${displaySteps}, minmax(0, 1fr))` }}>
        {stepArr.map((st, i) => {
          const valStr = Array.isArray(st) ? `${st[0]}/${st[1]}` : (st === 0 || !st || st === '0' ? '.' : String(st));
          const isOdd = Math.floor(i / 4) % 2 !== 0;
          const isPoint = points.some((p) => p.sectionName === secName && p.roleKey === pupitreKey && p.stepIndex === i);
          const isCellSel = selectedCell?.role === pupitreKey && selectedCell?.idx === i;

          return (
            <button
              key={i}
              type="button"
              onClick={() => onSelectCell(pupitreKey, i, st)}
              className={`h-4.5 relative text-[9px] font-mono font-bold flex items-center justify-center cursor-pointer transition-all ${
                i % 4 === 3 ? 'border-r-2 border-[#1a1a1a]' : 'border-r border-[#1a1a1a]/20'
              } ${
                isCellSel ? 'ring-2 ring-amber-500 bg-amber-500/30 z-20 !text-[#1a1a1a]'
                  : isPoint ? 'ring-2 ring-[#d97706] bg-[#fef3c7] text-[#1a1a1a] z-10' : valStr === '.'
                  ? isOdd ? 'bg-[#dfd3b8] !text-[#1a1a1a]/60 font-bold' : 'bg-[#f4ecd8] !text-[#1a1a1a]/60 font-bold'
                  : 'bg-[#8b2a1a] text-[#f4ecd8]'
              }`}
            >
              {isPoint && <AlertTriangle size={8} className="absolute top-0 right-0 text-[#d97706] pointer-events-none" />}
              <span>{valStr}</span>
            </button>
          );
        })}
      </div>
      <div className="flex items-center gap-0.5 shrink-0">
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onShiftRow?.(pupitreKey, -1, stepArr); }}
          title={isFr ? "Décaler d'une case à gauche" : "Deslocar um passo para a esquerda"}
          className="w-5 h-4.5 rounded-[2px] border border-[#1a1a1a] shadow-[1px_1px_0px_#1a1a1a] flex items-center justify-center bg-[#f4ecd8] hover:bg-[#e6dec8] active:translate-y-0.5 text-[#1a1a1a] cursor-pointer transition-colors"
        >
          <ChevronLeft size={11} strokeWidth={2.5} />
        </button>
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onShiftRow?.(pupitreKey, 1, stepArr); }}
          title={isFr ? "Décaler d'une case à droite" : "Deslocar um passo para a direita"}
          className="w-5 h-4.5 rounded-[2px] border border-[#1a1a1a] shadow-[1px_1px_0px_#1a1a1a] flex items-center justify-center bg-[#f4ecd8] hover:bg-[#e6dec8] active:translate-y-0.5 text-[#1a1a1a] cursor-pointer transition-colors"
        >
          <ChevronRight size={11} strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
};
