import React from 'react';
import { Loader2 } from 'lucide-react';
import { PernambucoEstandarteWithMast } from './LandingWoodenStructures';

interface LandingHeroBrandProps {
  onEnterRoda: (e?: React.MouseEvent | React.TouchEvent) => void;
  isFr: boolean;
  isToneReady: boolean;
  isUnlocking: boolean;
}

export const LandingHeroBrand: React.FC<LandingHeroBrandProps> = ({
  onEnterRoda,
  isFr,
  isToneReady,
  isUnlocking,
}) => {
  const isBusy = !isToneReady || isUnlocking;

  return (
    <div className="inline-flex flex-col items-end mt-14 sm:mt-16 md:mt-20 lg:mt-24">
      <div className="flex items-center justify-center gap-2.5 sm:gap-4 md:gap-5">
        <div className="relative w-24 h-24 sm:w-32 sm:h-32 md:w-40 md:h-40 lg:w-48 lg:h-48 flex items-center justify-center flex-shrink-0 text-[var(--cordel-text)]">
          <svg className="lp-alfaia-svg w-full h-full" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <circle cx="50" cy="50" r="48" fill="none" stroke="currentColor" strokeWidth="1.3" />
            <circle cx="50" cy="50" r="38" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="2 2" />
            <path d="M 50 2 L 65 12 L 50 22 L 35 12 Z" fill="none" stroke="currentColor" strokeWidth="1" />
            <path d="M 84 16 L 90 30 L 78 38 L 70 24 Z" fill="none" stroke="currentColor" strokeWidth="1" />
            <path d="M 98 50 L 88 65 L 78 50 L 88 35 Z" fill="none" stroke="currentColor" strokeWidth="1" />
            <path d="M 84 84 L 70 90 L 60 78 L 74 70 Z" fill="none" stroke="currentColor" strokeWidth="1" />
            <path d="M 50 98 L 35 88 L 50 78 L 65 88 Z" fill="none" stroke="currentColor" strokeWidth="1" />
            <path d="M 16 84 L 10 70 L 22 62 L 30 76 Z" fill="none" stroke="currentColor" strokeWidth="1" />
            <path d="M 2 50 L 12 35 L 22 50 L 12 65 Z" fill="none" stroke="currentColor" strokeWidth="1" />
            <path d="M 16 16 L 30 10 L 40 22 L 26 30 Z" fill="none" stroke="currentColor" strokeWidth="1" />
          </svg>
          <button
            type="button"
            onClick={onEnterRoda}
            disabled={isBusy}
            className={`lp-entra-btn cursor-pointer z-10 ${!isToneReady ? 'opacity-50 cursor-not-allowed' : ''}`}
            title={isFr ? 'Entrer dans la Roda' : 'Entrar na Roda'}
          >
            {isBusy ? (
              <Loader2 className="w-5 h-5 animate-spin stroke-current" />
            ) : (
              <>ENTRA<br />NA RODA</>
            )}
          </button>
        </div>

        <div
          style={{ fontFamily: "'Cactus', 'Cinzel Decorative', Georgia, serif" }}
          className="font-cactus-display text-5xl sm:text-7xl md:text-8xl lg:text-[9.5rem] font-bold tracking-tight text-[var(--cordel-text)] leading-[0.88] select-none flex items-baseline lino-distressed"
          aria-label="O Girador"
        >
          <span>G</span>
          <span className="relative inline-flex flex-col items-center">
            <span className="absolute bottom-[98%] left-[44%] -translate-x-1/2 flex flex-col items-center pointer-events-none z-30 text-[var(--cordel-text)]">
              <PernambucoEstandarteWithMast />
            </span>
            <span>I</span>
          </span>
          <span>RADOR</span>
        </div>
      </div>

      <div className="mt-1 sm:mt-1.5 mr-0.5 sm:mr-1">
        <span
          style={{ fontFamily: "'Cactus', 'Cinzel Decorative', Georgia, serif" }}
          className="inline-block px-3 sm:px-4 py-0.5 sm:py-1 font-cactus-display font-bold text-xs sm:text-sm md:text-lg uppercase cordel-stamp-red bg-[var(--cordel-surface-elevated)] rotate-[-1deg]"
        >
          <span className="lino-distressed font-bold translate-x-[0.09em]">SEQUENCIADOR</span>
        </span>
      </div>
    </div>
  );
};
