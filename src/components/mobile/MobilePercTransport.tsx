/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Play, Square, RotateCcw, Zap } from 'lucide-react';
import { useSequencerStore } from '../../stores/useSequencerStore';

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
  onOpenSpeedTrainer: () => void;
}

export const MobilePercTransport: React.FC<Props> = ({
  isPlaying, isLoading, onTogglePlay, onStop, bpm, onChangeBpm, onResetBpm,
  loopMode, onChangeLoopMode, isLoopExitRequested, onRequestLoopExit, onOpenSpeedTrainer,
}) => {
  return (
    <footer className="w-full bg-[#121212] border-t-2 border-[var(--cordel-border)] flex flex-col gap-1.5 p-2 shrink-0 select-none">
      {/* 1. Ligne Supérieure : Tempo, Bouton TREINO, Boucles */}
      <div className="w-full flex items-center justify-between gap-1">
        {/* Tempo [-5] [-1] [ BPM ↺ ] [+1] [+5] */}
        <div className="h-9 flex items-center bg-[#1a1a1a] border-2 border-[var(--cordel-border)] shadow-[1px_1px_0_var(--cordel-border)]">
          <button onClick={() => onChangeBpm(-5)} className="h-full px-1.5 font-mono text-xs font-bold text-[var(--cordel-text)] hover:text-[#b94a2c] active:scale-90" title="-5 BPM">-5</button>
          <button onClick={() => onChangeBpm(-1)} className="h-full px-1.5 font-mono text-sm font-bold text-[var(--cordel-text)] hover:text-[#b94a2c] active:scale-90 border-l border-[var(--cordel-border)]/40" title="-1 BPM">-1</button>
          <button onClick={onResetBpm} className="h-full px-2 font-cactus font-bold text-xs sm:text-sm text-[var(--cordel-text)] hover:text-[#b94a2c] flex items-center gap-1 active:scale-95 border-l border-r border-[var(--cordel-border)]/40" title="Réinitialiser le tempo">
            <span>{bpm}</span>
            <RotateCcw size={10} className="text-[#b94a2c]" />
          </button>
          <button onClick={() => onChangeBpm(1)} className="h-full px-1.5 font-mono text-sm font-bold text-[var(--cordel-text)] hover:text-[#b94a2c] active:scale-90 border-r border-[var(--cordel-border)]/40" title="+1 BPM">+1</button>
          <button onClick={() => onChangeBpm(5)} className="h-full px-1.5 font-mono text-xs font-bold text-[var(--cordel-text)] hover:text-[#b94a2c] active:scale-90" title="+5 BPM">+5</button>
        </div>

        {/* Bouton TREINO (Speed Trainer) */}
        <button
          onClick={onOpenSpeedTrainer}
          className="h-9 px-2 bg-[#1a1a1a] border-2 border-[var(--cordel-border)] text-[#d4af37] font-cactus font-bold text-xs uppercase tracking-wider flex items-center gap-1 shadow-[1px_1px_0_var(--cordel-border)] hover:border-[#d4af37] active:translate-y-0.5 shrink-0"
          title="Entraînement de vitesse progressif (Speed Trainer)"
        >
          <Zap size={13} className="text-[#d4af37]" />
          <span>TREINO</span>
        </button>

        {/* Boucles [ ∞ | ×2 | ×4 | ×8 ] */}
        <div className="h-9 flex items-center bg-[#1a1a1a] border-2 border-[var(--cordel-border)] shadow-[1px_1px_0_var(--cordel-border)] overflow-hidden">
          {(['infinite', 2, 4, 8] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => onChangeLoopMode(mode)}
              className={`h-full px-2 font-cactus font-bold text-xs transition-colors flex items-center justify-center ${
                loopMode === mode ? 'bg-[#b94a2c] text-[#f4ecd8]' : 'text-[var(--cordel-text)] hover:bg-white/10'
              }`}
            >
              {mode === 'infinite' ? '∞' : `×${mode}`}
            </button>
          ))}
        </div>
      </div>

      {/* 2. Ligne Inférieure : Sortie de boucle, Départ 4T et Play/Stop */}
      <div className="w-full flex items-center gap-1.5">
        <button
          onClick={onRequestLoopExit}
          className={`flex-1 min-h-[42px] py-2 border-2 border-[var(--cordel-border)] font-cactus font-bold text-xs uppercase tracking-wider active:translate-y-0.5 shadow-[2px_2px_0_var(--cordel-border)] text-center transition-all ${
            isLoopExitRequested ? 'bg-[#b94a2c] text-[#f4ecd8] animate-pulse border-[#f4ecd8]' : 'bg-[#1a1a1a] text-[var(--cordel-text)] hover:border-[#b94a2c]'
          }`}
          title="Sortir de la boucle au prochain tour"
        >
          {isLoopExitRequested ? 'SORTIE AU TOUR SUIVANT...' : 'SORTIR AU PROCHAIN TOUR'}
        </button>

        <button
          onClick={() => onTogglePlay({ forcePreRoll: true })}
          className="min-h-[42px] px-3 bg-[#1a1a1a] border-2 border-[var(--cordel-border)] font-cactus font-bold text-xs uppercase tracking-wide text-[var(--cordel-text)] hover:bg-[#b94a2c] hover:text-[#f4ecd8] active:translate-y-0.5 shadow-[2px_2px_0_var(--cordel-border)] shrink-0 flex items-center justify-center"
          title="Départ avec décompte de 4 temps"
        >
          DÉPART 4T
        </button>

        <button
          onClick={() => onTogglePlay()}
          disabled={isLoading}
          className={`min-h-[42px] px-4 border-2 border-[var(--cordel-border)] flex items-center justify-center font-cactus font-bold text-sm tracking-wider shadow-[2px_2px_0_var(--cordel-border)] active:translate-y-0.5 transition-colors gap-1.5 shrink-0 ${
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
