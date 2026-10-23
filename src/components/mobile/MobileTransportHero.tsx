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
import { ALL_MUTE_GROUP_IDS, ANALOG_BUTTON_STYLES } from './mobileFamilyConfig';

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
    <footer className="w-full bg-[var(--cordel-surface)] border-t-2 border-[var(--cordel-border)] flex flex-col gap-2 p-2 shrink-0 select-none">
      {/* 1. Ligne Supérieure : Tempo, Groupes de Mute Maîtres, Boucles */}
      <div className="w-full h-9 flex items-stretch justify-between gap-1.5 sm:gap-2 min-w-0">
        {/* Tempo [-5] [-1] [ BPM ] [ ↺ ] [+1] [+5] */}
        <div className="flex-[6] min-w-0 flex items-stretch bg-[var(--cordel-card-btn-bg)] border-2 border-[#1a1a1a] dark:border-[#f4ecd8]/40 shadow-[1px_1px_0_#000]">
          <button onClick={() => onChangeBpm(-5)} className="flex-1 min-w-[22px] h-full px-0.5 flex items-center justify-center font-mono text-[11px] sm:text-xs font-bold text-[var(--cordel-card-btn-text)] hover:text-[#b94a2c] active:scale-90 cursor-pointer" title="-5 BPM">-5</button>
          <button onClick={() => onChangeBpm(-1)} className="flex-1 min-w-[22px] h-full px-0.5 flex items-center justify-center font-mono text-[11px] sm:text-xs font-bold text-[var(--cordel-card-btn-text)] hover:text-[#b94a2c] active:scale-90 border-l border-[var(--cordel-border)]/40 cursor-pointer" title="-1 BPM">-1</button>
          <button onClick={registerTap} className="flex-[1.3] min-w-[30px] h-full px-1 flex items-center justify-center font-cactus text-[11px] sm:text-xs font-extrabold tabular-nums text-[var(--cordel-card-btn-text)] hover:text-[#b94a2c] active:scale-95 border-l border-[var(--cordel-border)]/40 cursor-pointer" title="Tap Tempo">
            <span>{bpm}</span>
          </button>
          <button onClick={onResetBpm} className="flex-1 min-w-[22px] h-full px-0.5 flex items-center justify-center text-[#b94a2c] hover:bg-black/10 dark:hover:bg-white/10 active:scale-95 border-l border-r border-[var(--cordel-border)]/40 cursor-pointer" title="Reset BPM">
            <RotateCcw size={10} />
          </button>
          <button onClick={() => onChangeBpm(1)} className="flex-1 min-w-[22px] h-full px-0.5 flex items-center justify-center font-mono text-[11px] sm:text-xs font-bold text-[var(--cordel-card-btn-text)] hover:text-[#b94a2c] active:scale-90 border-r border-[var(--cordel-border)]/40 cursor-pointer" title="+1 BPM">+1</button>
          <button onClick={() => onChangeBpm(5)} className="flex-1 min-w-[22px] h-full px-0.5 flex items-center justify-center font-mono text-[11px] sm:text-xs font-bold text-[var(--cordel-card-btn-text)] hover:text-[#b94a2c] active:scale-90 cursor-pointer" title="+5 BPM">+5</button>
        </div>

        {/* 4 Groupes de Mute Maîtres [ 1 | 2 | 3 | 4 ] */}
        <div className="shrink-0 h-full flex items-stretch border-2 border-[#1a1a1a] dark:border-[#f4ecd8]/40 shadow-[1px_1px_0_#000] overflow-hidden">
          {ALL_MUTE_GROUP_IDS.map((gid) => {
            const isAssigned = (muteGroupAssignments[gid] || []).length > 0;
            const isActive = !!activeMuteGroups[gid];
            const mgStyle = ANALOG_BUTTON_STYLES.muteGroup(isAssigned, isActive);
            return (
              <button
                key={gid}
                onClick={() => toggleMuteGroupActive(gid)}
                style={mgStyle.style}
                className={`min-w-[26px] sm:min-w-[32px] h-full px-1.5 flex items-center justify-center text-xs font-black border-r border-[#1a1a1a]/30 last:border-r-0 cursor-pointer active:translate-y-0.5 transition-transform ${mgStyle.className}`}
                title={lang === 'pt' ? `Grupo de Mute Mestre ${gid}${isActive ? ' (Mutado)' : isAssigned ? ' (Armado)' : ' (Vazio)'}` : `Groupe de Mute Maître ${gid}${isActive ? ' (Muté)' : isAssigned ? ' (Armé)' : ' (Vide)'}`}
              >
                <span>{gid}</span>
              </button>
            );
          })}
        </div>

        {/* Boucles [ ∞ | ×2 | ×4 | ×8 ] */}
        <div className="flex-[4] min-w-0 flex items-stretch bg-[var(--cordel-card-btn-bg)] border-2 border-[#1a1a1a] dark:border-[#f4ecd8]/40 shadow-[1px_1px_0_#000] overflow-hidden">
          {(['infinite', 2, 4, 8] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => onChangeLoopMode(mode)}
              className={`flex-1 min-w-[22px] h-full px-0.5 font-cactus font-bold text-[11px] sm:text-xs transition-colors flex items-center justify-center cursor-pointer border-r border-[#1a1a1a]/30 dark:border-[#f4ecd8]/20 last:border-r-0 ${
                loopMode === mode ? 'bg-[#b94a2c] text-[#f4ecd8]' : 'text-[var(--cordel-card-btn-text)] hover:bg-black/10 dark:hover:bg-white/10'
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
              : 'bg-[var(--cordel-card-btn-bg)] text-[var(--cordel-card-btn-text)] hover:border-[#b94a2c]'
          }`}
          title={lang === 'pt' ? 'Sair do loop no próximo giro' : 'Sortir de la boucle au prochain tour'}
        >
          {isLoopExitRequested ? '...' : tMobile(lang, 'exitNextLap')}
        </button>

        <button
          onClick={() => onTogglePlay({ forcePreRoll: true })}
          className="min-h-[44px] px-3 bg-[var(--cordel-card-btn-bg)] border-2 border-[var(--cordel-border)] font-cactus font-bold text-xs uppercase tracking-wide text-[var(--cordel-card-btn-text)] hover:bg-[#b94a2c] hover:text-[#f4ecd8] active:translate-y-0.5 shadow-[2px_2px_0px_var(--cordel-border)] shrink-0 flex items-center justify-center"
          title={lang === 'pt' ? 'Iniciar com contagem 4T' : 'Départ avec décompte'}
        >
          {tMobile(lang, 'depart4T')}
        </button>

        <button
          onClick={() => onTogglePlay()}
          disabled={isLoading}
          className={`min-h-[44px] px-5 border-2 border-[var(--cordel-border)] flex items-center justify-center font-cactus font-bold text-base tracking-wider shadow-[2px_2px_0px_var(--cordel-border)] active:translate-y-0.5 transition-colors gap-2 shrink-0 ${
            isPlaying ? 'bg-[#8b2a1a] text-[#f4ecd8]' : 'bg-[#15803d] text-white hover:bg-[#166534]'
          }`}
        >
          {isPlaying ? <Square size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
          <span>{isPlaying ? 'STOP' : 'PLAY'}</span>
        </button>
      </div>
    </footer>
  );
};
