/**
 * En-tête du sélecteur d'accordéon de presets (< 40 lignes).
 */

import React from 'react';
import { BookOpen, Music } from 'lucide-react';

interface Props {
  lang: 'pt' | 'fr';
  currentSongTitle?: string;
}

export const PresetAccordionHeader: React.FC<Props> = ({ lang, currentSongTitle }) => {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] font-bold text-[#d99b26] uppercase tracking-wider flex items-center gap-1.5">
        <BookOpen size={12} className="shrink-0 text-[#d99b26]" />
        <span>{lang === 'pt' ? 'Catálogo de Ritmos' : 'Catalogue des Morceaux'}</span>
      </span>
      {currentSongTitle && (
        <span className="text-[11px] font-cactus font-bold text-[var(--cordel-text)] truncate flex items-center gap-1">
          <Music size={11} className="shrink-0 text-[var(--cordel-wood)]" />
          <span className="truncate">{currentSongTitle}</span>
        </span>
      )}
    </div>
  );
};
