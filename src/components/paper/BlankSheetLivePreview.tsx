/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Aperçu A4 en direct pour les fiches Cordel (< 145 lignes).
 */
import React from 'react';
import { BlankSheetType, GridMode } from '../../types/paperWorkshop.types';
import { resolvePupitreAbbr } from '../../utils/paper/paperNomenclatureHelper';

interface LivePreviewProps {
  sheetType: BlankSheetType;
  gridMode: GridMode;
  pupitres: string[];
  includeVarLine: boolean;
  freeLinesCount: number;
  conductorMeasures: number;
  conductorTitle?: string;
  hasDoubleSections?: boolean;
  hasToadaLine?: boolean;
  lang: 'fr' | 'pt';
}

export const BlankSheetLivePreview: React.FC<LivePreviewProps> = ({
  sheetType, gridMode, pupitres, includeVarLine, freeLinesCount, conductorMeasures,
  conductorTitle, hasDoubleSections, hasToadaLine, lang,
}) => {
  const stepsCount = gridMode === '2/4' ? 8 : (gridMode === '3/4' || gridMode === '12/8' ? 12 : (gridMode === 'free_landscape' ? 32 : 16));
  const titleHeader = sheetType === 'isolated' ? 'Feuille A — Patterns' : sheetType === 'sections' ? 'Feuille B — Multi-Inst' : sheetType === 'sequence' ? 'Feuille C — Conducteur' : 'Feuille D — Universelle';

  return (
    <div className="flex flex-col items-center gap-1.5 p-2 bg-black/5 border border-black/20 text-[#1a1a1a]">
      <span className="font-cactus font-bold uppercase text-[10px] text-[#8b2a1a] tracking-wider">
        {lang === 'fr' ? 'Aperçu Direct A4 (Miniature)' : 'Pré-visualização Direta A4 (Miniatura)'}
      </span>
      <div className="w-[200px] h-[280px] bg-[#f4ecd8] border-2 border-[#1a1a1a] shadow-[3px_3px_0px_#1a1a1a] p-2 flex flex-col justify-between overflow-hidden text-[6.5px] select-none font-sans">
        <div className="border-b border-black pb-1">
          <div className="font-cactus font-bold uppercase tracking-wider text-[8px] text-[#1a1a1a] truncate">
            {titleHeader}
          </div>
          <div className="text-[5.5px] text-gray-700 flex justify-between">
            <span>{conductorTitle || 'Morceau / Toada : _________'}</span>
            <span>{gridMode}</span>
          </div>
        </div>

        <div className="flex-1 my-1 overflow-hidden flex flex-col gap-1">
          {sheetType === 'isolated' && (
            <div className="flex flex-col gap-0.5">
              {pupitres.slice(0, 7).map((p) => (
                <div key={p} className="flex border border-black/60 bg-white/70 h-3 items-center">
                  <span className="w-5 font-bold font-mono pl-0.5 bg-black/10 truncate">{resolvePupitreAbbr(p)}</span>
                  <div className="flex-1 flex divide-x divide-black/30 h-full">
                    {Array.from({ length: stepsCount }).map((_, i) => (
                      <div key={i} className={`flex-1 ${i % 4 === 0 ? 'bg-black/5' : ''}`} />
                    ))}
                  </div>
                </div>
              ))}
              {pupitres.includes('al') && includeVarLine && (
                <div className="flex border border-black/40 bg-white/40 h-2.5 items-center">
                  <span className="w-5 font-mono text-[5px] pl-0.5 text-gray-600">↳ Me/Rp</span>
                  <div className="flex-1 flex divide-x divide-black/20 h-full">
                    {Array.from({ length: stepsCount }).map((_, i) => (<div key={i} className="flex-1" />))}
                  </div>
                </div>
              )}
              {Array.from({ length: Math.min(3, freeLinesCount) }).map((_, idx) => (
                <div key={`free-${idx}`} className="flex border border-dashed border-black/60 bg-white/50 h-3 items-center">
                  <span className="w-5 font-mono pl-0.5 text-gray-500">[____]</span>
                  <div className="flex-1 flex divide-x divide-black/30 h-full">
                    {Array.from({ length: stepsCount }).map((_, i) => (<div key={i} className="flex-1" />))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {sheetType === 'sections' && (
            <div className="flex flex-col gap-1">
              {[1, 2, 3].map((sys) => (
                <div key={sys} className="border border-black p-0.5 bg-white/60">
                  <div className="font-bold text-[5.5px] mb-0.5 flex justify-between">
                    <span>SECTION #{sys} : [ _________ ]</span>
                    <span>♩ = [ ____ ]</span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    {pupitres.slice(0, 3).map((p) => (
                      <div key={p} className="flex border border-black/50 h-2.5 items-center">
                        <span className="w-4 font-mono text-[5.5px] bg-black/10 pl-0.5">{resolvePupitreAbbr(p)}</span>
                        <div className="flex-1 flex divide-x divide-black/30 h-full">
                          {Array.from({ length: stepsCount }).map((_, i) => (<div key={i} className="flex-1" />))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {sheetType === 'sequence' && (
            <div className="grid grid-cols-6 gap-0.5 p-0.5 bg-white/70 border border-black flex-1">
              {Array.from({ length: Math.min(24, conductorMeasures) }).map((_, i) => (
                <div key={i} className="border border-black/50 h-4 p-0.5 flex flex-col justify-between bg-white text-[5px]">
                  <span className="font-bold text-gray-600">M{i + 1}</span>
                  <span className="text-center font-mono text-[4.5px] text-gray-400">[ ... ]</span>
                  {hasToadaLine && <span className="text-[4px] text-red-800">Td:__</span>}
                </div>
              ))}
            </div>
          )}

          {sheetType === 'universal' && (
            <div className="flex flex-col gap-0.5 flex-1 justify-between">
              <div className="flex flex-col gap-0.5">
                {Array.from({ length: 8 }).map((_, idx) => (
                  <div key={idx} className="flex border border-black/50 bg-white/70 h-2.5 items-center">
                    <span className="w-4 font-mono text-[4.5px] border-r border-black/30 pl-0.5 text-gray-500">___</span>
                    <div className="flex-1 flex divide-x divide-black/20 h-full">
                      {Array.from({ length: 16 }).map((_, i) => (
                        <div key={i} className={`flex-1 ${i % 4 === 0 ? 'bg-black/5' : ''}`} />
                      ))}
                    </div>
                    <span className="w-2.5 font-mono text-[4px] border-l border-black/30 text-center text-gray-400">×_</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-black/30 pt-0.5 flex flex-col gap-0.5 text-[4.5px] text-gray-600">
                <div className="truncate">Séquence : _________________________________</div>
                <div className="truncate">Toada : _____________________________________</div>
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-black/40 pt-0.5 text-[5px] text-gray-600 font-mono truncate">
          MÉMO : [D/d] Dir  [E/e] Esq  [G/A] Gonguê  [P/T] Mineiro  [||] Fin
        </div>
      </div>
    </div>
  );
};
