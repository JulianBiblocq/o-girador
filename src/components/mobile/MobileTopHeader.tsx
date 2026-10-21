/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ChevronDown, Menu } from 'lucide-react';
import { MobileAuthBadge } from './MobileAuthBadge';
import { useSequencerStore } from '../../stores/useSequencerStore';

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
  lang: propLang,
}) => {
  const storeLang = useSequencerStore((s) => s.lang);
  const lang = storeLang || propLang || 'pt';
  const setStoreLang = useSequencerStore((s) => s.setLang);

  const handleSelectLang = (newLang: 'fr' | 'pt') => {
    setStoreLang(newLang);
    try {
      localStorage.setItem('o_girador_lang', newLang);
    } catch (_) {}
  };

  return (
    <header className="w-full h-11 bg-[#1a1a1a] border-b-2 border-[#8b2a1a] flex items-center justify-between px-2 z-20 shrink-0 select-none gap-1.5">
      {/* 1. Logo & Bascule FR / BR */}
      <div className="flex items-center gap-1.5 shrink-0">
        <span className="font-cactus font-bold text-xs sm:text-sm tracking-wider text-[#f4ecd8]">
          SEQUENCIADOR
        </span>
        <div className="flex items-center border border-[#f4ecd8]/40 overflow-hidden shrink-0 font-mono text-[9px] font-bold">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); handleSelectLang(lang === 'fr' ? 'pt' : 'fr'); }}
            className={`px-1.5 py-0.5 transition-colors cursor-pointer pointer-events-auto relative z-10 ${
              lang === 'fr'
                ? 'bg-[#b94a2c] text-[#f4ecd8] font-bold'
                : 'bg-[#292524] text-[#f4ecd8]/80 hover:text-[#f4ecd8]'
            }`}
          >
            FR
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); handleSelectLang(lang === 'pt' ? 'fr' : 'pt'); }}
            className={`px-1.5 py-0.5 border-l border-[#f4ecd8]/40 transition-colors cursor-pointer pointer-events-auto relative z-10 ${
              lang === 'pt'
                ? 'bg-[#b94a2c] text-[#f4ecd8] font-bold'
                : 'bg-[#292524] text-[#f4ecd8]/80 hover:text-[#f4ecd8]'
            }`}
          >
            BR
          </button>
        </div>
      </div>

      {/* 2. Sélecteur Morceau / Catalogue */}
      <button
        onClick={onOpenSongPicker}
        className="flex-1 max-w-[130px] sm:max-w-[180px] px-1.5 py-1 bg-[#262220] border border-[#f4ecd8]/40 text-[#f4ecd8] font-cactus font-bold text-xs uppercase tracking-wide truncate flex items-center justify-between active:translate-y-0.5 transition-all shadow-[1px_1px_0px_#000] cursor-pointer"
        title={lang === 'fr' ? 'Choisir un morceau' : 'Escolher uma música'}
      >
        <span className="truncate">{songTitle || 'CATALOGUE'}</span>
        <ChevronDown size={13} className="shrink-0 ml-0.5 text-[#b94a2c]" />
      </button>

      {/* 3. Statut Authentification & Bouton Menu */}
      <div className="flex items-center gap-1 shrink-0">
        <MobileAuthBadge lang={lang} />
        <button
          onClick={onOpenMenu}
          className="px-2 py-1 bg-[#262220] border border-[#f4ecd8]/40 text-[#f4ecd8] font-cactus font-bold text-xs uppercase tracking-wider flex items-center gap-1 active:translate-y-0.5 transition-all shadow-[1px_1px_0px_#000] cursor-pointer"
          title={lang === 'fr' ? 'Outils et réglages' : 'Ajustes e ferramentas'}
        >
          <span>MENU</span>
          <Menu size={13} className="shrink-0 text-[#f4ecd8]" />
        </button>
      </div>
    </header>
  );
};
