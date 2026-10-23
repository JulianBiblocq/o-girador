/**
 * Languette d'appel Cordel fine pour le volet Informations (< 50 lignes).
 */
import React from 'react';
import { ChevronLeft, Info } from 'lucide-react';

interface RightSidebarCollapsedTabProps {
  onOpen: () => void;
  lang: 'fr' | 'pt';
}

export const RightSidebarCollapsedTab: React.FC<RightSidebarCollapsedTabProps> = ({
  onOpen,
  lang,
}) => {
  return (
    <button
      type="button"
      onClick={onOpen}
      title={lang === 'pt' ? 'Abrir Informações' : 'Ouvrir Informations'}
      aria-label={lang === 'pt' ? 'Abrir Informações' : 'Ouvrir Informations'}
      className="w-8 shrink-0 h-full border-l-2 border-[var(--cordel-border)] bg-[var(--cordel-bg)] hover:bg-[var(--cordel-surface)] flex flex-col items-center justify-between py-6 cursor-pointer select-none transition-colors group z-20 shadow-[-1px_0_0_#000]"
    >
      <ChevronLeft size={13} className="shrink-0 text-[var(--cordel-text)] group-hover:-translate-x-0.5 transition-transform" />
      <div className="flex flex-col items-center gap-2">
        <Info size={13} className="shrink-0 text-[var(--cordel-text)]" />
        <span className="[writing-mode:vertical-rl] rotate-180 font-cactus font-bold text-[10px] tracking-widest uppercase text-[var(--cordel-text)] opacity-90 group-hover:opacity-100 leading-none">
          {lang === 'pt' ? 'INFORMAÇÕES' : 'INFORMATIONS'}
        </span>
      </div>
      <ChevronLeft size={13} className="shrink-0 text-[var(--cordel-text)] group-hover:-translate-x-0.5 transition-transform" />
    </button>
  );
};
