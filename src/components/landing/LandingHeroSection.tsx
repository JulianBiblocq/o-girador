import React from 'react';
import { Loader2 } from 'lucide-react';
import { PernambucoEstandarteWithMast } from './LandingWoodenStructures';

interface LandingHeroSectionProps {
  isFr: boolean;
  isToneReady: boolean;
  isUnlocking: boolean;
  onEnterRoda: (e?: React.MouseEvent | React.TouchEvent) => void;
}

export const LandingHeroSection: React.FC<LandingHeroSectionProps> = ({
  isFr,
  isToneReady,
  isUnlocking,
  onEnterRoda,
}) => {
  return (
    <section className="w-full relative flex flex-col items-center text-center px-4 pt-4 sm:pt-6 md:pt-8 lg:pt-10 pb-4 max-w-5xl mx-auto z-20">
      <div className="flex flex-col items-center w-full">
        <div className="flex items-center justify-center gap-2 sm:gap-4 md:gap-6">
          <div className="relative w-32 h-32 sm:w-44 sm:h-44 md:w-56 md:h-56 lg:w-64 lg:h-64 flex items-center justify-center flex-shrink-0">
            <svg className="lp-alfaia-svg w-full h-full" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
              <circle cx="50" cy="50" r="48" fill="none" stroke="#1a1a1a" strokeWidth="1.2" />
              <circle cx="50" cy="50" r="38" fill="none" stroke="#1a1a1a" strokeWidth="0.9" strokeDasharray="2 2" />
              <path d="M 50 2 L 65 12 L 50 22 L 35 12 Z" fill="none" stroke="#1a1a1a" strokeWidth="0.9" />
              <path d="M 84 16 L 90 30 L 78 38 L 70 24 Z" fill="none" stroke="#1a1a1a" strokeWidth="0.9" />
              <path d="M 98 50 L 88 65 L 78 50 L 88 35 Z" fill="none" stroke="#1a1a1a" strokeWidth="0.9" />
              <path d="M 84 84 L 70 90 L 60 78 L 74 70 Z" fill="none" stroke="#1a1a1a" strokeWidth="0.9" />
              <path d="M 50 98 L 35 88 L 50 78 L 65 88 Z" fill="none" stroke="#1a1a1a" strokeWidth="0.9" />
              <path d="M 16 84 L 10 70 L 22 62 L 30 76 Z" fill="none" stroke="#1a1a1a" strokeWidth="0.9" />
              <path d="M 2 50 L 12 35 L 22 50 L 12 65 Z" fill="none" stroke="#1a1a1a" strokeWidth="0.9" />
              <path d="M 16 16 L 30 10 L 40 22 L 26 30 Z" fill="none" stroke="#1a1a1a" strokeWidth="0.9" />
            </svg>
            <button
              type="button"
              onClick={onEnterRoda}
              disabled={!isToneReady || isUnlocking}
              className={`lp-entra-btn cursor-pointer z-10 transition-all ${!isToneReady ? 'opacity-50 cursor-not-allowed' : ''}`}
              title={isFr ? "Entrer dans la Roda" : "Entrar na Roda"}
            >
              {!isToneReady || isUnlocking ? (
                <span className="flex items-center justify-center text-xl sm:text-2xl"><Loader2 className="w-6 h-6 animate-spin text-current" /></span>
              ) : isFr ? (
                <>ENTRER<br/>DANS LA<br/>RODA</>
              ) : (
                <>ENTRA<br/>NA RODA</>
              )}
            </button>
          </div>

          <div className="flex flex-col items-end">
            <div
              style={{ fontFamily: "'Cactus', 'Cinzel Decorative', Georgia, serif" }}
              className="font-cactus-display text-5xl sm:text-7xl md:text-8xl lg:text-[10.5rem] font-bold tracking-tight text-[#1a1a1a] leading-none select-none flex items-baseline lino-distressed"
            >
              <span>G</span>
              <span className="relative inline-flex flex-col items-center">
                <span className="absolute bottom-[96%] left-[44%] -translate-x-1/2 flex flex-col items-center pointer-events-none z-30">
                  <PernambucoEstandarteWithMast />
                </span>
                <span>I</span>
              </span>
              <span>RADOR</span>
            </div>
            <div className="self-end mt-1 sm:mt-2 translate-x-1 sm:translate-x-2">
              <span
                style={{ fontFamily: "'Cactus', 'Cinzel Decorative', Georgia, serif" }}
                className="inline-block px-3 sm:px-4 py-1 font-cactus-display font-bold text-sm sm:text-base md:text-xl uppercase cordel-stamp-red shadow-[2px_2px_0px_#8b2a1a] rotate-[-1deg]"
              >
                <span className="lino-distressed font-bold translate-x-[0.09em]">SEQUENCIADOR</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      <p className="font-serif italic text-sm sm:text-base md:text-lg text-[#1a1a1a]/80 text-center max-w-xl mx-auto mt-4 px-4 leading-relaxed">
        {isFr ? 'Le séquenceur circulaire du Maracatu de Baque Virado' : 'O sequenciador circular do Maracatu de Baque Virado'}
      </p>
    </section>
  );
};
