/**
 * Barre de contrôle 4 Temps pour animation et débrayage de trames (< 80 lignes).
 */

import React from 'react';
import { Play, Pause } from 'lucide-react';
import { tMobile } from '../../../i18n/mobileTranslations';

interface Props {
  isPlaying: boolean;
  onTogglePlay: () => void;
  selectedIndex: number;
  onSelectFrame: (idx: number) => void;
  framesCount: number;
  isOverridden: boolean;
  onToggleOverride: () => void;
  lang: 'fr' | 'pt';
}

export const MobileSignal4TBar: React.FC<Props> = ({
  isPlaying,
  onTogglePlay,
  selectedIndex,
  onSelectFrame,
  framesCount,
  isOverridden,
  onToggleOverride,
  lang,
}) => {
  return (
    <div className="w-full max-w-[380px] mx-auto flex items-center justify-between gap-1 p-1 bg-[var(--cordel-surface)] border-2 border-[var(--cordel-border)] shadow-[1px_1px_0px_var(--cordel-border)]">
      {/* Bouton Play / Pause */}
      <button
        type="button"
        onClick={onTogglePlay}
        className={`px-2.5 py-1 border border-[var(--cordel-border)] font-cactus font-bold text-xs uppercase flex items-center gap-1 cursor-pointer transition-colors ${
          isPlaying ? 'bg-[#8b2a1a] text-[#f4ecd8]' : 'bg-[var(--cordel-card-btn-bg)] text-[var(--cordel-card-btn-text)] hover:border-[#8b2a1a]'
        }`}
        title={isPlaying ? 'Pause' : 'Play'}
      >
        {isPlaying ? <Pause size={12} /> : <Play size={12} />}
        <span>{isPlaying ? 'PAUSE' : 'PLAY'}</span>
      </button>

      {/* 4 Pastilles [ 1 ] [ 2 ] [ 3 ] [ 4 ] */}
      <div className="flex items-center gap-1">
        {Array.from({ length: Math.max(4, framesCount) }, (_, i) => {
          const isActive = selectedIndex === i;
          return (
            <button
              key={i}
              type="button"
              onClick={() => onSelectFrame(i)}
              className={`w-7 h-7 font-mono font-bold text-xs border cursor-pointer flex items-center justify-center transition-all ${
                isActive
                  ? 'bg-[#8b2a1a] text-[#f4ecd8] border-[var(--cordel-border)] shadow-xs scale-105'
                  : 'bg-[var(--cordel-card-btn-bg)] text-[var(--cordel-card-btn-text)] border-[var(--cordel-border)]/50 hover:border-[#8b2a1a]'
              }`}
              title={`Trame ${i + 1}`}
            >
              {i + 1}
            </button>
          );
        })}
      </div>

      {/* Bouton Débrayer cette trame */}
      <button
        type="button"
        onClick={onToggleOverride}
        className={`px-2 py-1 border font-cactus font-bold text-[10px] uppercase cursor-pointer transition-colors truncate max-w-[125px] ${
          isOverridden
            ? 'bg-[#d4af37]/30 text-[var(--cordel-text)] border-[#d4af37] font-extrabold'
            : 'bg-[var(--cordel-card-btn-bg)] text-[var(--cordel-card-btn-text)] border-[var(--cordel-border)]/60 hover:border-[#8b2a1a]'
        }`}
        title={tMobile(lang, isOverridden ? 'frameOverridden' : 'overrideFrame')}
      >
        {isOverridden ? '• ' + tMobile(lang, 'frameOverridden') : tMobile(lang, 'overrideFrame')}
      </button>
    </div>
  );
};
