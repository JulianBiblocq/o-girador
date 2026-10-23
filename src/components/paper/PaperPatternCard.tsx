/**
 * Carte d'un motif individuel dans la grille de relecture avec métrique et BPM (< 125 lignes).
 */
import React from 'react';
import { PaperStepValue, PatternMetricOverride } from '../../types/paperWorkshop.types';
import { resolvePupitreAbbr } from '../../utils/paper/paperNomenclatureHelper';
import { Cloud, Pin, AlertTriangle, Settings2 } from 'lucide-react';

interface Props {
  secName: string;
  pupitreMap: Partial<Record<string, PaperStepValue[]>>;
  isReusable: boolean;
  onToggleReusable: () => void;
  points: any[];
  onCellClick: (role: string, idx: number, val: PaperStepValue) => void;
  globalBpm: number;
  globalTimeSig: string;
  override?: PatternMetricOverride;
  onOpenOverrideModal: () => void;
  lang: 'fr' | 'pt';
}

export const PaperPatternCard: React.FC<Props> = ({
  secName, pupitreMap, isReusable, onToggleReusable, points, onCellClick,
  globalBpm, globalTimeSig, override, onOpenOverrideModal, lang,
}) => {
  const isFr = lang === 'fr';
  const displaySig = override?.timeSignature || globalTimeSig || '4/4';
  const displaySteps = override?.steps || 16;
  const displayBpm = override?.bpm || globalBpm;
  const isOverridden = Boolean(override?.isLocked || override?.bpm || override?.timeSignature);

  return (
    <div className="p-2 bg-[#fdfbf7] dark:bg-[#fdfbf7] border border-[#1a1a1a] shadow-[1px_1px_0px_#1a1a1a]">
      {/* 1. EN-TÊTE MOTIF & BADGES */}
      <div className="flex flex-wrap items-center justify-between gap-1 mb-1.5 pb-1 border-b border-black/10">
        <div className="flex items-center gap-1.5">
          <span className="font-cactus font-bold text-xs uppercase !text-[#1a1a1a]">{secName}</span>
          <span className={`px-1.5 py-0.2 font-mono text-[9px] font-bold border ${isOverridden ? 'bg-[#8b2a1a] text-[#f4ecd8] border-black' : 'bg-black/10 text-black/80 border-black/30'}`}>
            {displaySig} ({displaySteps}p)
          </span>
          <span className="font-mono text-[9px] text-[#8b2a1a] font-bold">BPM={displayBpm}</span>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onOpenOverrideModal}
            title={isFr ? 'Modifier ce pattern seul (BPM, Signature)' : 'Ajustar este padrão'}
            className="p-1 bg-[#f4ecd8] hover:bg-[#8b2a1a] hover:text-[#f4ecd8] border border-black/40 text-[10px] cursor-pointer flex items-center gap-1"
          >
            <Settings2 size={11} />
            <span className="font-cactus font-bold text-[9px]">{isFr ? 'Régler' : 'Ajustar'}</span>
          </button>

          <button
            type="button"
            onClick={onToggleReusable}
            className={`px-2 py-0.5 border font-cactus font-bold text-[10px] flex items-center gap-1 cursor-pointer transition-colors ${
              isReusable ? 'bg-[#8b2a1a] text-[#f4ecd8] border-black shadow-[1px_1px_0px_#000]' : 'bg-[#f4ecd8] !text-[#1a1a1a] border-black/40 hover:bg-[#eaddcf]'
            }`}
          >
            {isReusable ? <Cloud size={11} className="shrink-0" /> : <Pin size={11} className="shrink-0" />}
            <span>{isReusable ? (isFr ? 'Bibliothèque' : 'Biblioteca') : (isFr ? 'Ce morceau' : 'Esta música')}</span>
          </button>
        </div>
      </div>

      {/* 2. REPERES DE TEMPS */}
      <div className="flex items-center gap-1 mb-0.5">
        <span className="w-6 shrink-0" />
        <div className="grid grid-cols-4 flex-1 text-[9px] font-cactus font-bold text-[#8b2a1a] text-center">
          <span>T1</span><span>T2</span><span>T3</span><span>T4</span>
        </div>
      </div>

      {/* 3. LIGNES PUPITRES */}
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
                <div className={`grid grid-cols-${displaySteps > 16 ? '32' : '16'} flex-1 border border-[#1a1a1a]`}>
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
