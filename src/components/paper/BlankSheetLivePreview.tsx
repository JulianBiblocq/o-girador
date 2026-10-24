/**
 * Aperçu A4 en direct pleine page pour les fiches Cordel (< 95 lignes).
 */
import React from 'react';
import { BlankSheetType, GridMode } from '../../types/paperWorkshop.types';
import { resolvePupitreAbbr } from '../../utils/paper/paperNomenclatureHelper';
import { calculateFeuilleASeriesCount, calculateFeuilleBSectionsCount, calculateFeuilleCSystemsCount } from '../../utils/paper/blankSheetSectionCalculator';
import { formatGridModeSignLabel, getGridStepsCount } from '../../utils/paper/paperGridModeHelper';
import { tPaper } from '../../i18n/paperWorkshopTranslations';
import { BlankSheetPreviewGrid } from './BlankSheetPreviewGrid';

interface LivePreviewProps {
  sheetType: BlankSheetType; gridMode: GridMode; pupitres: string[];
  includeVarLine: boolean; freeLinesCount: number; conductorMeasures?: number;
  conductorTitle?: string; hasDoubleSections?: boolean; hasToadaLine?: boolean; lang: 'fr' | 'pt';
}

export const BlankSheetLivePreview: React.FC<LivePreviewProps> = ({
  sheetType, gridMode, pupitres, includeVarLine, freeLinesCount,
  conductorTitle, hasDoubleSections, hasToadaLine, lang,
}) => {
  const isLandscape = sheetType === 'grid32' || (gridMode === 'free_landscape' && sheetType !== 'sequence');
  const stepsCount = getGridStepsCount(gridMode);
  const titleHeader = sheetType === 'grid32' ? (lang === 'fr' ? 'Grille 32×25 — Fiche Unique A4' : 'Grelha 32×25 — Folha Única A4') : sheetType === 'isolated' ? (lang === 'fr' ? 'Feuille A — Patterns' : 'Folha A — Padrões') : sheetType === 'sections' ? (lang === 'fr' ? 'Feuille B — Multi-Inst' : 'Folha B — Multi-Inst') : sheetType === 'sequence' ? (lang === 'fr' ? 'Feuille C — Conducteur' : 'Folha C — Sequência') : sheetType === 'dictionary' ? (lang === 'fr' ? 'Fiche Dictionnaire A4' : 'Folha Dicionário A4') : (lang === 'fr' ? 'Feuille D — Universelle' : 'Folha D — Universal');
  const signLabel = formatGridModeSignLabel(gridMode, lang);

  const hasVar = pupitres.includes('al') && includeVarLine;
  const seriesCount = calculateFeuilleASeriesCount({ pupitresCount: pupitres.length, hasVariationLine: hasVar, freeLinesCount, isLandscape });
  const systemsCount = calculateFeuilleBSectionsCount({ pupitresCount: pupitres.length, hasVariationLine: hasVar, freeLinesCount, isLandscape });
  const sysCCount = calculateFeuilleCSystemsCount(isLandscape);
  const rowHClass = (systemsCount >= 4 || seriesCount >= 4) ? 'h-2 text-[5px]' : 'h-2.5 text-[6px]';
  const beatStep = gridMode === '12/8' ? 3 : 4;
  const mCols = isLandscape ? 6 : 4;

  const renderCells = (count: number) => (
    <div className="flex-1 flex divide-x divide-black/30 h-full">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className={`flex-1 ${i % beatStep === 0 ? 'bg-black/10' : ''}`} />
      ))}
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
      <span className="font-cactus font-bold uppercase text-[10px] text-[#f59e0b] tracking-wider">
        {tPaper(lang, 'directPreviewA4')}
      </span>
      <div className={`bg-[#f4ecd8] border-2 border-[#1a1a1a] shadow-[3px_3px_0px_#1a1a1a] p-2 flex flex-col justify-between overflow-hidden text-[6.5px] select-none font-sans ${isLandscape ? 'aspect-[1.414/1] max-w-[380px] w-full' : 'aspect-[1/1.414] max-w-[260px] w-full'}`}>
        <div className="border-b border-black pb-1 shrink-0">
          <div className="font-cactus font-bold uppercase tracking-wider text-[8px] text-[#1a1a1a] truncate">{titleHeader}</div>
          <div className="text-[5.5px] text-gray-700 flex justify-between">
            <span>{conductorTitle || tPaper(lang, 'previewMorceauPlaceholder')}</span>
            <span>Sign : {signLabel}</span>
          </div>
        </div>

        <div className="flex-1 my-1 overflow-hidden flex flex-col justify-between">
          <BlankSheetPreviewGrid
            sheetType={sheetType} seriesCount={seriesCount} systemsCount={systemsCount} sysCCount={sysCCount}
            isLandscape={isLandscape} mCols={mCols} hasDoubleSections={hasDoubleSections} hasToadaLine={hasToadaLine}
            lang={lang} renderPupitres={renderPupitres} renderCells={renderCells}
          />
        </div>

        <div className="border-t border-black/40 pt-0.5 text-[5px] text-gray-600 font-mono truncate shrink-0">
          {tPaper(lang, 'previewMemo')}
        </div>
      </div>
    </div>
  );
};
