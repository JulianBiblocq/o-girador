/**
 * Sélecteur de Mode 1 (100% Vierge) vs Mode 2 (Pupitres Pré-remplis) pour Grille 32x25 (< 70 lignes).
 */
import React from 'react';
import { PenTool, Sliders } from 'lucide-react';
import { tPaper } from '../../i18n/paperWorkshopTranslations';

interface Props {
  grid32Mode: 'blank' | 'prefill';
  onChangeMode: (m: 'blank' | 'prefill') => void;
  lang: 'fr' | 'pt';
}

export const BlankSheetGrid32ModeSelector: React.FC<Props> = ({ grid32Mode, onChangeMode, lang }) => {
  return (
    <div className="flex flex-col gap-1.5 p-2.5 bg-[var(--cordel-surface)] border-2 border-[var(--cordel-border)]">
      <div className="flex flex-wrap items-center justify-between gap-1">
        <label className="font-cactus font-bold uppercase text-[11px] text-[#f59e0b] flex items-center gap-1.5">
          <PenTool className="w-3.5 h-3.5" />
          <span>{tPaper(lang, 'grid32Type')}</span>
        </label>
        <span className="text-[10px] text-[var(--cordel-text-muted)] italic">
          {tPaper(lang, 'grid32Notice')}
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
        <button
          type="button"
          onClick={() => onChangeMode('blank')}
          className={`p-2 text-left border-2 cursor-pointer shadow-[2px_2px_0px_var(--cordel-border)] flex items-center gap-2 ${
            grid32Mode === 'blank'
              ? 'bg-[#8b2a1a] text-[#f4ecd8] font-bold border-[var(--cordel-border)]'
              : 'bg-[var(--cordel-card-btn-bg)] text-[var(--cordel-card-btn-text)] font-semibold border-[var(--cordel-border)]'
          }`}
        >
          <PenTool className="w-4 h-4 flex-shrink-0" />
          <div>
            <div className="font-bold text-[11px]">{tPaper(lang, 'grid32ModeBlank')}</div>
            <div className="text-[9.5px] opacity-80">
              {lang === 'fr' ? '25 lignes vierges sans pupitres. Tout au stylo.' : '25 linhas em branco sem naipes. Tudo à caneta.'}
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onChangeMode('prefill')}
          className={`p-2 text-left border-2 cursor-pointer shadow-[2px_2px_0px_var(--cordel-border)] flex items-center gap-2 ${
            grid32Mode === 'prefill'
              ? 'bg-[#8b2a1a] text-[#f4ecd8] font-bold border-[var(--cordel-border)]'
              : 'bg-[var(--cordel-card-btn-bg)] text-[var(--cordel-card-btn-text)] font-semibold border-[var(--cordel-border)]'
          }`}
        >
          <Sliders className="w-4 h-4 flex-shrink-0" />
          <div>
            <div className="font-bold text-[11px]">{tPaper(lang, 'grid32ModePrefill')}</div>
            <div className="text-[9.5px] opacity-80">
              {lang === 'fr' ? 'Pupitres pré-remplis avec 1 ligne vierge de séparation.' : 'Naipes pré-preenchidos com 1 linha vazia separadora.'}
            </div>
          </div>
        </button>
      </div>
    </div>
  );
};
