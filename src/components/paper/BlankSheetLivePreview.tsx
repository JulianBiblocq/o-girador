/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Aperçu A4 en direct pour les fiches Cordel (< 145 lignes).
 */
import React from 'react';
import { BlankSheetType, GridMode } from '../../types/paperWorkshop.types';
import { resolvePupitreAbbr } from '../../utils/paper/paperNomenclatureHelper';

interface LivePreviewProps {
  sheetType: BlankSheetType; gridMode: GridMode; pupitres: string[];
  includeVarLine: boolean; freeLinesCount: number; conductorMeasures: number;
  conductorTitle?: string; hasDoubleSections?: boolean; hasToadaLine?: boolean; lang: 'fr' | 'pt';
}

export const BlankSheetLivePreview: React.FC<LivePreviewProps> = ({
  sheetType, gridMode, pupitres, includeVarLine, freeLinesCount, conductorMeasures,
  conductorTitle, hasToadaLine, lang,
}) => {
  const isLandscape = gridMode === 'free_landscape' && sheetType !== 'sequence';
  const stepsCount = gridMode === '2/4' ? 8 : (gridMode === '3/4' || gridMode === '12/8' ? 12 : (gridMode === 'free_landscape' ? 32 : (gridMode === 'free_portrait' ? 24 : 16)));
  const titleHeader = sheetType === 'isolated' ? 'Feuille A — Patterns' : sheetType === 'sections' ? 'Feuille B — Multi-Inst' : sheetType === 'sequence' ? 'Feuille C — Conducteur' : 'Feuille D — Universelle';
  const signLabel = gridMode === 'free_portrait' ? '24 pas (Portrait)' : gridMode === 'free_landscape' ? '32 pas (Paysage)' : `Sign : ${gridMode}`;

  const hasVar = pupitres.includes('al') && includeVarLine;
  const rowsPerUnit = pupitres.length + (hasVar ? 1 : 0) + (freeLinesCount || 0);
  const maxLines = isLandscape ? 12 : 14;
  const seriesCount = Math.max(1, Math.min(4, Math.floor(maxLines / Math.max(1, rowsPerUnit))));
  const systemsCount = Math.max(1, Math.min(4, Math.floor(maxLines / Math.max(1, rowsPerUnit + 1))));

  const renderCells = (count: number) => (
    <div className="flex-1 flex divide-x divide-black/30 h-full">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className={`flex-1 ${i % 4 === 0 ? 'bg-black/5' : ''}`} />
      ))}
    </div>
  );

  const renderPupitres = () => (
    <>
      {pupitres.map((p) => (
        <React.Fragment key={p}>
          <div className="flex border border-black/60 bg-white/70 h-2.5 items-center">
            <span className="w-5 font-bold font-mono pl-0.5 bg-black/10 truncate">{resolvePupitreAbbr(p)}</span>
            {renderCells(stepsCount)}
          </div>
          {p === 'al' && hasVar && (
            <div className="flex border border-black/40 bg-white/40 h-2.5 items-center">
              <span className="w-5 font-mono text-[4.5px] pl-0.5 text-gray-600 whitespace-nowrap">↳ Me/Rp</span>
              {renderCells(stepsCount)}
            </div>
          )}
        </React.Fragment>
      ))}
      {Array.from({ length: Math.min(2, freeLinesCount) }, (_, idx) => (
        <div key={`free-${idx}`} className="flex border border-dashed border-black/60 bg-white/50 h-2.5 items-center">
          <span className="w-5 font-mono pl-0.5 text-gray-500">[____]</span>
          {renderCells(stepsCount)}
        </div>
      ))}
    </>
  );

  return (
    <div className="flex flex-col items-center gap-1.5 p-2 bg-black/5 border border-black/20 text-[#1a1a1a] w-full">
      <span className="font-cactus font-bold uppercase text-[10px] text-[#8b2a1a] tracking-wider">
        {lang === 'fr' ? 'Aperçu Direct A4 (Miniature)' : 'Pré-visualização Direta A4 (Miniatura)'}
      </span>
      <div className={`bg-[#f4ecd8] border-2 border-[#1a1a1a] shadow-[3px_3px_0px_#1a1a1a] p-2 flex flex-col justify-between overflow-hidden text-[6.5px] select-none font-sans ${isLandscape ? 'aspect-[1.414/1] max-w-[380px] w-full' : 'aspect-[1/1.414] max-w-[260px] w-full'}`}>
        <div className="border-b border-black pb-1">
          <div className="font-cactus font-bold uppercase tracking-wider text-[8px] text-[#1a1a1a] truncate">{titleHeader}</div>
          <div className="text-[5.5px] text-gray-700 flex justify-between">
            <span>{conductorTitle || 'Morceau / Toada : _________'}</span>
            <span>{signLabel}</span>
          </div>
        </div>

        <div className="flex-1 my-1 overflow-hidden flex flex-col gap-1">
          {sheetType === 'isolated' && (
            <div className="flex flex-col gap-1">
              {Array.from({ length: seriesCount }).map((_, sIdx) => (
                <div key={sIdx} className="flex flex-col gap-0.5">
                  {seriesCount > 1 && (
                    <span className="text-[5px] font-bold text-gray-600 uppercase border-b border-black/20">
                      {lang === 'fr' ? `Motif ${sIdx + 1}` : `Padrão ${sIdx + 1}`}
                    </span>
                  )}
                  {renderPupitres()}
                </div>
              ))}
            </div>
          )}

          {sheetType === 'sections' && (
            <div className="flex flex-col gap-1">
              {Array.from({ length: systemsCount }).map((_, sysIdx) => (
                <div key={sysIdx} className="border border-black p-0.5 bg-white/60">
                  <div className="font-bold text-[5.5px] mb-0.5 flex justify-between">
                    <span>SECTION #{sysIdx + 1} : [ _________ ]</span>
                    <span>♩ = [ ____ ]</span>
                  </div>
                  <div className="flex flex-col gap-0.5">{renderPupitres()}</div>
                </div>
              ))}
            </div>
          )}

          {sheetType === 'sequence' && (
            <div className="grid grid-cols-6 gap-0.5 p-0.5 bg-white/70 border border-black flex-1">
              {Array.from({ length: Math.min(24, conductorMeasures) }, (_, i) => (
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
                {Array.from({ length: isLandscape ? 10 : 13 }, (_, idx) => (
                  <div key={idx} className="flex border border-black/50 bg-white/70 h-2 items-center">
                    <span className="w-4 font-mono text-[4px] border-r border-black/30 pl-0.5 text-gray-500">___</span>
                    {renderCells(isLandscape ? 32 : 24)}
                    <span className="w-2.5 font-mono text-[3.5px] border-l border-black/30 text-center text-gray-400">×_</span>
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
