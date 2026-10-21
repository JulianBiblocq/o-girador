/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ChevronDown, Menu } from 'lucide-react';
import { MobileAuthBadge } from './MobileAuthBadge';

interface Props {
  songTitle?: string;
  onOpenSongPicker: () => void;
  onOpenMenu: () => void;
  lang?: 'fr' | 'pt';
}

export const MobileTopHeader: React.FC<Props> = ({
  songTitle,
  onOpenSongPicker,
  onOpenMenu,
  lang = 'pt',
}) => {
  return (
    <header className="w-full h-11 bg-[#121212] border-b-2 border-[var(--cordel-border)] flex items-center justify-between px-2 z-20 shrink-0 select-none gap-1.5">
      {/* 1. Logo & Titre */}
      <div className="flex items-center gap-1 shrink-0">
        <span className="font-cactus font-bold text-xs sm:text-sm tracking-wider text-[var(--cordel-text)]">
          SEQUENCIADOR
        </span>
      </div>

      {/* 2. Sélecteur Morceau / Catalogue */}
      <button
        onClick={onOpenSongPicker}
        className="flex-1 max-w-[150px] sm:max-w-[200px] px-2 py-1 bg-[#1a1a1a] border-2 border-[var(--cordel-border)] text-[var(--cordel-text)] font-cactus font-bold text-xs uppercase tracking-wide truncate flex items-center justify-between active:translate-y-0.5 transition-all shadow-[2px_2px_0px_var(--cordel-border)]"
        title="Choisir un morceau"
      >
        <span className="truncate">{songTitle || 'CATALOGUE'}</span>
        <ChevronDown size={14} className="shrink-0 ml-1 text-[#b94a2c]" />
      </button>

      {/* 3. Statut Authentification & Bouton Menu */}
      <div className="flex items-center gap-1.5 shrink-0">
        <MobileAuthBadge lang={lang} />
        <button
          onClick={onOpenMenu}
          className="px-2 py-1 bg-[#1a1a1a] border-2 border-[var(--cordel-border)] text-[var(--cordel-text)] font-cactus font-bold text-xs uppercase tracking-wider flex items-center gap-1 active:translate-y-0.5 transition-all shadow-[2px_2px_0px_var(--cordel-border)]"
          title="Outils et réglages"
        >
          <span>MENU</span>
          <Menu size={14} className="shrink-0 text-[var(--cordel-text)]" />
        </button>
      </div>
    </header>
  );
};
