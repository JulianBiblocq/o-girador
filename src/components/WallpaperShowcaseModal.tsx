/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X, ZoomIn, ZoomOut, Sun, Moon, Check } from 'lucide-react';
import { WallpaperCard, WallpaperPattern } from './WallpaperCard';
import { getWallpaperPatternsConfig } from '../constants/wallpaperPatternsConfig';

interface WallpaperShowcaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentWallpaper: WallpaperPattern;
  onApplyWallpaper: (pattern: WallpaperPattern) => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  lang?: 'fr' | 'pt';
}

export const WallpaperShowcaseModal: React.FC<WallpaperShowcaseModalProps> = ({
  isOpen,
  onClose,
  currentWallpaper,
  onApplyWallpaper,
  isDarkMode,
  onToggleDarkMode,
  lang = 'fr',
}) => {
  const [selected, setSelected] = useState<WallpaperPattern>(currentWallpaper);
  const [isZoomed, setIsZoomed] = useState(false);

  if (!isOpen) return null;
  const isPt = lang === 'pt';
  const patternsConfig = getWallpaperPatternsConfig(isPt);

  const handleApply = () => {
    onApplyWallpaper(selected);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 select-none">
      <div className="bg-[var(--cordel-bg)] text-[var(--cordel-text)] border-4 border-[var(--cordel-border)] shadow-[8px_8px_0_var(--cordel-border)] w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden">
        <div className="p-4 border-b-2 border-[var(--cordel-border)] flex items-center justify-between">
          <div>
            <h2 className="font-cactus text-xl font-bold tracking-wide">
              {isPt ? "Papel de Parede Trompe-l'Œil Maracatu" : "Papier Peint Trompe-l'Œil Maracatu"}
            </h2>
            <p className="text-xs opacity-75 font-sans mt-0.5">
              {isPt ? 'Textura sutil à distância, instrumentos revelados no olhar aproximado.' : 'Trame discrète à distance normale, instruments révélés au regard attentif.'}
            </p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center border-2 border-[var(--cordel-border)] hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] transition-colors cursor-pointer">
            <X size={18} />
          </button>
        </div>

        <div className="px-4 py-2 bg-[var(--cordel-text)]/5 border-b border-[var(--cordel-border)]/40 flex items-center justify-between gap-3 text-xs flex-wrap">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsZoomed(!isZoomed)}
              className="flex items-center gap-1.5 px-2.5 py-1 border border-[var(--cordel-border)] hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] font-bold transition-colors cursor-pointer"
            >
              {isZoomed ? <ZoomOut size={14} /> : <ZoomIn size={14} />}
              <span>{isZoomed ? (isPt ? 'Zoom ×1 (Normal)' : 'Zoom ×1 (Distance)') : (isPt ? 'Loupe ×2.5 (Detalhe)' : 'Loupe ×2.5 (Détails)')}</span>
            </button>
            <span className="text-[11px] opacity-60 font-mono hidden sm:inline">
              {isZoomed ? '14px 35px' : 'Trame 14px-20px'}
            </span>
          </div>

          <button
            onClick={onToggleDarkMode}
            className="flex items-center gap-1.5 px-2.5 py-1 border border-[var(--cordel-border)] hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] font-bold transition-colors cursor-pointer"
          >
            {isDarkMode ? <Sun size={14} /> : <Moon size={14} />}
            <span>{isDarkMode ? (isPt ? 'Modo Claro' : 'Mode clair') : (isPt ? 'Modo Escuro' : 'Mode sombre')}</span>
          </button>
        </div>

        <div className="p-4 overflow-y-auto flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3 custom-scrollbar">
          {patternsConfig.map((item) => (
            <WallpaperCard
              key={item.id}
              id={item.id}
              title={item.title}
              subtitle={item.subtitle}
              badge={item.badge}
              isSelected={selected === item.id}
              isZoomed={isZoomed}
              onSelect={() => setSelected(item.id)}
            />
          ))}
        </div>

        <div className="p-3 border-t-2 border-[var(--cordel-border)] bg-[var(--cordel-text)]/5 flex items-center justify-between gap-3">
          <button onClick={onClose} className="px-4 py-2 border-2 border-[var(--cordel-border)] text-xs font-bold uppercase hover:bg-[var(--cordel-text)]/10 transition-colors cursor-pointer">
            {isPt ? 'Cancelar' : 'Fermer'}
          </button>
          <button onClick={handleApply} className="px-5 py-2 bg-[var(--cordel-wood)] text-white border-2 border-[var(--cordel-border)] font-cactus font-bold text-sm tracking-wide uppercase shadow-[3px_3px_0_var(--cordel-border)] hover:brightness-110 active:translate-x-0.5 active:translate-y-0.5 transition-all flex items-center gap-2 cursor-pointer">
            <Check size={16} />
            <span>{isPt ? 'Aplicar ao Fundo' : "Appliquer au fond de l'app"}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
