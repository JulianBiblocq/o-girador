/**
 * Carte d'un motif individuel dans la grille de relecture avec métrique et BPM (< 120 lignes).
 */
import React from 'react';
import { PaperStepValue, PatternMetricOverride } from '../../types/paperWorkshop.types';
import { resolvePupitreAbbr } from '../../utils/paper/paperNomenclatureHelper';
import { AlertTriangle } from 'lucide-react';
import { PaperPatternCardHeader } from './PaperPatternCardHeader';

interface Props {
  secName: string;
  onRename?: (newName: string) => void;
  pupitreMap: Partial<Record<string, PaperStepValue[]>>;
  isReusable: boolean;
  onToggleReusable: () => void;
  points: any[];
  onCellClick: (role: string, idx: number, val: PaperStepValue) => void;
  globalBpm: number;
  globalTimeSig: string;
  override?: PatternMetricOverride;
  onOpenOverrideModal: () => void;
  onRescan?: () => void;
  lang: 'fr' | 'pt';
}

export const PaperPatternCard: React.FC<Props> = ({
  secName, onRename, pupitreMap, isReusable, onToggleReusable, points, onCellClick,
  globalBpm, globalTimeSig, override, onOpenOverrideModal, onRescan, lang,
}) => {
  const nativeSteps = React.useMemo(() => {
    const lengths = Object.values(pupitreMap).filter(Array.isArray).map((a) => (a as any[]).length);
    return lengths.length > 0 ? Math.max(...lengths) : 16;
  }, [pupitreMap]);

  const displaySteps = override?.steps || nativeSteps;
  const displaySig = override?.timeSignature || (displaySteps === 8 ? '2/4' : (displaySteps === 12 ? '12/8' : globalTimeSig)) || '4/4';
  const displayBpm = override?.bpm || globalBpm;
  const isOverridden = Boolean(override?.isLocked || override?.bpm || override?.timeSignature || override?.steps);
  const numBeats = Math.max(1, Math.floor(displaySteps / 4));

  return (
    <div className="p-2 pb-3 bg-[#fdfbf7] dark:bg-[#fdfbf7] border border-[#1a1a1a] shadow-[1px_1px_0px_#1a1a1a]">
      <PaperPatternCardHeader
        secName={secName} onRename={onRename} displaySig={displaySig} displaySteps={displaySteps}
        displayBpm={displayBpm} isOverridden={isOverridden} onOpenOverrideModal={onOpenOverrideModal}
        onRescan={onRescan} isReusable={isReusable} onToggleReusable={onToggleReusable} lang={lang}
      />

      {/* REPERES DE TEMPS */}
      <div className="flex items-center gap-1 mb-0.5">
        <span className="w-6 shrink-0" />
        <div className="grid flex-1 text-[9px] font-cactus font-bold text-[#8b2a1a] text-center" style={{ gridTemplateColumns: `repeat(${numBeats}, minmax(0, 1fr))` }}>
          <span>T1</span><span>T2</span>{numBeats >= 3 && <span>T3</span>}{numBeats >= 4 && <span>T4</span>}
        </div>
      </div>

      {/* LIGNES PUPITRES */}
      <div className="flex flex-col gap-1">
        {Object.entries(pupitreMap).map(([pupitreKey, steps]) => {
          const abbr = resolvePupitreAbbr(pupitreKey);
          const isBase = typeof steps === 'string' && (steps === 'base' || steps === 'idem' || steps === '%');
          const stepArr = Array.isArray(steps) ? steps : (isBase ? [] : Array(displaySteps).fill(0));

          return (
            <div key={pupitreKey} className="flex items-center gap-1">
              <span className="w-6 font-mono font-extrabold text-[9px] bg-[#e6dec8] !text-[#1a1a1a] px-1 py-0.5 text-center shrink-0 border border-[#1a1a1a]">{abbr}</span>
              {isBase ? (
                <span className="px-2 py-0.5 bg-[#d99b26]/20 !text-[#8b2a1a] border border-[#8b2a1a] font-bold text-[10px]">[ ≡ Base ]</span>
              ) : (
                <div className="grid flex-1 border border-[#1a1a1a]" style={{ gridTemplateColumns: `repeat(${displaySteps}, minmax(0, 1fr))` }}>
                  {stepArr.map((st, i) => {
                    const valStr = Array.isArray(st) ? `${st[0]}/${st[1]}` : (st === 0 || !st || st === '0' ? '·' : String(st));
                    const isOdd = Math.floor(i / 4) % 2 !== 0;
                    const isPoint = points.some((p) => p.sectionName === secName && p.roleKey === pupitreKey && p.stepIndex === i);

                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => onCellClick(pupitreKey, i, st)}
                        className={`h-4.5 relative text-[9px] font-mono font-bold flex items-center justify-center cursor-pointer transition-all ${
                          i % 4 === 3 ? 'border-r-2 border-[#1a1a1a]' : 'border-r border-[#1a1a1a]/20'
                        } ${
                          isPoint ? 'ring-2 ring-[#d97706] bg-[#fef3c7] text-[#1a1a1a] z-10' : valStr === '·'
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
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
