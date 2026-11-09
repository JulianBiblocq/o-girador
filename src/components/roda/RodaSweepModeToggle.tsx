import React from 'react';
import { useSequencerStore } from '../../stores/useSequencerStore';

interface RodaSweepModeToggleProps {
  compact?: boolean;
  fullWidth?: boolean;
}

export const RodaSweepModeToggle: React.FC<RodaSweepModeToggleProps> = ({
  compact = false,
  fullWidth = false,
}) => {
  const lang = useSequencerStore((s) => s.lang);
  const rodaSweepMode = useSequencerStore((s) => s.rodaSweepMode || 'sweep6h');
  const toggleRodaSweepMode = useSequencerStore((s) => s.toggleRodaSweepMode);
  const isSweep6h = rodaSweepMode === 'sweep6h';

  const label = isSweep6h
    ? lang === 'pt'
      ? 'Progressivo'
      : 'Progressif'
    : lang === 'pt'
      ? 'Por compasso'
      : 'Par mesure';

  const title = isSweep6h
    ? lang === 'pt'
      ? 'Substituição progressiva dos passos durante a leitura'
      : 'Remplacement progressif des pas au fil de la lecture'
    : lang === 'pt'
      ? 'Mudança do compasso inteiro no 1º tempo'
      : "Changement de toute la mesure d'un coup au 1er temps";

  if (fullWidth) {
    return (
      <button
        type="button"
        onClick={toggleRodaSweepMode}
        title={title}
        className={`p-2 border-2 border-[var(--cordel-border)] font-cactus font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-colors ${
          isSweep6h
            ? 'bg-[var(--cordel-surface)] text-[var(--cordel-text)]'
            : 'bg-[var(--cordel-card-btn-bg)] text-[var(--cordel-card-btn-text)]'
        }`}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 3v9l6 6" />
        </svg>
        <span>{`Roda : ${label}`}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggleRodaSweepMode}
      title={title}
      className={`${
        compact ? 'h-[32px] min-h-[32px] max-h-[32px] px-2' : 'h-[38px] min-h-[38px] max-h-[38px] px-2.5'
      } rounded-none bg-[#f4ecd8] dark:bg-[#e2d7c0] text-[#1a1a1a] border-2 border-[#1a1a1a] shadow-[2px_2px_0px_#1a1a1a] box-border flex flex-col items-center justify-center select-none shrink-0 cursor-pointer hover:bg-[#1a1a1a] hover:text-[#f4ecd8] transition-colors active:scale-95`}
    >
      <span className={`${compact ? 'text-[7px]' : 'text-[8px]'} uppercase opacity-75 tracking-wider font-bold leading-none`}>
        {lang === 'pt' ? 'Leitura Roda' : 'Lecture Roda'}
      </span>
      <span className={`${compact ? 'text-[10px]' : 'text-[11px]'} font-cactus font-bold leading-tight mt-0.5 flex items-center gap-1`}>
        <span>{label}</span>
      </span>
    </button>
  );
};

