import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { PaperStepValue } from '../../../types/paperWorkshop.types';
import { VigilancePoint } from '../../../stores/usePaperVigilanceStore';
import { resolvePupitreAbbr } from '../../../utils/paper/paperNomenclatureHelper';

export interface MobilePaperScanGridProps {
  displayedPupitres: [string, PaperStepValue[]][];
  secName: string;
  vigilancePoints: VigilancePoint[];
  lang: string;
  onCellPointerDown: (secName: string, pupitreKey: string, stepIndex: number, val: PaperStepValue) => void;
  onCellPointerUp: (secName: string, pupitreKey: string, stepIndex: number) => void;
}

export const MobilePaperScanGrid: React.FC<MobilePaperScanGridProps> = ({
  displayedPupitres,
  secName,
  vigilancePoints,
  lang,
  onCellPointerDown,
  onCellPointerUp,
}) => {
  return (
    <>
      <div className="grid grid-cols-4 flex-1 text-center font-mono font-bold text-[8.5px] text-[var(--cordel-text-muted)] pl-6">
        <span>T1</span><span>T2</span><span>T3</span><span>T4</span>
      </div>
      <div className="flex flex-col gap-1">
        {displayedPupitres.length === 0 ? (
          <div className="text-[9px] text-center py-2 text-[#15803d] font-cactus font-bold">
            {lang === 'fr' ? 'Aucun doute sur ce motif' : 'Nenhuma dúvida neste padrão'}
          </div>
        ) : (
          displayedPupitres.map(([pupitreKey, steps]) => (
            <div key={pupitreKey} className="flex items-center gap-1">
              <span className="w-5 font-mono font-bold text-[9px] bg-[var(--cordel-card-btn-bg)] text-[var(--cordel-card-btn-text)] text-center shrink-0 border border-[var(--cordel-border)]">
                {resolvePupitreAbbr(pupitreKey)}
              </span>
              <div className="grid grid-cols-16 flex-1 border border-[var(--cordel-border)]">
                {(Array.isArray(steps) ? steps : Array(16).fill(0)).map((st, i) => {
                  const val = Array.isArray(st) ? `${st[0]}/${st[1]}` : (st === 0 || !st ? '•' : String(st));
                  const isPoint = vigilancePoints.some(
                    (p) => p.sectionName === secName && p.roleKey === pupitreKey && p.stepIndex === i
                  );
                  return (
                    <button
                      key={i}
                      type="button"
                      onPointerDown={() => onCellPointerDown(secName, pupitreKey, i, st)}
                      onPointerUp={() => onCellPointerUp(secName, pupitreKey, i)}
                      className={`h-5 relative text-[9px] font-mono font-bold flex items-center justify-center transition-all ${
                        i % 4 === 3 ? 'border-r-2 border-[var(--cordel-border)]' : 'border-r border-[var(--cordel-border)]/30'
                      } ${
                        isPoint
                          ? 'ring-2 ring-[#d97706] bg-[#fef3c7] text-[#1a1a1a] z-10'
                          : val !== '•'
                          ? 'bg-[#8b2a1a] text-[#f4ecd8]'
                          : Math.floor(i / 4) % 2 === 1
                          ? 'bg-[var(--cordel-beat-even)] text-[var(--cordel-text)]/50'
                          : 'bg-[var(--cordel-beat-odd)] text-[var(--cordel-text)]/50'
                      }`}
                    >
                      {isPoint && <AlertTriangle size={7} className="absolute top-0 right-0 text-[#d97706] pointer-events-none" />}
                      <span>{val}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );
};
