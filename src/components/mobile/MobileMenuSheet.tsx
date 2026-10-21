/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { X, Sliders, Globe, Moon, Sun, Monitor } from 'lucide-react';
import { MobileViewModeSelector } from './MobileViewModeSelector';

interface Props {
  isOpen: boolean; onClose: () => void;
  masterEQ: { low: number; mid: number; high: number }; setMasterEQ: (eq: { low: number; mid: number; high: number }) => void;
  lang: 'fr' | 'pt'; onToggleLang: () => void;
  isDarkMode: boolean; onToggleDarkMode: () => void; onToggleStudio: () => void;
  onOpenPaperWorkshop?: (tab?: 'sheets' | 'scanner' | 'reserve') => void;
  onOpenPhotoBooth?: () => void; onOpenLyricsVideo?: () => void;
}

const EQ_PROFILES = [
  { id: 'speaker', labelFr: 'Enceinte USB / BT', labelPt: 'Caixa USB / BT', eq: { low: 2.5, mid: -1.5, high: 2.0 } },
  { id: 'room', labelFr: 'Salle / Studio', labelPt: 'Sala / Estúdio', eq: { low: -3.0, mid: 1.5, high: -1.0 } },
  { id: 'headphone', labelFr: 'Casque', labelPt: 'Fone', eq: { low: 0, mid: 0, high: 0 } },
  { id: 'focus', labelFr: 'Focus Danse & Chant', labelPt: 'Foco Dança & Canto', eq: { low: -2.0, mid: 3.0, high: 1.0 } },
];

export const MobileMenuSheet: React.FC<Props> = ({
  isOpen, onClose, masterEQ, setMasterEQ, lang, onToggleLang,
  isDarkMode, onToggleDarkMode, onToggleStudio,
}) => {
  if (!isOpen) return null;

  return (
    <div
      onClick={(e) => e.target === e.currentTarget && onClose()}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/75 backdrop-blur-xs select-none"
    >
      <div className="w-full max-w-sm max-h-[88dvh] flex flex-col bg-[var(--cordel-bg)] border-2 border-[var(--cordel-border)] shadow-[4px_4px_0px_#000] overflow-hidden">
        {/* Header fixe en haut */}
        <div className="p-2.5 border-b-2 border-[var(--cordel-border)] flex items-center justify-between bg-[#1a1a1a] shrink-0">
          <span className="font-cactus font-bold text-xs uppercase tracking-wider text-[var(--cordel-text)]">
            {lang === 'pt' ? 'Menu ferramentas & ajustes' : 'Menu outils & réglages'}
          </span>
          <button onClick={onClose} className="p-1 text-[var(--cordel-text)] hover:text-[#b94a2c] active:scale-95 cursor-pointer" aria-label="Fermer">
            <X size={16} />
          </button>
        </div>

        {/* Conteneur interne scrollable */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-3 space-y-3 custom-scrollbar">
          {/* 1. Sélecteur des 4 Modes tout en haut */}
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-mono uppercase text-[var(--cordel-text)]/70 tracking-wider font-bold">
              {lang === 'pt' ? 'Modo de visualização' : 'Mode d’affichage'}
            </span>
            <MobileViewModeSelector lang={lang} />
          </div>

          {/* 2. Profils Égaliseur Master */}
          <div className="flex flex-col gap-1.5 pt-2 border-t border-[var(--cordel-border)]/40">
            <span className="text-[10px] font-mono uppercase text-[var(--cordel-text)]/70 tracking-wider flex items-center gap-1 font-bold">
              <Sliders size={12} className="text-[#b94a2c]" />
              {lang === 'pt' ? 'Equalização Master' : 'Égalisation Master'}
            </span>
            <div className="grid grid-cols-2 gap-1.5">
              {EQ_PROFILES.map((prof) => {
                const isActive = masterEQ.low === prof.eq.low && masterEQ.mid === prof.eq.mid && masterEQ.high === prof.eq.high;
                return (
                  <button
                    key={prof.id}
                    onClick={() => setMasterEQ(prof.eq)}
                    className={`p-2 text-left border transition-all text-[9.5px] font-cactus font-bold uppercase tracking-wider ${
                      isActive
                        ? 'bg-[#b94a2c] text-[#f4ecd8] border-[#f4ecd8]'
                        : 'bg-[#1a1a1a] text-[var(--cordel-text)] border-[var(--cordel-border)] hover:border-[#b94a2c]'
                    }`}
                  >
                    {lang === 'pt' ? prof.labelPt : prof.labelFr}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Préférences Système & Bascule Studio */}
          <div className="flex flex-col gap-2 pt-2 border-t border-[var(--cordel-border)]/40">
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={onToggleLang}
                className="p-2 bg-[#1a1a1a] border border-[var(--cordel-border)] text-[var(--cordel-text)] font-cactus font-bold text-[10px] uppercase tracking-wider flex items-center justify-center gap-1.5"
              >
                <Globe size={13} className="text-[#b94a2c]" />
                {lang === 'pt' ? 'Langue: PT' : 'Langue: FR'}
              </button>
              <button
                onClick={onToggleDarkMode}
                className="p-2 bg-[#1a1a1a] border border-[var(--cordel-border)] text-[var(--cordel-text)] font-cactus font-bold text-[10px] uppercase tracking-wider flex items-center justify-center gap-1.5"
              >
                {isDarkMode ? <Sun size={13} className="text-[#d4a017]" /> : <Moon size={13} className="text-[#f4ecd8]" />}
                {isDarkMode ? 'Clair' : 'Sombre'}
              </button>
            </div>

            <button
              onClick={() => { onClose(); onToggleStudio(); }}
              className="p-2.5 bg-[#b94a2c] text-[#f4ecd8] border-2 border-[#f4ecd8] font-cactus font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-[2px_2px_0px_rgba(0,0,0,0.8)] active:translate-y-0.5"
            >
              <Monitor size={15} />
              {lang === 'pt' ? 'Modo Estúdio Completo' : 'Mode Édition Studio'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
