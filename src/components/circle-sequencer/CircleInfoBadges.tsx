
import React from 'react';
import { useSequencerStore } from '../../stores/useSequencerStore';

interface CircleInfoBadgesProps {
  timeSig: string;
  activeBpm: number;
  activeVol: number;
  lang?: string;
  hideBpmBadge?: boolean;
  hideFormulaBadge?: boolean;
}

export const CircleInfoBadges: React.FC<CircleInfoBadgesProps> = ({
  timeSig,
  activeBpm,
  activeVol,
  lang: propLang,
  hideBpmBadge = false,
  hideFormulaBadge = false,
}) => {
  const storeLang = useSequencerStore((s) => s.lang);
  const lang = propLang || storeLang || 'pt';

  return (
    <>
      {!hideFormulaBadge && (
        <div className="absolute top-2 right-2 md:top-4 md:right-4 bg-[var(--cordel-bg)]/95 text-[var(--cordel-text)] cordel-border-sm p-1.5 px-2.5 md:p-2 md:px-3.5 shadow-[3px_3px_0px_var(--cordel-border)] md:shadow-[4px_4px_0px_var(--cordel-border)] flex flex-col items-end min-w-[90px] md:min-w-[120px] z-20 pointer-events-none">
          <span className="text-[8px] md:text-[9px] uppercase opacity-65 tracking-wider font-bold">
            {lang === 'pt' ? 'Fórmula' : 'Rythme'}
          </span>
          <span className="text-sm md:text-lg font-cactus font-bold leading-tight">{timeSig}</span>
        </div>
      )}

      {!hideBpmBadge && (
        <div className="absolute bottom-2 left-2 md:bottom-4 md:left-4 bg-[var(--cordel-bg)]/95 text-[var(--cordel-text)] cordel-border-sm p-1.5 px-2.5 md:p-2 md:px-3.5 shadow-[3px_3px_0px_var(--cordel-border)] md:shadow-[4px_4px_0px_var(--cordel-border)] flex flex-col items-start min-w-[90px] md:min-w-[120px] z-20 pointer-events-none">
          <span className="text-[8px] md:text-[9px] uppercase opacity-65 tracking-wider font-bold">Tempo</span>
          <span className="text-sm md:text-lg font-cactus font-bold leading-tight">
            {activeBpm} <span className="text-[10px] md:text-xs font-sans font-bold">BPM</span>
          </span>
        </div>
      )}

      <div className="absolute bottom-2 right-2 md:bottom-4 md:right-4 bg-[var(--cordel-bg)]/95 text-[var(--cordel-text)] cordel-border-sm p-1.5 px-2.5 md:p-2 md:px-3.5 shadow-[3px_3px_0px_var(--cordel-border)] md:shadow-[4px_4px_0px_var(--cordel-border)] flex flex-col items-end min-w-[90px] md:min-w-[120px] z-20 pointer-events-none">
        <span className="text-[8px] md:text-[9px] uppercase opacity-65 tracking-wider font-bold">Volume</span>
        <span className="text-sm md:text-lg font-cactus font-bold leading-tight">{activeVol}%</span>
      </div>
    </>
  );
};
