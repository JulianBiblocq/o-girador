/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Grille de relecture des motifs avec Beat Shading 4x4 et Points de Vigilance (< 135 lignes).
 */
import React from 'react';
import { PaperStepValue } from '../../types/paperWorkshop.types';
import { resolvePupitreAbbr } from '../../utils/paper/paperNomenclatureHelper';
import { usePaperVigilanceStore } from '../../stores/usePaperVigilanceStore';
import { Cloud, Pin, AlertTriangle } from 'lucide-react';

interface Props {
  patterns: Record<string, Partial<Record<string, PaperStepValue[]>>>;
  reusableSections: Set<string>;
  onToggleReusable: (sectionName: string) => void;
  lang: 'fr' | 'pt';
}

export const PaperPatternPreviewGrid: React.FC<Props> = ({
  patterns, reusableSections, onToggleReusable, lang,
}) => {
  const sectionEntries = Object.entries(patterns);
  const vigilancePoints = usePaperVigilanceStore((state) => state.points);
  const togglePoint = usePaperVigilanceStore((state) => state.togglePoint);

  return (
    <div className="flex flex-col gap-2 p-2.5 bg-black/5 border border-black/30 font-sans text-xs">
      {/* En-tête global avec statut des points de vigilance */}
      <div className="flex justify-between items-center border-b border-black/20 pb-1">
        <div className="flex items-center gap-2">
          <span className="font-cactus font-bold uppercase text-[11px] text-[#8b2a1a]">
            {lang === 'fr' ? 'Relecture des motifs :' : 'Revisão dos motivos :'}
          </span>
          {vigilancePoints.length > 0 && (
            <span className="px-1.5 py-0.5 bg-[#fef3c7] text-[#b45309] border border-[#d97706] font-bold text-[9px] rounded flex items-center gap-1 animate-pulse">
              <AlertTriangle size={10} /> {vigilancePoints.length} {lang === 'fr' ? 'point(s) à vérifier' : 'ponto(s) para rever'}
            </span>
          )}
        </div>
        <span className="text-[10px] text-gray-600 italic">
          {lang === 'fr' ? 'Clic = marquer un point de vigilance' : 'Clique = marcar ponto de vigilância'}
        </span>
      </div>

      <div className="flex flex-col gap-2 max-h-[230px] overflow-y-auto pr-1">
        {sectionEntries.map(([secName, pupitreMap]) => {
          const isReusable = reusableSections.has(secName);
          return (
            <div key={secName} className="p-2 bg-white border border-black shadow-[1px_1px_0px_#1a1a1a]">
              {/* En-tête de Section */}
              <div className="flex flex-wrap items-center justify-between gap-1 mb-1.5 pb-1 border-b border-black/10">
                <span className="font-cactus font-bold text-xs uppercase text-[#1a1a1a]">{secName}</span>
                <button
                  type="button"
                  onClick={() => onToggleReusable(secName)}
                  className={`px-2 py-0.5 border font-cactus font-bold text-[10px] flex items-center gap-1 cursor-pointer transition-colors ${
                    isReusable ? 'bg-[#8b2a1a] text-[#f4ecd8] border-black shadow-[1px_1px_0px_#000]' : 'bg-[#f4ecd8] text-[#1a1a1a] border-black/40 hover:bg-[#eaddcf]'
                  }`}
                >
                  {isReusable ? <Cloud size={11} className="shrink-0" /> : <Pin size={11} className="shrink-0" />}
                  <span>{isReusable ? (lang === 'fr' ? '☁️ Bibliothèque' : '☁️ Biblioteca') : (lang === 'fr' ? '📌 Ce morceau' : '📌 Esta música')}</span>
                </button>
              </div>

              {/* Barre des En-têtes de Temps : T1, T2, T3, T4 */}
              <div className="flex items-center gap-1 mb-0.5">
                <span className="w-6 shrink-0" />
                <div className="grid grid-cols-4 flex-1 text-[9px] font-cactus font-bold text-[#8b2a1a] text-center">
                  <span>T1</span><span>T2</span><span>T3</span><span>T4</span>
                </div>
              </div>

              {/* Lignes de pupitres avec Beat Shading 4x4 */}
              <div className="flex flex-col gap-1">
                {Object.entries(pupitreMap).map(([pupitreKey, steps]) => {
                  const abbr = resolvePupitreAbbr(pupitreKey);
                  const isBase = typeof steps === 'string' && (steps === 'base' || steps === 'idem' || steps === '%');
                  const stepArr = Array.isArray(steps) ? steps : (isBase ? [] : Array(16).fill(0));

                  return (
                    <div key={pupitreKey} className="flex items-center gap-1">
                      <span className="w-6 font-mono font-bold text-[9px] bg-black/10 px-1 py-0.5 text-center shrink-0 border border-black/20">
                        {abbr}
                      </span>
                      {isBase ? (
                        <span className="px-2 py-0.5 bg-[#d99b26]/20 text-[#8b2a1a] border border-[#8b2a1a] font-bold text-[10px] rounded-xs">
                          [ ≡ Base ]
                        </span>
                      ) : (
                        <div className="grid grid-cols-16 flex-1 border border-[#1a1a1a]">
                          {stepArr.map((st, i) => {
                            const valStr = Array.isArray(st) ? `${st[0]}/${st[1]}` : (st === 0 || !st || st === '0' ? '·' : String(st));
                            const isSilent = valStr === '·';
                            const beatIdx = Math.floor(i / 4);
                            const isOddBeat = beatIdx % 2 !== 0; // Beat 2 (idx 1) et Beat 4 (idx 3)
                            const isEndOfBeat = i % 4 === 3;
                            const isPointMarked = vigilancePoints.some(
                              (p) => p.sectionName === secName && p.roleKey === pupitreKey && p.stepIndex === i
                            );

                            return (
                              <button
                                key={i}
                                type="button"
                                onClick={() => togglePoint(secName, pupitreKey, i)}
                                title={isPointMarked ? (lang === 'fr' ? 'Point de vigilance actif (clic pour retirer)' : 'Ponto ativo') : (lang === 'fr' ? 'Poser un point de vigilance' : 'Marcar ponto')}
                                className={`h-4.5 text-[9px] font-mono font-bold flex items-center justify-center cursor-pointer transition-all ${
                                  isEndOfBeat ? 'border-r-2 border-[#1a1a1a]' : 'border-r border-[#1a1a1a]/20'
                                } ${
                                  isPointMarked
                                    ? 'ring-2 ring-[#d97706] bg-[#fef3c7] text-[#b45309] z-10'
                                    : isSilent
                                    ? isOddBeat
                                      ? 'bg-[#dfd3b8] text-[#1a1a1a]/30'
                                      : 'bg-[#f4ecd8] text-[#1a1a1a]/30'
                                    : 'bg-[#8b2a1a] text-[#f4ecd8]'
                                }`}
                              >
                                {isPointMarked ? '⚠️' : valStr}
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
        })}
      </div>
    </div>
  );
};
