import React, { useState } from 'react';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { Lock, Unlock, SlidersHorizontal, Music } from 'lucide-react';

interface Props {
  songTitle?: string;
  isLocked: boolean;
  onToggleLock: () => void;
  onToggleStudio: () => void;
  onOpenSongPicker: () => void;
}

export const MobileRehearsalHeader: React.FC<Props> = ({
  songTitle,
  isLocked,
  onToggleLock,
  onToggleStudio,
  onOpenSongPicker,
}) => {
  const bpm = useSequencerStore((s) => s.bpm);
  const setBpm = useSequencerStore((s) => s.setBpm);
  const loopMode = useSequencerStore((s) => s.loopMode);
  const currentLoopIteration = useSequencerStore((s) => s.currentLoopIteration);
  const currentMeasure = useSequencerStore((s) => s.currentMeasure);

  const loopLabel = loopMode === 'infinite' ? '∞' : `${currentLoopIteration}/${loopMode}`;

  return (
    <header className="w-full bg-[var(--cordel-bg)] border-b-2 border-[var(--cordel-border)] px-3 py-2 flex flex-col gap-2 shrink-0 select-none shadow-xs">
      <div className="flex items-center justify-between gap-2">
        <button
          onClick={onOpenSongPicker}
          className="flex items-center gap-1.5 px-2.5 py-1 cordel-border-sm bg-[var(--cordel-bg)] text-[var(--cordel-text)] font-cactus font-bold text-xs uppercase hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] truncate max-w-[55%]"
          title="Changer de morceau"
        >
          <Music size={13} className="shrink-0 text-[#d99b26]" />
          <span className="truncate">{songTitle || 'Morceau'}</span>
        </button>

        <div className="flex items-center gap-1.5 shrink-0">
          <span className="font-mono text-xs font-bold px-2 py-0.5 cordel-border-sm bg-black/5 text-[var(--cordel-text)]">
            M.{currentMeasure + 1} • {loopLabel}
          </span>
          <button
            onClick={onToggleLock}
            className={`p-1.5 cordel-border-sm font-bold transition-colors ${
              isLocked ? 'bg-red-600 text-white animate-pulse' : 'bg-[var(--cordel-bg)] text-[var(--cordel-text)]'
            }`}
            title={isLocked ? 'Déverrouiller les contrôles' : 'Verrouiller les faders en danse'}
          >
            {isLocked ? <Lock size={14} /> : <Unlock size={14} />}
          </button>
          <button
            onClick={onToggleStudio}
            className="p-1.5 cordel-border-sm bg-[var(--cordel-bg)] text-[var(--cordel-text)] hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)]"
            title="Mode Studio / Roda"
          >
            <SlidersHorizontal size={14} />
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between gap-1 bg-black/5 p-1 cordel-border-sm">
        <button
          disabled={isLocked}
          onClick={() => setBpm(Math.max(40, bpm - 5))}
          className="px-2 py-1 cordel-border-sm bg-[var(--cordel-bg)] font-mono font-bold text-xs disabled:opacity-40"
        >
          -5
        </button>
        <button
          disabled={isLocked}
          onClick={() => setBpm(Math.max(40, bpm - 1))}
          className="px-2 py-1 cordel-border-sm bg-[var(--cordel-bg)] font-mono font-bold text-xs disabled:opacity-40"
        >
          -1
        </button>
        <div className="flex items-center gap-1 font-cactus font-bold text-base px-2">
          <span>{bpm}</span>
          <span className="text-[10px] opacity-70">BPM</span>
        </div>
        <button
          disabled={isLocked}
          onClick={() => setBpm(Math.min(220, bpm + 1))}
          className="px-2 py-1 cordel-border-sm bg-[var(--cordel-bg)] font-mono font-bold text-xs disabled:opacity-40"
        >
          +1
        </button>
        <button
          disabled={isLocked}
          onClick={() => setBpm(Math.min(220, bpm + 5))}
          className="px-2 py-1 cordel-border-sm bg-[var(--cordel-bg)] font-mono font-bold text-xs disabled:opacity-40"
        >
          +5
        </button>
      </div>
    </header>
  );
};
