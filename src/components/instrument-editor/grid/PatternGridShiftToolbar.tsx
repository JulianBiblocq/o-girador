import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useSequencerStore } from '../../../stores/useSequencerStore';

interface PatternGridShiftToolbarProps {
  trackId: number;
  patternId: number;
  lang: string;
}

export const PatternGridShiftToolbar: React.FC<PatternGridShiftToolbarProps> = ({
  trackId,
  patternId,
  lang,
}) => {
  const isFr = lang === 'fr';
  const selectedStepIdx = useSequencerStore((s) => s.selectedStepIdx);
  const selectedStepRange = useSequencerStore((s) => s.selectedStepRange);
  const shiftPatternSteps = useSequencerStore((s) => s.shiftPatternSteps);

  const scopeLabel = React.useMemo(() => {
    if (selectedStepRange && (selectedStepRange.patternId === undefined || selectedStepRange.patternId === patternId)) {
      const min = Math.min(selectedStepRange.start.step, selectedStepRange.end.step) + 1;
      const max = Math.max(selectedStepRange.start.step, selectedStepRange.end.step) + 1;
      return isFr ? `Pas ${min}..${max}` : `Passos ${min}..${max}`;
    }
    if (selectedStepIdx !== null && selectedStepIdx !== undefined && selectedStepIdx >= 0) {
      return isFr ? `Pas ${selectedStepIdx + 1}..Fin` : `Passo ${selectedStepIdx + 1}..Fim`;
    }
    return isFr ? 'Ligne entière' : 'Linha inteira';
  }, [selectedStepRange, selectedStepIdx, patternId, isFr]);

  const handleShift = (dir: -1 | 1) => {
    shiftPatternSteps(trackId, patternId, dir);
  };

  return (
    <div
      className="flex items-center gap-1.5 py-1 px-2 bg-[#f4ecd8]/60 border border-[#1a1a1a]/20 rounded-xs select-none"
      onClick={(e) => e.stopPropagation()}
    >
      <span className="text-[10px] font-cactus font-bold uppercase tracking-wider text-[#1a1a1a]/70">
        {isFr ? 'Décalage :' : 'Deslocar :'}
      </span>
      <span className="text-[9px] font-mono font-bold bg-[#1a1a1a]/10 text-[#1a1a1a] px-1.5 py-0.5 rounded-[2px] border border-[#1a1a1a]/20">
        {scopeLabel}
      </span>
      <div className="flex items-center gap-1 ml-auto">
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleShift(-1); }}
          title={isFr ? "Décaler d'une case à gauche (Alt + Gauche)" : "Deslocar um passo para a esquerda (Alt + Esquerda)"}
          className="h-6 px-1.5 rounded-[2px] border border-[#1a1a1a] shadow-[1px_1px_0px_#1a1a1a] inline-flex items-center gap-0.5 font-cactus font-bold text-[10px] uppercase bg-[#f4ecd8] hover:bg-[#e6dec8] active:translate-y-0.5 text-[#1a1a1a] cursor-pointer transition-colors"
        >
          <ChevronLeft size={13} strokeWidth={2.5} />
          <span>-1</span>
        </button>
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleShift(1); }}
          title={isFr ? "Décaler d'une case à droite (Alt + Droite)" : "Deslocar um passo para a direita (Alt + Direita)"}
          className="h-6 px-1.5 rounded-[2px] border border-[#1a1a1a] shadow-[1px_1px_0px_#1a1a1a] inline-flex items-center gap-0.5 font-cactus font-bold text-[10px] uppercase bg-[#f4ecd8] hover:bg-[#e6dec8] active:translate-y-0.5 text-[#1a1a1a] cursor-pointer transition-colors"
        >
          <span>+1</span>
          <ChevronRight size={13} strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
};
