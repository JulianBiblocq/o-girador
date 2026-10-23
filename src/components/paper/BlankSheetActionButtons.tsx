/**
 * Barre d'actions et boutons d'impression de l'Atelier Papier (< 75 lignes).
 */
import React from 'react';
import { Printer, BookOpen, Library } from 'lucide-react';
import { tPaper } from '../../i18n/paperWorkshopTranslations';

interface Props {
  onPrint: () => void;
  onOpenDictionary: () => void;
  onOpenLegend: () => void;
  onPrintLegendA4: () => void;
  lang: 'fr' | 'pt';
}

export const BlankSheetActionButtons: React.FC<Props> = ({
  onPrint,
  onOpenDictionary,
  onOpenLegend,
  onPrintLegendA4,
  lang,
}) => {
  return (
    <div className="flex flex-wrap gap-1.5 pt-0.5">
      <button
        type="button"
        onClick={onPrint}
        className="flex-1 min-w-[120px] py-2 px-2.5 bg-[#8b2a1a] text-[#f4ecd8] border-2 border-[var(--cordel-border)] font-cactus font-bold text-xs uppercase flex items-center justify-center gap-1.5 shadow-[2px_2px_0px_var(--cordel-border)] hover:bg-[#6c1f13] cursor-pointer"
      >
        <Printer className="w-4 h-4" /> <span>{tPaper(lang, 'printSheet')}</span>
      </button>

      <button
        type="button"
        onClick={onOpenDictionary}
        className="py-2 px-2.5 bg-[#2a9d8f] text-white border-2 border-[var(--cordel-border)] font-cactus font-bold text-xs uppercase flex items-center justify-center gap-1.5 shadow-[2px_2px_0px_var(--cordel-border)] hover:bg-[#238276] cursor-pointer"
      >
        <Library className="w-4 h-4" /> <span>{lang === 'fr' ? 'Dictionnaire In-App' : 'Dicionário In-App'}</span>
      </button>

      <button
        type="button"
        onClick={onOpenLegend}
        className="py-2 px-2.5 bg-[var(--cordel-card-btn-bg)] text-[var(--cordel-card-btn-text)] border-2 border-[var(--cordel-border)] font-cactus font-bold text-xs uppercase flex items-center justify-center gap-1.5 shadow-[2px_2px_0px_var(--cordel-border)] hover:border-[#8b2a1a] cursor-pointer"
      >
        <BookOpen className="w-4 h-4" /> <span>{tPaper(lang, 'readLegend')}</span>
      </button>

      <button
        type="button"
        onClick={onPrintLegendA4}
        className="py-2 px-2.5 bg-[var(--cordel-card-btn-bg)] text-[var(--cordel-card-btn-text)] border-2 border-[var(--cordel-border)] font-cactus font-bold text-xs uppercase flex items-center justify-center gap-1.5 shadow-[2px_2px_0px_var(--cordel-border)] hover:border-[#8b2a1a] cursor-pointer"
      >
        <Printer className="w-4 h-4" /> <span>{tPaper(lang, 'legendA4')}</span>
      </button>
    </div>
  );
};
