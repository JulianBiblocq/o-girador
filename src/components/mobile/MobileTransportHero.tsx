import React, { useRef, useEffect } from 'react';
import { RotateCcw } from 'lucide-react';
import { useMuteGroupStore } from '../../stores/useMuteGroupStore';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { useTapTempo } from '../../hooks/useTapTempo';
import { tMobile } from '../../i18n/mobileTranslations';
import { ALL_MUTE_GROUP_IDS, ANALOG_BUTTON_STYLES } from './mobileFamilyConfig';
import { subscribeToTick, unsubscribeFromTick } from '../../audio/visualTickBuffer';
import { getEffectiveBpm } from '../../utils/bpmUtils';
import { CordelTransportTrio } from '../transport/CordelTransportTrio';

interface Props {
  isPlaying: boolean; isLoading: boolean; onTogglePlay: (opts?: any) => void; onStop: () => void; onRewind?: () => void;
  bpm: number; onChangeBpm: (delta: number) => void; onResetBpm: () => void;
  loopMode: 'infinite' | number; onChangeLoopMode: (mode: 'infinite' | number) => void;
  isLoopExitRequested: boolean; onRequestLoopExit: () => void;
}

export const MobileTransportHero: React.FC<Props> = ({
  isPlaying, isLoading, onTogglePlay, onStop, onRewind, bpm, onChangeBpm, onResetBpm,
  loopMode, onChangeLoopMode, isLoopExitRequested, onRequestLoopExit,
}) => {
  const lang = useSequencerStore((s) => s.lang);
  const activeMuteGroups = useMuteGroupStore((s) => s.activeMuteGroups);
  const muteGroupAssignments = useMuteGroupStore((s) => s.muteGroupAssignments);
  const toggleMuteGroupActive = useMuteGroupStore((s) => s.toggleMuteGroupActive);
  const { registerTap } = useTapTempo();
  const bpmSpanRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!isPlaying) return;
    let lastM = -1;
    const handleTick = (evt: any) => {
      if (!evt || evt.step < 0 || evt.isPreRoll) return;
      if (evt.measure !== lastM && bpmSpanRef.current) {
        lastM = evt.measure;
        const st = useSequencerStore.getState();
        const txt = String(getEffectiveBpm(st.bpm, st.measureBpms, evt.measure));
        if (bpmSpanRef.current.textContent !== txt) bpmSpanRef.current.textContent = txt;
      }
    };
    subscribeToTick(handleTick);
    return () => unsubscribeFromTick(handleTick);
  }, [isPlaying]);

  return (
    <footer className="w-full bg-[var(--cordel-surface)] border-t-2 border-[var(--cordel-border)] flex flex-col gap-1.5 p-2 shrink-0 select-none">
      {/* 1. Ligne Supérieure : Tempo, Groupes de Mute Maîtres, Boucles */}
      <div className="w-full h-9 flex items-stretch justify-between gap-1 sm:gap-2 min-w-0">
        {/* Tempo [-5] [-1] [ BPM ] [ ↺ ] [+1] [+5] */}
        <div className="flex-[5] min-w-0 flex items-stretch bg-[var(--cordel-card-btn-bg)] border-2 border-[var(--cordel-border-strong)] shadow-[1px_1px_0_var(--cordel-shadow-color)]">
          <button onClick={() => onChangeBpm(-5)} className="flex-1 min-w-0 h-full px-0.5 flex items-center justify-center font-mono text-[10px] sm:text-xs font-bold text-[var(--cordel-card-btn-text)] hover:text-[var(--cordel-accent)] active:scale-90 cursor-pointer" title="-5 BPM">-5</button>
          <button onClick={() => onChangeBpm(-1)} className="flex-1 min-w-0 h-full px-0.5 flex items-center justify-center font-mono text-[10px] sm:text-xs font-bold text-[var(--cordel-card-btn-text)] hover:text-[var(--cordel-accent)] active:scale-90 border-l border-[var(--cordel-border)] cursor-pointer" title="-1 BPM">-1</button>
          <button onClick={registerTap} className="flex-[1.3] min-w-[26px] h-full px-0.5 flex items-center justify-center font-cactus text-[11px] sm:text-xs font-extrabold tabular-nums text-[var(--cordel-card-btn-text)] hover:text-[var(--cordel-accent)] active:scale-95 border-l border-[var(--cordel-border)] cursor-pointer" title="Tap Tempo">
            <span ref={bpmSpanRef}>{bpm}</span>
          </button>
          <button onClick={onResetBpm} className="flex-1 min-w-0 h-full px-0.5 flex items-center justify-center text-[var(--cordel-accent)] hover:bg-[var(--cordel-text)]/10 active:scale-95 border-l border-r border-[var(--cordel-border)] cursor-pointer" title="Reset BPM">
            <RotateCcw size={10} />
          </button>
          <button onClick={() => onChangeBpm(1)} className="flex-1 min-w-0 h-full px-0.5 flex items-center justify-center font-mono text-[10px] sm:text-xs font-bold text-[var(--cordel-card-btn-text)] hover:text-[var(--cordel-accent)] active:scale-90 border-r border-[var(--cordel-border)] cursor-pointer" title="+1 BPM">+1</button>
          <button onClick={() => onChangeBpm(5)} className="flex-1 min-w-0 h-full px-0.5 flex items-center justify-center font-mono text-[10px] sm:text-xs font-bold text-[var(--cordel-card-btn-text)] hover:text-[var(--cordel-accent)] active:scale-90 cursor-pointer" title="+5 BPM">+5</button>
        </div>

        {/* 4 Groupes de Mute Maîtres [ 1 | 2 | 3 | 4 ] */}
        <div className="shrink-0 h-full flex items-stretch border-2 border-[var(--cordel-border-strong)] shadow-[1px_1px_0_var(--cordel-shadow-color)] overflow-hidden">
          {ALL_MUTE_GROUP_IDS.map((gid) => {
            const isAssigned = (muteGroupAssignments[gid] || []).length > 0;
            const isActive = !!activeMuteGroups[gid];
            const mgStyle = ANALOG_BUTTON_STYLES.muteGroup(isAssigned, isActive);
            return (
              <button
                key={gid}
                onClick={() => toggleMuteGroupActive(gid)}
                style={mgStyle.style}
                className={`w-[22px] sm:min-w-[30px] h-full px-1 flex items-center justify-center text-[11px] sm:text-xs font-black border-r border-[var(--cordel-border)] last:border-r-0 cursor-pointer active:translate-y-0.5 transition-transform ${mgStyle.className}`}
                title={lang === 'pt' ? `Grupo de Mute Mestre ${gid}${isActive ? ' (Mutado)' : isAssigned ? ' (Armado)' : ' (Vazio)'}` : `Groupe de Mute Maître ${gid}${isActive ? ' (Muté)' : isAssigned ? ' (Armé)' : ' (Vide)'}`}
              >
                <span>{gid}</span>
              </button>
            );
          })}
        </div>

        {/* Boucles [ ×1 | ×2 | ×4 | ×8 | ∞ ] */}
        <div className="flex-[4] min-w-0 flex items-stretch bg-[var(--cordel-card-btn-bg)] border-2 border-[var(--cordel-border-strong)] shadow-[1px_1px_0_var(--cordel-shadow-color)] overflow-hidden">
          {([1, 2, 4, 8, 'infinite'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => onChangeLoopMode(mode)}
              className={`flex-1 min-w-0 h-full px-0.5 font-cactus font-bold text-[10px] sm:text-xs transition-colors flex items-center justify-center cursor-pointer border-r border-[var(--cordel-border)] last:border-r-0 ${
                loopMode === mode ? 'bg-[var(--cordel-accent)] text-[var(--cordel-on-accent)]' : 'text-[var(--cordel-card-btn-text)] hover:bg-[var(--cordel-text)]/10'
              }`}
            >
              {mode === 'infinite' ? '∞' : `×${mode}`}
            </button>
          ))}
        </div>
      </div>

      {/* 2. Ligne Inférieure : Sortie de boucle, Départ 4 temps et Trio [ ⏮ ] [ ▶/⏸ ] [ ⏹ ] */}
      <div className="w-full flex items-center gap-1 sm:gap-1.5 min-w-0">
        <button
          onClick={onRequestLoopExit}
          className={`flex-1 min-w-0 min-h-[42px] px-1.5 py-1.5 border-2 border-[var(--cordel-border-strong)] font-cactus font-bold text-[10px] sm:text-xs uppercase tracking-wide active:translate-y-0.5 shadow-[2px_2px_0px_var(--cordel-shadow-color)] text-center truncate transition-all cursor-pointer ${
            isLoopExitRequested
              ? 'bg-[var(--cordel-accent)] text-[var(--cordel-on-accent)] animate-pulse'
              : 'bg-[var(--cordel-card-btn-bg)] text-[var(--cordel-card-btn-text)] hover:border-[var(--cordel-accent)]'
          }`}
          title={lang === 'pt' ? 'Sair do loop no próximo giro' : 'Sortir de la boucle au prochain tour'}
        >
          {isLoopExitRequested ? '...' : tMobile(lang, 'exitNextLap')}
        </button>

        <button
          onClick={() => onTogglePlay({ forcePreRoll: true })}
          className="min-h-[42px] px-2 sm:px-3 bg-[var(--cordel-card-btn-bg)] border-2 border-[var(--cordel-border-strong)] font-cactus font-bold text-[10px] sm:text-xs uppercase tracking-wide text-[var(--cordel-card-btn-text)] hover:bg-[var(--cordel-accent)] hover:text-[var(--cordel-on-accent)] active:translate-y-0.5 shadow-[2px_2px_0px_var(--cordel-shadow-color)] shrink-0 flex items-center justify-center cursor-pointer"
          title={lang === 'pt' ? 'Iniciar com contagem 4T' : 'Départ avec décompte'}
        >
          {tMobile(lang, 'depart4T')}
        </button>

        <CordelTransportTrio
          isPlaying={isPlaying} isLoading={isLoading}
          onTogglePlay={() => onTogglePlay()} onStop={onStop} onRewind={onRewind || onStop}
          lang={lang} variant="mobile"
        />
      </div>
    </footer>
  );
};
