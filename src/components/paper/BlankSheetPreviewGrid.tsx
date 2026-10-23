/**
 * Rendu modulaire de la grille centrale d'aperçu de fiche vierge (< 100 lignes).
 */
import React from 'react';
import { BlankSheetType } from '../../types/paperWorkshop.types';
import { tPaper } from '../../i18n/paperWorkshopTranslations';

interface BlankSheetPreviewGridProps {
  sheetType: BlankSheetType;
  seriesCount: number;
  systemsCount: number;
  sysCCount: number;
  isLandscape: boolean;
  mCols: number;
  hasDoubleSections?: boolean;
  hasToadaLine?: boolean;
  lang: 'fr' | 'pt';
  renderPupitres: () => React.ReactNode;
  renderCells: (count: number) => React.ReactNode;
}

export const BlankSheetPreviewGrid: React.FC<BlankSheetPreviewGridProps> = ({
  sheetType,
  seriesCount,
  systemsCount,
  sysCCount,
  isLandscape,
  mCols,
  hasDoubleSections,
  hasToadaLine,
  lang,
  renderPupitres,
  renderCells,
}) => {
  if (sheetType === 'isolated') {
    return (
      <div className="flex flex-col flex-1 justify-between gap-1">
        {Array.from({ length: seriesCount }).map((_, sIdx) => (
          <div key={sIdx} className="border border-black p-0.5 bg-white/60 flex-1 flex flex-col justify-between">
            <div className="font-bold text-[5px] mb-0.5 flex justify-between bg-black/5 px-0.5">
              <span>{lang === 'fr' ? `MOTIF #${sIdx + 1}` : `PADRÃO #${sIdx + 1}`}</span>
              <span className="text-[4px] text-gray-500">○ Cloud</span>
            </div>
            <div className="flex flex-col gap-0.5 flex-1 justify-between">{renderPupitres()}</div>
          </div>
        ))}
      </div>
    );
  }

  if (sheetType === 'sections') {
    return (
      <div className="flex flex-col flex-1 justify-between gap-1">
        {Array.from({ length: systemsCount }).map((_, sysIdx) => (
          <div key={sysIdx} className="border border-black p-0.5 bg-white/60 flex-1 flex flex-col justify-between">
            <div className="font-bold text-[5px] mb-0.5 flex justify-between bg-black/5 px-0.5">
              <span>{tPaper(lang, 'previewSection')} #{sysIdx + 1}</span>
              <span className="text-[4px] text-gray-500">○ Cloud</span>
            </div>
            <div className="flex flex-col gap-0.5 flex-1 justify-between">{renderPupitres()}</div>
          </div>
        ))}
      </div>
    );
  }

  if (sheetType === 'sequence') {
    return (
      <div className="flex flex-col flex-1 justify-between gap-1">
        {Array.from({ length: sysCCount }).map((_, sysIdx) => (
          <div key={sysIdx} className={`grid ${isLandscape ? 'grid-cols-6' : 'grid-cols-4'} gap-0.5 flex-1`}>
            {Array.from({ length: mCols }, (__, mIdx) => (
              <div key={mIdx} className="border border-black/50 p-0.5 flex flex-col justify-between bg-white text-[4.5px]">
                <div className="flex justify-between font-bold text-gray-600">
                  <span>M{sysIdx * mCols + mIdx + 1}</span>
                  {hasDoubleSections && <span className="text-[4px] text-red-800">[Sec]</span>}
                </div>
                <span className="text-center font-mono text-[4.5px] text-gray-400">[ ... ]</span>
                {hasToadaLine && <span className="text-[3.5px] text-red-800">Td:__</span>}
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1 flex-1 justify-between">
      {Array.from({ length: isLandscape ? 3 : 4 }).map((_, bIdx) => (
        <div key={bIdx} className="border border-black/60 p-0.5 bg-white/70 flex-1 flex flex-col justify-between">
          <div className="text-[4px] font-bold text-gray-600 border-b border-black/20 pb-0.5 mb-0.5 flex justify-between">
            <span>Padrão / Seção #{bIdx + 1}</span>
            <span>○ Cloud</span>
          </div>
          <div className="flex flex-col gap-0.5 flex-1 justify-between">
            {Array.from({ length: 4 }).map((__, idx) => (
              <div key={idx} className="flex border border-black/40 h-1.5 items-center">
                <span className="w-2.5 font-mono text-[3px] border-r border-black/30 text-center text-gray-400">Inst</span>
                <span className="w-3.5 font-mono text-[3px] border-r border-black/30 pl-0.5 text-gray-500">Var</span>
                {renderCells(isLandscape ? 32 : 24)}
                <span className="w-2.5 font-mono text-[3px] border-l border-black/30 text-center text-gray-400">×_</span>
              </div>
            ))}
          </div>
        </div>
      ))}
      <div className="border-t border-black/30 pt-0.5 flex flex-col gap-0.5 text-[4.5px] text-gray-600">
        <div className="truncate">{tPaper(lang, 'previewSequence')} _________________________________</div>
        <div className="truncate">{tPaper(lang, 'previewToada')} _____________________________________</div>
      </div>
    </div>
  );
};
