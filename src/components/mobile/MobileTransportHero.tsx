/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Play, Square, RotateCcw } from 'lucide-react';
import { useMuteGroupStore } from '../../stores/useMuteGroupStore';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { useTapTempo } from '../../hooks/useTapTempo';
import { tMobile } from '../../i18n/mobileTranslations';
import { ALL_MUTE_GROUP_IDS } from './mobileFamilyConfig';

interface Props {
  isPlaying: boolean; isLoading: boolean; onTogglePlay: (opts?: any) => void; onStop: () => void;
  bpm: number; onChangeBpm: (delta: number) => void; onResetBpm: () => void;
  loopMode: 'infinite' | number; onChangeLoopMode: (mode: 'infinite' | number) => void;
  isLoopExitRequested: boolean; onRequestLoopExit: () => void;
}

export const MobileTransportHero: React.FC<Props> = ({
  isPlaying, isLoading, onTogglePlay, onStop, bpm, onChangeBpm, onResetBpm,
  loopMode, onChangeLoopMode, isLoopExitRequested, onRequestLoopExit,
}) => {
  const lang = useSequencerStore((s) => s.lang);
  const activeMuteGroups = useMuteGroupStore((s) => s.activeMuteGroups);
  const muteGroupAssignments = useMuteGroupStore((s) => s.muteGroupAssignments);
  const toggleMuteGroupActive = useMuteGroupStore((s) => s.toggleMuteGroupActive);
  const { registerTap } = useTapTempo();

  return (
    <footer className="w-full bg-[#121212] border-t-2 border-[var(--cordel-border)] flex flex-col gap-2 p-2 shrink-0 select-none">
      {/* 1. Ligne Supérieure : Tempo, Groupes de Mute Maîtres, Boucles */}
      <div className="w-full flex items-center justify-between gap-1">
        {/* Tempo [-5] [-1] [ BPM ] [ ↺ ] [+1] [+5] */}
        <div className="h-10 flex items-center bg-[#1a1a1a] border-2 border-[var(--cordel-border)] shadow-[2px_2px_0px_var(--cordel-border)]">
          <button onClick={() => onChangeBpm(-5)} className="h-full px-1.5 font-mono text-xs font-bold text-[var(--cordel-text)] hover:text-[#b94a2c] active:scale-90" title="-5 BPM">-5</button>
          <button onClick={() => onChangeBpm(-1)} className="h-full px-1.5 font-mono text-sm font-bold text-[var(--cordel-text)] hover:text-[#b94a2c] active:scale-90 border-l border-[var(--cordel-border)]/40" title="-1 BPM">-1</button>
          <button onClick={registerTap} className="h-full px-1.5 font-cactus font-bold text-sm text-[var(--cordel-text)] hover:text-[#b94a2c] flex items-center active:scale-95 border-l border-[var(--cordel-border)]/40" title="Tap Tempo">
            <span>{bpm}</span>
          </button>
          <button onClick={onResetBpm} className="h-full px-1.5 flex items-center justify-center text-[#b94a2c] hover:bg-white/10 active:scale-95 border-l border-r border-[var(--cordel-border)]/40" title="Reset BPM">
            <RotateCcw size={10} />
          </button>
          <button onClick={() => onChangeBpm(1)} className="h-full px-1.5 font-mono text-sm font-bold text-[var(--cordel-text)] hover:text-[#b94a2c] active:scale-90 border-r border-[var(--cordel-border)]/40" title="+1 BPM">+1</button>
          <button onClick={() => onChangeBpm(5)} className="h-full px-1.5 font-mono text-xs font-bold text-[var(--cordel-text)] hover:text-[#b94a2c] active:scale-90" title="+5 BPM">+5</button>
        </div>

        {/* 4 Groupes de Mute Maîtres [ 1 | 2 | 3 | 4 ] */}
        <div className="h-10 flex items-center bg-[#1a1a1a] border-2 border-[var(--cordel-border)] shadow-[2px_2px_0px_var(--cordel-border)] overflow-hidden shrink-0">
          {ALL_MUTE_GROUP_IDS.map((gid) => {
            const isAssigned = (muteGroupAssignments[gid] || []).length > 0;
            const isActive = activeMuteGroups[gid];
            return (
              <button
                key={gid}
                onClick={() => toggleMuteGroupActive(gid)}
                className={`h-full w-7 font-mono font-bold text-xs flex flex-col items-center justify-center transition-colors border-r last:border-r-0 border-[var(--cordel-border)]/40 active:translate-y-0.5 ${
                  isActive
                    ? 'bg-[#8b2a1a] text-[#f4ecd8] font-black'
                    : isAssigned
                    ? 'text-[#d4af37] hover:bg-white/10'
                    : 'text-[var(--cordel-text)]/35 hover:bg-white/5'
                }`}
                title={`Groupe de Mute Maître ${gid}${isActive ? ' (Muté)' : isAssigned ? ' (Armé)' : ' (Vide)'}`}
              >
                <span>{gid}</span>
                {isAssigned && !isActive && <span className="w-1 h-1 rounded-full bg-[#d4af37] -mt-0.5" />}
              </button>
            );
          })}
        </div>

        {/* Boucles Agrandies [ ∞ | ×2 | ×4 | ×8 ] */}
        <div className="h-10 flex items-center bg-[#1a1a1a] border-2 border-[var(--cordel-border)] shadow-[2px_2px_0px_var(--cordel-border)] overflow-hidden">
          {(['infinite', 2, 4, 8] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => onChangeLoopMode(mode)}
              className={`h-full px-2 font-cactus font-bold text-sm transition-colors flex items-center justify-center ${
                loopMode === mode ? 'bg-[#b94a2c] text-[#f4ecd8]' : 'text-[var(--cordel-text)] hover:bg-white/10'
              }`}
            >
              {mode === 'infinite' ? '∞' : `×${mode}`}
            </button>
          ))}
        </div>
      </div>

      {/* 2. Ligne Inférieure : Sortie de boucle, Départ 4 temps et Transport géant */}
      <div className="w-full flex items-center gap-2">
        <button
          onClick={onRequestLoopExit}
          className={`flex-1 min-h-[44px] py-2 border-2 border-[var(--cordel-border)] font-cactus font-bold text-xs uppercase tracking-wider active:translate-y-0.5 shadow-[2px_2px_0px_var(--cordel-border)] text-center transition-all ${
            isLoopExitRequested
              ? 'bg-[#b94a2c] text-[#f4ecd8] animate-pulse border-[#f4ecd8]'
              : 'bg-[#1a1a1a] text-[var(--cordel-text)] hover:border-[#b94a2c]'
          }`}
          title="Sortir de la boucle au prochain tour"
        >
          {isLoopExitRequested ? '...' : tMobile(lang, 'exitNextLap')}
        </button>

        <button
          onClick={() => onTogglePlay({ forcePreRoll: true })}
          className="min-h-[44px] px-3 bg-[#1a1a1a] border-2 border-[var(--cordel-border)] font-cactus font-bold text-xs uppercase tracking-wide text-[var(--cordel-text)] hover:bg-[#b94a2c] hover:text-[#f4ecd8] active:translate-y-0.5 shadow-[2px_2px_0px_var(--cordel-border)] shrink-0 flex items-center justify-center"
          title="Départ avec décompte"
        >
          {tMobile(lang, 'depart4T')}
        </button>

        <button
          onClick={() => onTogglePlay()}
          disabled={isLoading}
          className={`min-h-[44px] px-5 border-2 border-[var(--cordel-border)] flex items-center justify-center font-cactus font-bold text-base tracking-wider shadow-[2px_2px_0px_var(--cordel-border)] active:translate-y-0.5 transition-colors gap-2 shrink-0 ${
            isPlaying ? 'bg-[#b94a2c] text-[#f4ecd8]' : 'bg-[#27ae60] text-[#f4ecd8] hover:bg-[#2ecc71]'
          }`}
        >
          {isPlaying ? <Square size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
          <span>{isPlaying ? 'STOP' : 'PLAY'}</span>
        </button>
      </div>
    </footer>
  );
};
