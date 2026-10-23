/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ChevronDown, Menu, Lock, Unlock } from 'lucide-react';
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
  const isTouchLocked = useSequencerStore((s) => s.isTouchLocked);
  const toggleTouchLock = useSequencerStore((s) => s.toggleTouchLock);

  const handleSelectLang = (newLang: 'fr' | 'pt') => {
    setStoreLang(newLang);
    try {
      localStorage.setItem('o_girador_lang', newLang);
    } catch (_) {}
  };

  return (
    <header className="w-full h-11 bg-[#1a1a1a] border-b-2 border-[#8b2a1a] flex items-center justify-between px-2 relative z-30 shrink-0 select-none gap-1.5">
      {/* 1. Logo & Bascule FR / BR */}
      <div className="flex items-center gap-1.5 shrink-0">
        <span className="font-cactus font-bold text-xs sm:text-sm tracking-wider text-[#f4ecd8]">
          SEQUENCIADOR
        </span>
        <div className="h-8 inline-flex items-stretch box-border border border-[#f4ecd8]/40 overflow-hidden shrink-0 font-mono text-[9px] font-bold">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); handleSelectLang(lang === 'fr' ? 'pt' : 'fr'); }}
            className={`px-2 flex items-center justify-center transition-colors cursor-pointer pointer-events-auto relative z-10 ${
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
            className={`px-2 flex items-center justify-center border-l border-[#f4ecd8]/40 transition-colors cursor-pointer pointer-events-auto relative z-10 ${
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
        className="h-8 px-2.5 inline-flex items-center justify-between gap-1.5 box-border border border-[#f4ecd8]/40 flex-1 min-w-0 max-w-[200px] bg-[#262220] text-[#f4ecd8] font-cactus font-bold text-xs uppercase tracking-wide truncate active:translate-y-0.5 transition-all shadow-[1px_1px_0px_#000] cursor-pointer"
        title={lang === 'fr' ? 'Choisir un morceau' : 'Escolher uma música'}
      >
        <span className="truncate">{songTitle || 'CATALOGUE'}</span>
        <ChevronDown size={13} className="shrink-0 ml-0.5 text-[#b94a2c]" />
      </button>

      {/* 3. Statut Authentification, Verrouillage Tactile & Bouton Menu */}
      <div className="flex items-center gap-1 shrink-0">
        <MobileAuthBadge lang={lang} />
        <button
          type="button"
          onClick={toggleTouchLock}
          className={`w-8 h-8 shrink-0 inline-flex items-center justify-center box-border border border-[#f4ecd8]/40 active:translate-y-0.5 transition-all shadow-[1px_1px_0px_#000] cursor-pointer ${
            isTouchLocked ? 'bg-[#b94a2c] text-[#f4ecd8]' : 'bg-[#262220] text-[#f4ecd8]/70 hover:text-[#f4ecd8]'
          }`}
          title={isTouchLocked ? (lang === 'fr' ? 'Écran tactile verrouillé' : 'Tela bloqueada') : (lang === 'fr' ? 'Verrouiller l\'écran tactile' : 'Bloquear tela')}
        >
          {isTouchLocked ? <Lock size={15} /> : <Unlock size={15} />}
        </button>
        <button
          onClick={onOpenMenu}
          className="w-8 h-8 shrink-0 inline-flex items-center justify-center box-border bg-[#262220] text-[#f4ecd8] border border-[#f4ecd8]/40 active:translate-y-0.5 transition-all shadow-[1px_1px_0px_#000] cursor-pointer"
          title={lang === 'fr' ? 'Outils et réglages' : 'Ajustes e ferramentas'}
        >
          <Menu size={18} className="shrink-0 text-[#f4ecd8]" />
        </button>
      </div>
    </header>
  );
};
