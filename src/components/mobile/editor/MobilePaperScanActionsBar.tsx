/**
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
  const btnBase = "px-1.5 bg-[var(--cordel-card-btn-bg)] text-[var(--cordel-card-btn-text)] border-2 border-[var(--cordel-border)] font-cactus font-extrabold text-[11px] sm:text-xs uppercase flex items-center justify-center gap-1.5 shadow-[2px_2px_0px_#000] active:translate-y-0.5 cursor-pointer truncate";

  return (
    <div className="flex flex-col gap-2 shrink-0 select-none">
      {/* Ligne 1 : Prendre Photo, Galerie, Fiches Vierges A4 */}
      <div className="grid grid-cols-3 gap-2">
        <button type="button" onClick={onTakePhoto} className={`h-10 ${btnBase}`} title={tMobile(lang, 'takePhoto')}>
          <Camera size={14} className="text-[#b94a2c] shrink-0" />
          <span className="truncate">{tMobile(lang, 'takePhoto')}</span>
        </button>

        <label className={`h-10 ${btnBase}`} title={tMobile(lang, 'gallery')}>
          <ImageIcon size={14} className="text-[#d4a017] shrink-0" />
          <span className="truncate">{tMobile(lang, 'gallery')}</span>
          <input type="file" accept="image/*" className="hidden" />
        </label>

        <button type="button" onClick={onOpenSheets} className={`h-10 ${btnBase}`} title={tMobile(lang, 'blankSheets')}>
          <FileText size={14} className="text-[#2a9d8f] shrink-0" />
          <span className="truncate">{lang === 'fr' ? 'Fiches A4' : 'Fichas A4'}</span>
        </button>
      </div>

      {/* Ligne 2 : Dico et Légende */}
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={onOpenDictionary} className={`h-9.5 ${btnBase}`} title={lang === 'fr' ? 'Dictionnaire de rythmes' : 'Dicionário de ritmos'}>
          <Library size={14} className="text-[#2a9d8f] shrink-0" />
          <span className="truncate">{lang === 'fr' ? 'Dico / Padrões' : 'Dico / Padrões'}</span>
        </button>

        <button type="button" onClick={onOpenLegend} className={`h-9.5 ${btnBase}`} title={lang === 'fr' ? 'Légende des frappes' : 'Legenda dos toques'}>
          <BookOpen size={14} className="text-[#d4af37] shrink-0" />
          <span className="truncate">{lang === 'fr' ? 'Légende' : 'Legenda'}</span>
        </button>
      </div>
    </div>
  );
};
