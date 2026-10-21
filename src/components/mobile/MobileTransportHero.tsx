/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Play, Square, RotateCcw } from 'lucide-react';

interface Props {
  isPlaying: boolean;
  isLoading: boolean;
  onTogglePlay: (opts?: any) => void;
  onStop: () => void;
  bpm: number;
  onChangeBpm: (delta: number) => void;
  onResetBpm: () => void;
  loopMode: 'infinite' | number;
  onChangeLoopMode: (mode: 'infinite' | number) => void;
  isLoopExitRequested: boolean;
  onRequestLoopExit: () => void;
}

export const MobileTransportHero: React.FC<Props> = ({
  isPlaying,
  isLoading,
  onTogglePlay,
  onStop,
  bpm,
  onChangeBpm,
  onResetBpm,
  loopMode,
  onChangeLoopMode,
  isLoopExitRequested,
  onRequestLoopExit,
}) => {
  return (
    <footer className="w-full bg-[#121212] border-t-2 border-[var(--cordel-border)] flex flex-col gap-1.5 p-2 shrink-0 select-none">
      {/* 1. Ligne Supérieure : Tempo & Boucles */}
      <div className="w-full flex items-center justify-between gap-1.5">
        {/* Tempo [-5] [-1] [ BPM ↺ ] [+1] [+5] */}
        <div className="flex items-center bg-[#1a1a1a] border-2 border-[var(--cordel-border)] shadow-[1px_1px_0px_var(--cordel-border)]">
          <button
            onClick={() => onChangeBpm(-5)}
            className="px-1.5 py-1 font-mono text-[10px] font-bold text-[var(--cordel-text)] hover:text-[#b94a2c] active:scale-90"
            title="-5 BPM"
          >
            -5
          </button>
          <button
            onClick={() => onChangeBpm(-1)}
            className="px-1.5 py-1 font-mono text-xs font-bold text-[var(--cordel-text)] hover:text-[#b94a2c] active:scale-90"
            title="-1 BPM"
          >
            -1
          </button>
          <button
            onClick={onResetBpm}
            className="px-1.5 py-1 font-cactus font-bold text-xs sm:text-sm text-[var(--cordel-text)] hover:text-[#b94a2c] flex items-center gap-1 active:scale-95 leading-none"
            title="Réinitialiser au tempo d'origine"
          >
            <span>{bpm}</span>
            <RotateCcw size={10} className="text-[#b94a2c]" />
          </button>
          <button
            onClick={() => onChangeBpm(1)}
            className="px-1.5 py-1 font-mono text-xs font-bold text-[var(--cordel-text)] hover:text-[#b94a2c] active:scale-90"
            title="+1 BPM"
          >
            +1
          </button>
          <button
            onClick={() => onChangeBpm(5)}
            className="px-1.5 py-1 font-mono text-[10px] font-bold text-[var(--cordel-text)] hover:text-[#b94a2c] active:scale-90"
            title="+5 BPM"
          >
            +5
          </button>
        </div>

        {/* Boucles [ ∞ | ×2 | ×4 | ×8 ] */}
        <div className="flex items-center bg-[#1a1a1a] border-2 border-[var(--cordel-border)] shadow-[1px_1px_0px_var(--cordel-border)] overflow-hidden">
          {(['infinite', 2, 4, 8] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => onChangeLoopMode(mode)}
              className={`px-2 py-1 font-cactus font-bold text-xs transition-colors ${
                loopMode === mode ? 'bg-[#b94a2c] text-[#f4ecd8]' : 'text-[var(--cordel-text)] hover:bg-white/10'
              }`}
            >
              {mode === 'infinite' ? '∞' : `×${mode}`}
            </button>
          ))}
        </div>
      </div>

      {/* 2. Ligne Inférieure : Sortie de boucle, Départ 4 temps et Transport géant */}
      <div className="w-full flex items-center gap-1.5">
        <button
          onClick={onRequestLoopExit}
          className={`flex-1 py-2 border-2 border-[var(--cordel-border)] font-cactus font-bold text-xs uppercase tracking-wider active:translate-y-0.5 shadow-[2px_2px_0px_var(--cordel-border)] text-center transition-all ${
            isLoopExitRequested
              ? 'bg-[#b94a2c] text-[#f4ecd8] animate-pulse border-[#f4ecd8]'
              : 'bg-[#1a1a1a] text-[var(--cordel-text)] hover:border-[#b94a2c]'
          }`}
          title="Sortir de la boucle au prochain tour"
        >
          {isLoopExitRequested ? 'SORTIE AU TOUR SUIVANT...' : 'SORTIR AU PROCHAIN TOUR'}
        </button>

        <button
          onClick={() => onTogglePlay({ forcePreRoll: true })}
          className="px-2 py-2 bg-[#1a1a1a] border-2 border-[var(--cordel-border)] font-cactus font-bold text-xs uppercase tracking-wide text-[var(--cordel-text)] hover:bg-[#b94a2c] hover:text-[#f4ecd8] active:translate-y-0.5 shadow-[2px_2px_0px_var(--cordel-border)] shrink-0"
          title="Départ avec décompte de 4 temps"
        >
          DÉPART 4T
        </button>

        <button
          onClick={() => onTogglePlay()}
          disabled={isLoading}
          className={`px-4 py-2 border-2 border-[var(--cordel-border)] flex items-center justify-center font-cactus font-bold text-sm tracking-wider shadow-[2px_2px_0px_var(--cordel-border)] active:translate-y-0.5 transition-colors gap-1.5 shrink-0 ${
            isPlaying ? 'bg-[#b94a2c] text-[#f4ecd8]' : 'bg-[#27ae60] text-[#f4ecd8] hover:bg-[#2ecc71]'
          }`}
        >
          {isPlaying ? <Square size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
          <span>{isPlaying ? 'STOP' : 'PLAY'}</span>
        </button>
      </div>
    </footer>
  );
};
