/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { X, Sliders, Camera, FileText, Video, Globe, Moon, Sun, Monitor } from 'lucide-react';

interface Props {
  isOpen: boolean; onClose: () => void;
  masterEQ: { low: number; mid: number; high: number }; setMasterEQ: (eq: { low: number; mid: number; high: number }) => void;
  onOpenPaperWorkshop: (tab?: 'sheets' | 'scanner' | 'reserve') => void; onOpenPhotoBooth: () => void;
  onOpenLyricsVideo: () => void; lang: 'fr' | 'pt'; onToggleLang: () => void;
  isDarkMode: boolean; onToggleDarkMode: () => void; onToggleStudio: () => void;
}

const EQ_PROFILES = [
  { id: 'speaker', labelFr: 'Enceinte USB / BT', labelPt: 'Caixa USB / BT', eq: { low: 2.5, mid: -1.5, high: 2.0 } },
  { id: 'room', labelFr: 'Salle / Studio', labelPt: 'Sala / Estúdio', eq: { low: -3.0, mid: 1.5, high: -1.0 } },
  { id: 'headphone', labelFr: 'Casque', labelPt: 'Fone', eq: { low: 0, mid: 0, high: 0 } },
  { id: 'focus', labelFr: 'Focus Danse & Chant', labelPt: 'Foco Dança & Canto', eq: { low: -2.0, mid: 3.0, high: 1.0 } },
];

export const MobileMenuSheet: React.FC<Props> = ({
  isOpen, onClose, masterEQ, setMasterEQ, onOpenPaperWorkshop, onOpenPhotoBooth,
  onOpenLyricsVideo, lang, onToggleLang, isDarkMode, onToggleDarkMode, onToggleStudio,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 flex items-end justify-center backdrop-blur-xs select-none">
      <div className="bg-[#121212] border-t-2 border-x-2 border-[var(--cordel-border)] w-full max-w-md max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-200">
        {/* Header Drawer */}
        <div className="p-2.5 border-b-2 border-[var(--cordel-border)] flex items-center justify-between bg-[#1a1a1a]">
          <span className="font-cactus font-bold text-xs uppercase tracking-wider text-[var(--cordel-text)]">
            {lang === 'pt' ? 'Menu de ferramentas' : 'Menu outils & réglages'}
          </span>
          <button onClick={onClose} className="p-1 text-[var(--cordel-text)] hover:text-[#b94a2c] active:scale-95" aria-label="Fermer">
            <X size={16} />
          </button>
        </div>

        <div className="p-3 flex flex-col gap-3 overflow-y-auto">
          {/* 1. Profils Égaliseur */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-mono uppercase text-[#f4ecd8]/70 tracking-wider flex items-center gap-1 font-bold">
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

          {/* 2. Outils Médias & Terrain */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-mono uppercase text-[#f4ecd8]/70 tracking-wider flex items-center gap-1 font-bold">
              <Camera size={12} className="text-[#b94a2c]" />
              {lang === 'pt' ? 'Terreno & Mídia' : 'Terrain & Médias'}
            </span>
            <div className="flex flex-col gap-1">
              <button
                onClick={() => { onClose(); onOpenPaperWorkshop('scanner'); }}
                className="p-2 bg-[#1a1a1a] border border-[var(--cordel-border)] hover:border-[#b94a2c] text-[var(--cordel-text)] font-cactus font-bold text-[10px] uppercase tracking-wider flex items-center gap-2 text-left"
              >
                <FileText size={14} className="text-[#b94a2c]" />
                {lang === 'pt' ? 'Escanear partitura' : 'Scanner une partition papier'}
              </button>
              <button
                onClick={() => { onClose(); onOpenPhotoBooth(); }}
                className="p-2 bg-[#1a1a1a] border border-[var(--cordel-border)] hover:border-[#b94a2c] text-[var(--cordel-text)] font-cactus font-bold text-[10px] uppercase tracking-wider flex items-center gap-2 text-left"
              >
                <Camera size={14} className="text-[#b94a2c]" />
                {lang === 'pt' ? 'Fotografar sinal de Mestre' : 'Photographier un signe de Mestre'}
              </button>
              <button
                onClick={() => { onClose(); onOpenLyricsVideo(); }}
                className="p-2 bg-[#1a1a1a] border border-[var(--cordel-border)] hover:border-[#b94a2c] text-[var(--cordel-text)] font-cactus font-bold text-[10px] uppercase tracking-wider flex items-center gap-2 text-left"
              >
                <Video size={14} className="text-[#b94a2c]" />
                {lang === 'pt' ? 'Letra & Vídeo' : 'Paroles & Vidéo 9:16'}
              </button>
            </div>
          </div>

          {/* 3. Préférences Système & Bascule Studio */}
          <div className="flex flex-col gap-2 pt-1 border-t border-[var(--cordel-border)]/40">
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
