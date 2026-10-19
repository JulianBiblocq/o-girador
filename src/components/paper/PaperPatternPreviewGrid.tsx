/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Grille de relecture des patterns décodés et sélection des sections réutilisables (< 140 lignes).
 */
import React from 'react';
import { PaperStepValue } from '../../types/paperWorkshop.types';
import { resolvePupitreAbbr } from '../../utils/paper/paperNomenclatureHelper';
import { Cloud, Pin } from 'lucide-react';

interface Props {
  patterns: Record<string, Partial<Record<string, PaperStepValue[]>>>;
  reusableSections: Set<string>;
  onToggleReusable: (sectionName: string) => void;
  onStepChange?: (sectionName: string, pupitre: string, stepIdx: number, val: PaperStepValue) => void;
  lang: 'fr' | 'pt';
}

const CYCLE_STROKES = ['0', 'D', 'd', 'E', 'e', 'G', 'A', 'P', 'T'];

export const PaperPatternPreviewGrid: React.FC<Props> = ({
  patterns, reusableSections, onToggleReusable, onStepChange, lang,
}) => {
  const sectionEntries = Object.entries(patterns);

  const cycleStep = (sec: string, pup: string, idx: number, curVal: PaperStepValue) => {
    if (!onStepChange) return;
    const str = String(Array.isArray(curVal) ? curVal[0] : (curVal === 0 ? '0' : curVal)).toUpperCase();
    const curIdx = CYCLE_STROKES.indexOf(str);
    const nextVal = CYCLE_STROKES[(curIdx + 1) % CYCLE_STROKES.length];
    onStepChange(sec, pup, idx, nextVal === '0' ? 0 : nextVal);
  };

  return (
    <div className="flex flex-col gap-2 p-2.5 bg-black/5 border border-black/30 font-sans text-xs">
      <div className="flex justify-between items-center border-b border-black/20 pb-1">
        <span className="font-cactus font-bold uppercase text-[11px] text-[#8b2a1a]">
          {lang === 'fr' ? 'Relecture des motifs & Sauvegarde sélective :' : 'Revisão dos motivos & Salvamento seletivo :'}
        </span>
        <span className="text-[10px] text-gray-600 italic">
          {lang === 'fr' ? 'Cliquez sur une frappe pour corriger' : 'Clique no toque para corrigir'}
        </span>
      </div>

      <div className="flex flex-col gap-2 max-h-[220px] overflow-y-auto pr-1">
        {sectionEntries.map(([secName, pupitreMap]) => {
          const isReusable = reusableSections.has(secName);
          return (
            <div key={secName} className="p-2 bg-white border border-black shadow-[1px_1px_0px_#1a1a1a]">
              {/* En-tête de Section avec bascule sélective */}
              <div className="flex flex-wrap items-center justify-between gap-1 mb-1.5 pb-1 border-b border-black/10">
                <span className="font-cactus font-bold text-xs uppercase text-[#1a1a1a]">{secName}</span>
                <button
                  type="button"
                  onClick={() => onToggleReusable(secName)}
                  className={`px-2 py-0.5 border font-cactus font-bold text-[10px] flex items-center gap-1 cursor-pointer transition-colors ${
                    isReusable ? 'bg-[#8b2a1a] text-[#f4ecd8] border-black shadow-[1px_1px_0px_#000]' : 'bg-[#f4ecd8] text-[#1a1a1a] border-black/40 hover:bg-[#eaddcf]'
                  }`}
                  title={isReusable ? 'Enregistrée dans mes Sections Réutilisables' : 'Enregistrée uniquement dans ce morceau'}
                >
                  {isReusable ? <Cloud size={11} className="shrink-0" /> : <Pin size={11} className="shrink-0" />}
                  <span>
                    {isReusable
                      ? (lang === 'fr' ? '☁️ Réutilisable (Bibliothèque)' : '☁️ Seção Reutilizável')
                      : (lang === 'fr' ? '📌 Ce morceau uniquement' : '📌 Apenas nesta música')}
                  </span>
                </button>
              </div>

              {/* Lignes de pupitres de la section */}
              <div className="flex flex-col gap-1">
                {Object.entries(pupitreMap).map(([pupitreKey, steps]) => {
                  const abbr = resolvePupitreAbbr(pupitreKey);
                  const isBase = typeof steps === 'string' && (steps === 'base' || steps === 'idem');
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
                        <div className="grid grid-cols-16 gap-[1px] flex-1 bg-black/20 p-[1px]">
                          {stepArr.map((st, i) => {
                            const valStr = Array.isArray(st) ? `${st[0]}/${st[1]}` : (st === 0 || !st ? '·' : String(st));
                            const isSilent = valStr === '·' || valStr === '0';
                            const isQuarter = i % 4 === 0;
                            return (
                              <button
                                key={i}
                                type="button"
                                onClick={() => cycleStep(secName, pupitreKey, i, st)}
                                className={`h-4 text-[9px] font-mono font-bold flex items-center justify-center cursor-pointer transition-colors ${
                                  isSilent ? (isQuarter ? 'bg-stone-200 text-stone-400' : 'bg-white text-stone-300') : 'bg-[#8b2a1a] text-[#f4ecd8]'
                                }`}
                              >
                                {valStr}
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
