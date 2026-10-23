
import React from 'react';
import { ChevronLeft, ChevronRight, Lock, Unlock } from 'lucide-react';

interface Props {
  currentMeasure: number;
  totalMeasures: number;
  onNavigatePrev: () => void;
  onNavigateNext: () => void;
  loopMode: 'infinite' | number;
  currentIteration: number;
  isLocked: boolean;
  onToggleLock: () => void;
}

export const MobileStateBar: React.FC<Props> = ({
  currentMeasure,
  totalMeasures,
  onNavigatePrev,
  onNavigateNext,
  loopMode,
  currentIteration,
  isLocked,
  onToggleLock,
}) => {
  return (
    <div className="w-full h-10 bg-[#121212] px-2 py-1 flex items-center justify-between gap-1.5 z-10 shrink-0 select-none">
      {/* Cadre Gauche : Mesure & Navigation */}
      <div className="flex items-center bg-[#1a1a1a] border-2 border-[var(--cordel-border)] px-1 py-0.5 shadow-[2px_2px_0px_var(--cordel-border)] shrink-0">
        <button
          onClick={onNavigatePrev}
          className="p-1 text-[var(--cordel-text)] hover:text-[#b94a2c] active:scale-90 transition-transform"
          aria-label="Mesure précédente"
        >
          <ChevronLeft size={14} />
        </button>
        <span className="font-mono font-bold text-[10px] sm:text-xs tracking-wider px-1 text-[var(--cordel-text)] whitespace-nowrap">
          MES. {currentMeasure + 1}/{totalMeasures}
        </span>
        <button
          onClick={onNavigateNext}
          className="p-1 text-[var(--cordel-text)] hover:text-[#b94a2c] active:scale-90 transition-transform"
          aria-label="Mesure suivante"
        >
          <ChevronRight size={14} />
        </button>
      </div>

      {/* Cadre Centre : Tour / Boucle & Crédits */}
      <div className="flex-1 min-w-0 flex flex-col items-center justify-center bg-[#1a1a1a] border-2 border-[var(--cordel-border)] px-1.5 py-0.5 shadow-[2px_2px_0px_var(--cordel-border)] overflow-hidden">
        <span className="font-cactus font-bold text-[11px] sm:text-xs tracking-wider text-[var(--cordel-text)] uppercase leading-none truncate">
          {loopMode === 'infinite' ? 'BOUCLE ∞' : `TOUR ${currentIteration} / ${loopMode}`}
        </span>
        <span className="font-mono text-[8px] text-[#f4ecd8]/60 tracking-wider truncate leading-tight mt-0.5">
          Julian Biblocq / Toni Braga
        </span>
      </div>

      {/* Cadre Droite : Verrou Danse */}
      <button
        onClick={onToggleLock}
        className={`flex items-center gap-1 px-2 py-1 border-2 border-[var(--cordel-border)] font-cactus font-bold text-[10px] sm:text-xs uppercase tracking-wider shadow-[2px_2px_0px_var(--cordel-border)] active:translate-y-0.5 transition-colors shrink-0 ${
          isLocked
            ? 'bg-[#b94a2c] text-[#f4ecd8]'
            : 'bg-[#1a1a1a] text-[var(--cordel-text)] hover:border-[#b94a2c]'
        }`}
        title={isLocked ? 'Déverrouiller les contrôles' : 'Verrouiller les contrôles'}
      >
        {isLocked ? <Lock size={12} /> : <Unlock size={12} />}
        <span>{isLocked ? 'FIGÉ' : 'VERROU'}</span>
      </button>
    </div>
  );
};
