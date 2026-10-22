/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { CompassoSelector } from '../CompassoSelector';
import { RodaSectionRibbon } from './RodaSectionRibbon';
import { PistasMestreSignalBadge } from './PistasMestreSignalBadge';

interface RodaCentralTopBarProps {
  className?: string;
  isPistasOpen?: boolean;
}

export const RodaCentralTopBar: React.FC<RodaCentralTopBarProps> = ({ className = '', isPistasOpen = false }) => {
  const lang = useSequencerStore((s) => s.lang);
  const timeSig = useSequencerStore((s) => s.timeSig);
  const currentMeasure = useSequencerStore((s) => s.currentMeasure);
  const measureTimeSigs = useSequencerStore((s) => s.measureTimeSigs);
  const activeTimeSig = (measureTimeSigs && measureTimeSigs[currentMeasure]) || timeSig;

  return (
    <div
      className={`flex items-center justify-between w-full gap-2 z-20 pointer-events-auto select-none transition-colors duration-300 relative ${
        isPistasOpen ? 'bg-[var(--cordel-bg)] border-b border-[var(--cordel-border,#1a1a1a)]/20 shadow-sm' : 'bg-transparent'
      } ${className}`}
    >
      {/* À gauche : [ < MESURE X / Y > ] + Mestre Signal Badge (uniquement en vue PISTES) */}
      <div className="flex items-center gap-1.5 shrink-0 z-10">
        <CompassoSelector className="shrink-0" />
        <PistasMestreSignalBadge isPistasOpen={isPistasOpen} />
      </div>

      {/* Au centre : Ruban Défilant des Sections (Centrage absolu garanti !) */}
      <div className="absolute left-1/2 -translate-x-1/2 flex justify-center pointer-events-auto">
        <RodaSectionRibbon />
      </div>

      {/* À droite : [ RYTHME 4/4 ] */}
      <div className="flex flex-col items-center justify-center bg-[var(--cordel-bg)] text-[var(--cordel-text)] cordel-border-sm px-2.5 py-1 shadow-[2px_2px_0px_rgba(0,0,0,1)] select-none rounded-sm shrink-0 min-w-[75px] z-10">
        <span className="text-[8px] uppercase opacity-75 tracking-wider font-bold leading-none">
          {lang === 'pt' ? 'Fórmula' : 'Rythme'}
        </span>
        <span className="text-xs md:text-sm font-cactus font-bold leading-tight mt-0.5">
          {activeTimeSig}
        </span>
      </div>
    </div>
  );
};
