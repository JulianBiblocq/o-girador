/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Barre d'actions rapides supérieure pour MobilePaperScanTab (< 65 lignes).
 */
import React from 'react';
import { Camera, Image as ImageIcon, FileText, BookOpen, Library } from 'lucide-react';
import { tMobile } from '../../../i18n/mobileTranslations';

interface Props {
  onTakePhoto: () => void;
  onOpenSheets: () => void;
  onOpenLegend: () => void;
  onOpenDictionary: () => void;
  lang: 'fr' | 'pt';
}

export const MobilePaperScanActionsBar: React.FC<Props> = ({
  onTakePhoto,
  onOpenSheets,
  onOpenLegend,
  onOpenDictionary,
  lang,
}) => {
  const btnBase = "h-9 px-0.5 bg-[var(--cordel-card-btn-bg)] text-[var(--cordel-card-btn-text)] border-2 border-[var(--cordel-border)] font-cactus font-bold text-[9px] uppercase flex items-center justify-center gap-1 shadow-[2px_2px_0px_#000] active:translate-y-0.5 cursor-pointer";

  return (
    <div className="grid grid-cols-5 gap-1 shrink-0">
      <button type="button" onClick={onTakePhoto} className={btnBase}>
        <Camera size={12} className="text-[#b94a2c]" />
        <span className="truncate">{tMobile(lang, 'takePhoto')}</span>
      </button>

      <label className={btnBase}>
        <ImageIcon size={12} className="text-[#d4a017]" />
        <span className="truncate">{tMobile(lang, 'gallery')}</span>
        <input type="file" accept="image/*" className="hidden" />
      </label>

      <button type="button" onClick={onOpenSheets} className={btnBase}>
        <FileText size={12} className="text-[#2a9d8f]" />
        <span className="truncate">{tMobile(lang, 'blankSheets')}</span>
      </button>

      <button type="button" onClick={onOpenDictionary} className={btnBase}>
        <Library size={12} className="text-[#2a9d8f]" />
        <span className="truncate">{lang === 'fr' ? 'Dico' : 'Dicion.'}</span>
      </button>

      <button type="button" onClick={onOpenLegend} className={btnBase}>
        <BookOpen size={12} className="text-[#d4af37]" />
        <span className="truncate">{lang === 'fr' ? 'Légende' : 'Legenda'}</span>
      </button>
    </div>
  );
};
