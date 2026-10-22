/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Play, Square, RotateCcw, Zap } from 'lucide-react';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { useTapTempo } from '../../hooks/useTapTempo';
import { tMobile } from '../../i18n/mobileTranslations';

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
  const lang = useSequencerStore((s) => s.lang);
  const { registerTap } = useTapTempo();

  return (
    <footer className="w-full bg-[var(--cordel-surface)] border-t-2 border-[var(--cordel-border)] flex flex-col gap-1.5 p-2 shrink-0 select-none relative z-30">
      {/* 1. Ligne Supérieure : Tempo, Bouton TREINO, Boucles */}
      <div className="w-full flex items-center justify-between gap-1">
        {/* Tempo [-5] [-1] [ BPM ] [ ↺ ] [+1] [+5] */}
        <div className="h-9 flex items-center bg-[var(--cordel-card-btn-bg)] border-2 border-[var(--cordel-border)] shadow-[1px_1px_0_#000]">
          <button onClick={() => onChangeBpm(-5)} className="h-full px-1.5 font-mono text-xs font-bold text-[var(--cordel-card-btn-text)] hover:text-[#b94a2c] active:scale-90 cursor-pointer" title="-5 BPM">-5</button>
          <button onClick={() => onChangeBpm(-1)} className="h-full px-1.5 font-mono text-sm font-bold text-[var(--cordel-card-btn-text)] hover:text-[#b94a2c] active:scale-90 border-l border-[var(--cordel-border)]/40 cursor-pointer" title="-1 BPM">-1</button>
          <button onClick={registerTap} className="h-full px-1.5 font-cactus font-bold text-xs sm:text-sm text-[var(--cordel-card-btn-text)] hover:text-[#b94a2c] flex items-center active:scale-95 border-l border-[var(--cordel-border)]/40 cursor-pointer" title="Tap Tempo">
            <span>{bpm}</span>
          </button>
          <button onClick={onResetBpm} className="h-full px-1.5 flex items-center justify-center text-[#b94a2c] hover:bg-black/10 active:scale-95 border-l border-r border-[var(--cordel-border)]/40 cursor-pointer" title="Reset BPM">
            <RotateCcw size={10} />
          </button>
          <button onClick={() => onChangeBpm(1)} className="h-full px-1.5 font-mono text-sm font-bold text-[var(--cordel-card-btn-text)] hover:text-[#b94a2c] active:scale-90 border-r border-[var(--cordel-border)]/40 cursor-pointer" title="+1 BPM">+1</button>
          <button onClick={() => onChangeBpm(5)} className="h-full px-1.5 font-mono text-xs font-bold text-[var(--cordel-card-btn-text)] hover:text-[#b94a2c] active:scale-90 cursor-pointer" title="+5 BPM">+5</button>
        </div>

        {/* Bouton TREINO (Speed Trainer) */}
        <button
          onClick={onOpenSpeedTrainer}
          className="h-9 px-2 bg-[var(--cordel-card-btn-bg)] border-2 border-[var(--cordel-border)] text-[#d4af37] font-cactus font-bold text-xs uppercase tracking-wider flex items-center gap-1 shadow-[1px_1px_0_#000] hover:border-[#d4af37] active:translate-y-0.5 shrink-0 cursor-pointer"
          title="Speed Trainer"
        >
          <Zap size={13} className="text-[#d4af37]" />
          <span>{tMobile(lang, 'treino')}</span>
        </button>

        {/* Boucles [ ∞ | ×2 | ×4 | ×8 ] */}
        <div className="h-9 flex items-center bg-[var(--cordel-card-btn-bg)] border-2 border-[var(--cordel-border)] shadow-[1px_1px_0_#000] overflow-hidden">
          {(['infinite', 2, 4, 8] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => onChangeLoopMode(mode)}
              className={`h-full px-2 font-cactus font-bold text-xs transition-colors flex items-center justify-center cursor-pointer ${
                loopMode === mode ? 'bg-[#b94a2c] text-[#f4ecd8]' : 'text-[var(--cordel-card-btn-text)] hover:bg-black/10'
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
          className={`flex-1 min-h-[42px] py-2 border-2 border-[var(--cordel-border)] font-cactus font-bold text-xs uppercase tracking-wider active:translate-y-0.5 shadow-[2px_2px_0_#000] text-center transition-all cursor-pointer ${
            isLoopExitRequested ? 'bg-[#b94a2c] text-[#f4ecd8] animate-pulse border-black' : 'bg-[var(--cordel-card-btn-bg)] text-[var(--cordel-card-btn-text)] hover:border-[#b94a2c]'
          }`}
          title="Sortir de la boucle au prochain tour"
        >
          {isLoopExitRequested ? '...' : tMobile(lang, 'exitNextLap')}
        </button>

        <button
          onClick={() => onTogglePlay({ forcePreRoll: true })}
          className="min-h-[42px] px-3 bg-[var(--cordel-card-btn-bg)] border-2 border-[var(--cordel-border)] font-cactus font-bold text-xs uppercase tracking-wide text-[var(--cordel-card-btn-text)] hover:bg-[#b94a2c] hover:text-[#f4ecd8] active:translate-y-0.5 shadow-[2px_2px_0_#000] shrink-0 flex items-center justify-center cursor-pointer"
          title="Départ avec décompte"
        >
          {tMobile(lang, 'depart4T')}
        </button>

        <button
          onClick={() => onTogglePlay()}
          disabled={isLoading}
          className={`min-h-[42px] px-4 border-2 border-black flex items-center justify-center font-cactus font-bold text-sm tracking-wider shadow-[2px_2px_0_#000] active:translate-y-0.5 transition-colors gap-1.5 shrink-0 cursor-pointer ${
            isPlaying ? 'bg-red-700 text-white' : 'bg-[#15803d] text-white hover:bg-[#166534]'
          }`}
        >
          {isPlaying ? <Square size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
          <span>{isPlaying ? 'STOP' : 'PLAY'}</span>
        </button>
      </div>
    </footer>
  );
};
