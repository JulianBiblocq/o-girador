/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Aperçu A4 en direct pleine page pour les fiches Cordel (< 140 lignes).
 */
import React from 'react';
import { BlankSheetType, GridMode } from '../../types/paperWorkshop.types';
import { resolvePupitreAbbr } from '../../utils/paper/paperNomenclatureHelper';
import { calculateFeuilleASeriesCount, calculateFeuilleBSectionsCount, calculateFeuilleCSystemsCount, calculateFeuilleDRowsCount } from '../../utils/paper/blankSheetSectionCalculator';
import { tPaper } from '../../i18n/paperWorkshopTranslations';

interface LivePreviewProps {
  sheetType: BlankSheetType; gridMode: GridMode; pupitres: string[];
  includeVarLine: boolean; freeLinesCount: number; conductorMeasures?: number;
  conductorTitle?: string; hasDoubleSections?: boolean; hasToadaLine?: boolean; lang: 'fr' | 'pt';
}

export const BlankSheetLivePreview: React.FC<LivePreviewProps> = ({
  sheetType, gridMode, pupitres, includeVarLine, freeLinesCount,
  conductorTitle, hasDoubleSections, hasToadaLine, lang,
}) => {
  const isLandscape = gridMode === 'free_landscape' && sheetType !== 'sequence';
  const stepsCount = gridMode === '2/4' ? 8 : (gridMode === '3/4' || gridMode === '12/8' ? 12 : (gridMode === 'free_landscape' ? 32 : (gridMode === 'free_portrait' ? 24 : 16)));
  const titleHeader = sheetType === 'isolated' ? (lang === 'fr' ? 'Feuille A — Patterns' : 'Folha A — Padrões') : sheetType === 'sections' ? (lang === 'fr' ? 'Feuille B — Multi-Inst' : 'Folha B — Multi-Inst') : sheetType === 'sequence' ? (lang === 'fr' ? 'Feuille C — Conducteur' : 'Folha C — Sequência') : (lang === 'fr' ? 'Feuille D — Universelle' : 'Folha D — Universal');
  const signLabel = gridMode === 'free_portrait' ? (lang === 'fr' ? '24 pas (Portrait)' : '24 passos (Retrato)') : gridMode === 'free_landscape' ? (lang === 'fr' ? '32 pas (Paysage)' : '32 passos (Paisagem)') : `Sign : ${gridMode}`;

  const hasVar = pupitres.includes('al') && includeVarLine;
  const seriesCount = calculateFeuilleASeriesCount({ pupitresCount: pupitres.length, hasVariationLine: hasVar, freeLinesCount, isLandscape });
  const systemsCount = calculateFeuilleBSectionsCount({ pupitresCount: pupitres.length, hasVariationLine: hasVar, freeLinesCount, isLandscape });
  const sysCCount = calculateFeuilleCSystemsCount(isLandscape), rowsDCount = calculateFeuilleDRowsCount(isLandscape);
  const rowHClass = (systemsCount >= 4 || seriesCount >= 4) ? 'h-2 text-[5px]' : 'h-2.5 text-[6px]';

  const renderCells = (count: number) => (
    <div className="flex-1 flex divide-x divide-black/30 h-full">
      {Array.from({ length: count }, (_, i) => <div key={i} className={`flex-1 ${i % 4 === 0 ? 'bg-black/5' : ''}`} />)}
    </div>
  );

  const renderPupitres = () => (
    <>
      {pupitres.map((p) => (
        <React.Fragment key={p}>
          <div className={`flex border border-black/60 bg-white/70 ${rowHClass} items-center`}>
            <span className="w-5 font-bold font-mono pl-0.5 bg-black/10 truncate">{resolvePupitreAbbr(p)}</span>
            {renderCells(stepsCount)}
          </div>
          {p === 'al' && hasVar && (
            <div className={`flex border border-black/40 bg-white/40 ${rowHClass} items-center`}>
              <span className="w-5 font-mono text-[4px] pl-0.5 text-gray-600 whitespace-nowrap">↳ Me/Rp</span>
              {renderCells(stepsCount)}
            </div>
          )}
        </React.Fragment>
      ))}
      {Array.from({ length: Math.min(2, freeLinesCount) }, (_, idx) => (
        <div key={`free-${idx}`} className={`flex border border-dashed border-black/60 bg-white/50 ${rowHClass} items-center`}>
          <span className="w-5 font-mono pl-0.5 text-gray-500">[____]</span>{renderCells(stepsCount)}
        </div>
      ))}
    </>
  );

  return (
    <div className="flex flex-col items-center gap-1.5 p-2 bg-black/5 border border-black/20 text-[#1a1a1a] w-full">
      <span className="font-cactus font-bold uppercase text-[10px] text-[#8b2a1a] tracking-wider">
        {tPaper(lang, 'directPreviewA4')}
      </span>
      <div className={`bg-[#f4ecd8] border-2 border-[#1a1a1a] shadow-[3px_3px_0px_#1a1a1a] p-2 flex flex-col justify-between overflow-hidden text-[6.5px] select-none font-sans ${isLandscape ? 'aspect-[1.414/1] max-w-[380px] w-full' : 'aspect-[1/1.414] max-w-[260px] w-full'}`}>
        <div className="border-b border-black pb-1 shrink-0">
          <div className="font-cactus font-bold uppercase tracking-wider text-[8px] text-[#1a1a1a] truncate">{titleHeader}</div>
          <div className="text-[5.5px] text-gray-700 flex justify-between">
            <span>{conductorTitle || tPaper(lang, 'previewMorceauPlaceholder')}</span>
            <span>{signLabel}</span>
          </div>
        </div>

        <div className="flex-1 my-1 overflow-hidden flex flex-col justify-between">
          {sheetType === 'isolated' && (
            <div className="flex flex-col flex-1 justify-between gap-1">
              {Array.from({ length: seriesCount }).map((_, sIdx) => (
                <div key={sIdx} className="flex flex-col gap-0.5">
                  {seriesCount > 1 && <span className="text-[5px] font-bold text-gray-600 uppercase border-b border-black/20">{lang === 'fr' ? `Motif ${sIdx + 1}` : `Padrão ${sIdx + 1}`}</span>}
                  {renderPupitres()}
                </div>
              ))}
            </div>
          )}

          {sheetType === 'sections' && (
            <div className="flex flex-col flex-1 justify-between gap-1">
              {Array.from({ length: systemsCount }).map((_, sysIdx) => (
                <div key={sysIdx} className="border border-black p-0.5 bg-white/60 flex-1 flex flex-col justify-between">
                  <div className="font-bold text-[5px] mb-0.5 flex justify-between">
                    <span>{tPaper(lang, 'previewSection')} #{sysIdx + 1} : [ _________ ]</span>
                    <span>♩ = [ ____ ]</span>
                  </div>
                  <div className="flex flex-col gap-0.5">{renderPupitres()}</div>
                </div>
              ))}
            </div>
          )}

          {sheetType === 'sequence' && (
            <div className="flex flex-col flex-1 justify-between gap-1">
              {Array.from({ length: sysCCount }).map((_, sysIdx) => (
                <div key={sysIdx} className="grid grid-cols-6 gap-0.5 flex-1">
                  {Array.from({ length: 6 }, (__, mIdx) => (
                    <div key={mIdx} className="border border-black/50 p-0.5 flex flex-col justify-between bg-white text-[4.5px]">
                      <div className="flex justify-between font-bold text-gray-600">
                        <span>M{sysIdx * 6 + mIdx + 1}</span>
                        {hasDoubleSections && <span className="text-[4px] text-red-800">[Sec]</span>}
                      </div>
                      <span className="text-center font-mono text-[4px] text-gray-400">[ ... ]</span>
                      {hasToadaLine && <span className="text-[3.5px] text-red-800">Td:__</span>}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}

          {sheetType === 'universal' && (
            <div className="flex flex-col gap-0.5 flex-1 justify-between">
              {Array.from({ length: rowsDCount }).map((_, idx) => (
                <div key={idx} className="flex border border-black/50 bg-white/70 h-1.5 items-center">
                  <span className="w-3.5 font-mono text-[3.5px] border-r border-black/30 pl-0.5 text-gray-500">___</span>
                  {renderCells(isLandscape ? 32 : 24)}
                  <span className="w-2.5 font-mono text-[3px] border-l border-black/30 text-center text-gray-400">×_</span>
                </div>
              ))}
              <div className="border-t border-black/30 pt-0.5 flex flex-col gap-0.5 text-[4.5px] text-gray-600">
                <div className="truncate">{tPaper(lang, 'previewSequence')} _________________________________</div>
                <div className="truncate">{tPaper(lang, 'previewToada')} _____________________________________</div>
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-black/40 pt-0.5 text-[5px] text-gray-600 font-mono truncate shrink-0">
          {tPaper(lang, 'previewMemo')}
        </div>
      </div>
    </div>
  );
};

