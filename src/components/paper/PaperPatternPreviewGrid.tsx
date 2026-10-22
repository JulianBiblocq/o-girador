/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Grille de relecture des motifs avec Beat Shading et Points de Vigilance (< 135 lignes).
 */
import React, { useState } from 'react';
import { PaperStepValue } from '../../types/paperWorkshop.types';
import { resolvePupitreAbbr } from '../../utils/paper/paperNomenclatureHelper';
import { usePaperVigilanceStore } from '../../stores/usePaperVigilanceStore';
import { PaperStepValidationPopover } from './PaperStepValidationPopover';
import { Cloud, Pin, AlertTriangle, Check } from 'lucide-react';

interface Props {
  patterns: Record<string, Partial<Record<string, PaperStepValue[]>>>;
  reusableSections: Set<string>;
  onToggleReusable: (sectionName: string) => void;
  onUpdateStep?: (secName: string, roleKey: string, stepIndex: number, newVal: PaperStepValue) => void;
  lang: 'fr' | 'pt';
}

export const PaperPatternPreviewGrid: React.FC<Props> = ({
  patterns, reusableSections, onToggleReusable, onUpdateStep, lang,
}) => {
  const sectionEntries = Object.entries(patterns);
  const { points, removePoint, togglePoint, clearAll } = usePaperVigilanceStore();
  const [popover, setPopover] = useState<{ sec: string; role: string; idx: number; val: PaperStepValue; isVig: boolean } | null>(null);

  const handleCellClick = (sec: string, role: string, idx: number, val: PaperStepValue) => {
    const isVig = points.some((p) => p.sectionName === sec && p.roleKey === role && p.stepIndex === idx);
    setPopover({ sec, role, idx, val, isVig });
  };

  const handleSelect = (newVal?: PaperStepValue) => {
    if (!popover) return;
    if (newVal !== undefined) onUpdateStep?.(popover.sec, popover.role, popover.idx, newVal);
    const pt = points.find((p) => p.sectionName === popover.sec && p.roleKey === popover.role && p.stepIndex === popover.idx);
    if (pt) removePoint(pt.id);
    setPopover(null);
  };

  return (
    <div className="flex flex-col gap-2 p-2.5 bg-black/5 border border-black/30 font-sans text-xs">
      <div className="flex flex-wrap justify-between items-center border-b border-black/20 pb-1 gap-1">
        <div className="flex items-center gap-2">
          <span className="font-cactus font-bold uppercase text-[11px] text-[#8b2a1a]">
            {lang === 'fr' ? 'Relecture des motifs :' : 'Revisão dos motivos :'}
          </span>
          {points.length > 0 && (
            <span className="px-1.5 py-0.5 bg-[#fef3c7] text-[#b45309] border border-[#d97706] font-bold text-[9px] rounded flex items-center gap-1">
              <AlertTriangle size={10} /> {points.length} {lang === 'fr' ? 'point(s) à vérifier' : 'ponto(s) para rever'}
            </span>
          )}
        </div>
        {points.length > 0 && (
          <button type="button" onClick={clearAll} className="px-2 py-0.5 bg-[#15803d] text-white border border-black font-cactus font-bold text-[10px] uppercase flex items-center gap-1 cursor-pointer shadow-[1px_1px_0px_#000]">
            <Check size={11} /> <span>{lang === 'fr' ? 'Tout valider' : 'Validar tudo'}</span>
          </button>
        )}
      </div>

      <div className="flex flex-col gap-2 max-h-[230px] overflow-y-auto pr-1">
        {sectionEntries.map(([secName, pupitreMap]) => (
          <div key={secName} className="p-2 bg-white border border-black shadow-[1px_1px_0px_#1a1a1a]">
            <div className="flex flex-wrap items-center justify-between gap-1 mb-1.5 pb-1 border-b border-black/10">
              <span className="font-cactus font-bold text-xs uppercase text-[#1a1a1a]">{secName}</span>
              <button
                type="button"
                onClick={() => onToggleReusable(secName)}
                className={`px-2 py-0.5 border font-cactus font-bold text-[10px] flex items-center gap-1 cursor-pointer transition-colors ${
                  reusableSections.has(secName) ? 'bg-[#8b2a1a] text-[#f4ecd8] border-black shadow-[1px_1px_0px_#000]' : 'bg-[#f4ecd8] text-[#1a1a1a] border-black/40 hover:bg-[#eaddcf]'
                }`}
              >
                {reusableSections.has(secName) ? <Cloud size={11} className="shrink-0" /> : <Pin size={11} className="shrink-0" />}
                <span>{reusableSections.has(secName) ? (lang === 'fr' ? 'Bibliothèque' : 'Biblioteca') : (lang === 'fr' ? 'Ce morceau' : 'Esta música')}</span>
              </button>
            </div>

            <div className="flex items-center gap-1 mb-0.5">
              <span className="w-6 shrink-0" />
              <div className="grid grid-cols-4 flex-1 text-[9px] font-cactus font-bold text-[#8b2a1a] text-center">
                <span>T1</span><span>T2</span><span>T3</span><span>T4</span>
              </div>
            </div>

            <div className="flex flex-col gap-1">
              {Object.entries(pupitreMap).map(([pupitreKey, steps]) => {
                const abbr = resolvePupitreAbbr(pupitreKey);
                const isBase = typeof steps === 'string' && (steps === 'base' || steps === 'idem' || steps === '%');
                const stepArr = Array.isArray(steps) ? steps : (isBase ? [] : Array(16).fill(0));

                return (
                  <div key={pupitreKey} className="flex items-center gap-1">
                    <span className="w-6 font-mono font-bold text-[9px] bg-black/10 px-1 py-0.5 text-center shrink-0 border border-black/20">{abbr}</span>
                    {isBase ? (
                      <span className="px-2 py-0.5 bg-[#d99b26]/20 text-[#8b2a1a] border border-[#8b2a1a] font-bold text-[10px]">[ ≡ Base ]</span>
                    ) : (
                      <div className="grid grid-cols-16 flex-1 border border-[#1a1a1a]">
                        {stepArr.map((st, i) => {
                          const valStr = Array.isArray(st) ? `${st[0]}/${st[1]}` : (st === 0 || !st || st === '0' ? '·' : String(st));
                          const isOdd = Math.floor(i / 4) % 2 !== 0;
                          const isPoint = points.some((p) => p.sectionName === secName && p.roleKey === pupitreKey && p.stepIndex === i);

                          return (
                            <button
                              key={i}
                              type="button"
                              onClick={() => handleCellClick(secName, pupitreKey, i, st)}
                              className={`h-4.5 relative text-[9px] font-mono font-bold flex items-center justify-center cursor-pointer transition-all ${
                                i % 4 === 3 ? 'border-r-2 border-[#1a1a1a]' : 'border-r border-[#1a1a1a]/20'
                              } ${
                                isPoint
                                  ? 'ring-2 ring-[#d97706] bg-[#fef3c7] text-[#1a1a1a] z-10'
                                  : valStr === '·'
                                  ? isOdd ? 'bg-[#dfd3b8] text-[#1a1a1a]/30' : 'bg-[#f4ecd8] text-[#1a1a1a]/30'
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
        ))}
      </div>

      {popover && (
        <PaperStepValidationPopover
          roleKey={popover.role}
          stepIndex={popover.idx}
          currentValue={popover.val}
          isVigilance={popover.isVig}
          onValidateCurrent={() => handleSelect()}
          onSelectStroke={(st) => handleSelect(st)}
          onToggleVigilance={() => { togglePoint(popover.sec, popover.role, popover.idx); setPopover(null); }}
          onClose={() => setPopover(null)}
          lang={lang}
        />
      )}
    </div>
  );
};
