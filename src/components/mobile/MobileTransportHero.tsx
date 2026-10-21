import React from 'react';
import { Play, Square, SkipBack, Loader2, ArrowRightToLine, Clock } from 'lucide-react';
import { useSequencerStore } from '../../stores/useSequencerStore';

interface Props {
  isPlaying: boolean;
  isLoading: boolean;
  onTogglePlay: (opts?: any) => void;
  onStop: () => void;
}

export const MobileTransportHero: React.FC<Props> = ({
  isPlaying,
  isLoading,
  onTogglePlay,
  onStop,
}) => {
  const isLooping = useSequencerStore((s) => s.isLooping);
  const setIsLooping = useSequencerStore((s) => s.setIsLooping);
  const loopMode = useSequencerStore((s) => s.loopMode);
  const setLoopMode = useSequencerStore((s) => s.setLoopMode);
  const isLoopExitRequested = useSequencerStore((s) => s.isLoopExitRequested);
  const requestLoopExit = useSequencerStore((s) => s.requestLoopExit);
  const clearLoopExitRequest = useSequencerStore((s) => s.clearLoopExitRequest);

  const handleExitToggle = () => {
    if (!isPlaying) return;
    if (isLoopExitRequested) {
      clearLoopExitRequest();
    } else {
      requestLoopExit();
    }
  };

  return (
    <div className="w-full bg-[var(--cordel-bg)] border-t-2 border-[var(--cordel-border)] px-3 py-2 flex flex-col gap-2 shrink-0 select-none shadow-lg">
      <div className="flex items-center justify-between gap-1.5">
        <div className="flex items-center gap-1">
          {(['infinite', 2, 4] as const).map((mode) => {
            const active = loopMode === mode;
            return (
              <button
                key={String(mode)}
                onClick={() => {
                  setLoopMode(mode);
                  if (!isLooping) setIsLooping(true);
                }}
                className={`px-2 py-1 cordel-border-sm font-cactus font-bold text-xs uppercase transition-all ${
                  active
                    ? 'bg-[var(--cordel-wood)] text-[#f4ecd8] shadow-[2px_2px_0px_#000]'
                    : 'bg-[var(--cordel-bg)] text-[var(--cordel-text)] opacity-70'
                }`}
              >
                {mode === 'infinite' ? '∞' : `×${mode}`}
              </button>
            );
          })}
        </div>

        <button
          onClick={handleExitToggle}
          disabled={!isPlaying}
          className={`flex-1 py-1.5 px-2 cordel-border-sm font-cactus font-bold text-xs uppercase flex items-center justify-center gap-1.5 transition-all ${
            isLoopExitRequested
              ? 'bg-[#e67e22] text-white animate-pulse shadow-[2px_2px_0px_#000]'
              : 'bg-[var(--cordel-bg)] text-[var(--cordel-text)] disabled:opacity-30'
          }`}
          title="Finir le tour en cours et sortir au Temps 1 suivant"
        >
          <ArrowRightToLine size={14} />
          <span>{isLoopExitRequested ? 'Sortie au T.1...' : 'Sortir au tour'}</span>
        </button>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onStop}
          className="w-12 h-14 cordel-border cordel-button bg-[var(--cordel-bg)] text-[var(--cordel-text)] flex items-center justify-center shrink-0"
          title="Retour Mesure 1"
        >
          <SkipBack size={20} fill="currentColor" />
        </button>

        <button
          onClick={() => onTogglePlay()}
          disabled={isLoading}
          className={`flex-1 h-14 cordel-border cordel-button flex items-center justify-center gap-2 font-cactus font-bold text-xl uppercase transition-transform active:scale-98 ${
            isLoading
              ? 'bg-gray-400 text-gray-700 cursor-wait'
              : isPlaying
              ? 'bg-[#f1c40f] text-[#1a1a1a] shadow-[4px_4px_0px_#000]'
              : 'bg-[#27ae60] text-white shadow-[4px_4px_0px_#000]'
          }`}
        >
          {isLoading ? (
            <Loader2 size={24} className="animate-spin" />
          ) : isPlaying ? (
            <>
              <Square size={20} fill="currentColor" />
              <span>Pause</span>
            </>
          ) : (
            <>
              <Play size={24} fill="currentColor" />
              <span>Lancer</span>
            </>
          )}
        </button>

        <button
          onClick={() => onTogglePlay({ forcePreRoll: true })}
          disabled={isLoading || isPlaying}
          className="px-2.5 h-14 cordel-border cordel-button bg-[#d35400] text-white flex flex-col items-center justify-center gap-0.5 shrink-0 disabled:opacity-40"
          title="Décompte 4 temps avant départ (pour aller danser)"
        >
          <Clock size={16} />
          <span className="font-cactus font-bold text-[10px] uppercase leading-none">
            4 Temps
          </span>
        </button>
      </div>
    </div>
  );
};
