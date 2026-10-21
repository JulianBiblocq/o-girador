/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Play, Pause, Square } from 'lucide-react';

interface Props {
  isPlaying: boolean;
  isLoading: boolean;
  onTogglePlay: (opts?: any) => void;
  onStop: () => void;
  bpm: number;
  onChangeBpm: (delta: number) => void;
  loopMode: 'infinite' | number;
  onChangeLoopMode: (mode: 'infinite' | number) => void;
  isLoopExitRequested: boolean;
  onRequestLoopExit: () => void;
}

export const MobileTransportBar: React.FC<Props> = ({
  isPlaying,
  isLoading,
  onTogglePlay,
  onStop,
  bpm,
  onChangeBpm,
  loopMode,
  onChangeLoopMode,
  isLoopExitRequested,
  onRequestLoopExit,
}) => {
  return (
    <footer className="w-full h-12 px-1.5 bg-[#121212] border-t-2 border-[var(--cordel-border)] flex items-center justify-between gap-1 z-20 shrink-0 select-none">
      {/* 1. Bloc Tempo [-5] [-] BPM [+] [+5] */}
      <div className="flex items-center bg-[#1a1a1a] border border-[var(--cordel-border)] shadow-[1px_1px_0px_var(--cordel-border)] shrink-0">
        <button
          onClick={() => onChangeBpm(-5)}
          className="px-1 py-1 font-mono text-[9px] font-bold text-[var(--cordel-text)] hover:text-[#b94a2c] active:scale-90"
          title="-5 BPM"
        >
          -5
        </button>
        <button
          onClick={() => onChangeBpm(-1)}
          className="px-1 py-1 font-mono text-[10px] font-bold text-[var(--cordel-text)] hover:text-[#b94a2c] active:scale-90"
          title="-1 BPM"
        >
          -
        </button>
        <span className="font-cactus font-bold text-[10px] sm:text-xs px-1 text-[var(--cordel-text)] min-w-[30px] text-center leading-none">
          {bpm}
        </span>
        <button
          onClick={() => onChangeBpm(1)}
          className="px-1 py-1 font-mono text-[10px] font-bold text-[var(--cordel-text)] hover:text-[#b94a2c] active:scale-90"
          title="+1 BPM"
        >
          +
        </button>
        <button
          onClick={() => onChangeBpm(5)}
          className="px-1 py-1 font-mono text-[9px] font-bold text-[var(--cordel-text)] hover:text-[#b94a2c] active:scale-90"
          title="+5 BPM"
        >
          +5
        </button>
      </div>

      {/* 2. Départ Différé 4 Temps */}
      <button
        onClick={() => onTogglePlay({ forcePreRoll: true })}
        className="px-1.5 py-1.5 bg-[#1a1a1a] border border-[var(--cordel-border)] font-cactus font-bold text-[9px] uppercase tracking-wider text-[var(--cordel-text)] hover:bg-[#b94a2c] hover:text-[#f4ecd8] active:translate-y-0.5 shadow-[1px_1px_0px_var(--cordel-border)] shrink-0 leading-none"
        title="Départ avec décompte 4 temps"
      >
        4 TEMPS
      </button>

      {/* 3. Boutons Transport Play / Pause / Stop */}
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={() => onTogglePlay()}
          disabled={isLoading}
          className={`w-8.5 h-8.5 border-2 border-[var(--cordel-border)] flex items-center justify-center font-bold text-[#f4ecd8] shadow-[2px_2px_0px_var(--cordel-border)] active:translate-y-0.5 transition-colors ${
            isPlaying ? 'bg-[#b94a2c]' : 'bg-[#1a1a1a] hover:bg-[#b94a2c]'
          }`}
          aria-label={isPlaying ? 'Pause' : 'Lecture'}
        >
          {isPlaying ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
        </button>
        <button
          onClick={onStop}
          className="w-7.5 h-8.5 bg-[#1a1a1a] border-2 border-[var(--cordel-border)] flex items-center justify-center text-[var(--cordel-text)] hover:text-[#b94a2c] shadow-[2px_2px_0px_var(--cordel-border)] active:translate-y-0.5 transition-colors"
          aria-label="Arrêt et retour début"
        >
          <Square size={12} fill="currentColor" />
        </button>
      </div>

      {/* 4. Bloc Boucle [ ∞ | ×2 | ×4 ] */}
      <div className="flex items-center bg-[#1a1a1a] border border-[var(--cordel-border)] shadow-[1px_1px_0px_var(--cordel-border)] overflow-hidden shrink-0">
        {(['infinite', 2, 4] as const).map((mode) => (
          <button
            key={mode}
            onClick={() => onChangeLoopMode(mode)}
            className={`px-1.5 py-1 font-cactus font-bold text-[9px] sm:text-[10px] transition-colors ${
              loopMode === mode ? 'bg-[#b94a2c] text-[#f4ecd8]' : 'text-[var(--cordel-text)] hover:bg-white/10'
            }`}
          >
            {mode === 'infinite' ? '∞' : `×${mode}`}
          </button>
        ))}
      </div>

      {/* 5. Bouton Sortir Fin de Tour */}
      <button
        onClick={onRequestLoopExit}
        className={`px-1.5 py-1.5 border-2 border-[var(--cordel-border)] font-cactus font-bold text-[8.5px] uppercase tracking-wider active:translate-y-0.5 shadow-[1px_1px_0px_var(--cordel-border)] leading-tight shrink-0 ${
          isLoopExitRequested
            ? 'bg-[#b94a2c] text-[#f4ecd8] animate-pulse border-[#f4ecd8]'
            : 'bg-[#1a1a1a] text-[var(--cordel-text)] hover:border-[#b94a2c]'
        }`}
        title="Sortir de la boucle à la fin du tour"
      >
        {isLoopExitRequested ? 'SORTIE...' : 'FIN TOUR'}
      </button>
    </footer>
  );
};
