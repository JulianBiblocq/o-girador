/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState, useEffect } from 'react';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { CompassoSelector } from '../CompassoSelector';
import { RodaSectionRibbon } from './RodaSectionRibbon';
import { PistasMestreSignalBadge } from './PistasMestreSignalBadge';

interface RodaCentralTopBarProps {
  className?: string;
  isPistasOpen?: boolean;
  rightAction?: React.ReactNode;
}

export const RodaCentralTopBar: React.FC<RodaCentralTopBarProps> = ({ className = '', isPistasOpen = false, rightAction }) => {
  const lang = useSequencerStore((s) => s.lang);
  const timeSig = useSequencerStore((s) => s.timeSig);
  const currentMeasure = useSequencerStore((s) => s.currentMeasure);
  const measureTimeSigs = useSequencerStore((s) => s.measureTimeSigs);
  const activeTimeSig = (measureTimeSigs && measureTimeSigs[currentMeasure]) || timeSig;

  const containerRef = useRef<HTMLDivElement>(null);
  const [isNarrow, setIsNarrow] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      if (entries[0]) setIsNarrow(entries[0].contentRect.width < 620);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const borderBgClass = isPistasOpen
    ? 'bg-[var(--cordel-bg)] border-b border-[var(--cordel-border,#1a1a1a)]/20 shadow-sm'
    : 'bg-transparent';

  if (isNarrow) {
    return (
      <div
        ref={containerRef}
        className={`relative w-full px-3 flex flex-col gap-1.5 py-1 z-20 pointer-events-auto select-none transition-colors duration-300 ${borderBgClass} ${className}`}
      >
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-1.5 shrink-0 z-10">
            <CompassoSelector className="shrink-0" />
            <PistasMestreSignalBadge isPistasOpen={isPistasOpen} />
          </div>
          <div className="flex items-center gap-1.5 shrink-0 z-10">
            <div className="h-[32px] min-h-[32px] max-h-[32px] rounded-none bg-[#f4ecd8] dark:bg-[#e2d7c0] text-[#1a1a1a] border-2 border-[#1a1a1a] shadow-[1.5px_1.5px_0px_#1a1a1a] box-border px-2 flex flex-col items-center justify-center select-none shrink-0 min-w-[65px]">
              <span className="text-[7px] uppercase opacity-75 tracking-wider font-bold leading-none">{lang === 'pt' ? 'Fórmula' : 'Rythme'}</span>
              <span className="text-[11px] font-cactus font-bold leading-tight mt-0.5">{activeTimeSig}</span>
            </div>
            {rightAction}
          </div>
        </div>
        <div className="flex justify-center w-full pointer-events-auto">
          <RodaSectionRibbon compact />
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`relative w-full px-3 flex items-center justify-between gap-2 z-20 pointer-events-auto select-none transition-colors duration-300 h-[52px] min-h-[52px] max-h-[52px] ${borderBgClass} ${className}`}
    >
      <div className="flex items-center gap-1.5 shrink-0 z-10">
        <CompassoSelector className="shrink-0" />
        <PistasMestreSignalBadge isPistasOpen={isPistasOpen} />
      </div>

      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex justify-center pointer-events-auto">
        <RodaSectionRibbon />
      </div>

      <div className="flex items-center gap-1.5 shrink-0 z-10">
        <div className="h-[38px] min-h-[38px] max-h-[38px] rounded-none bg-[#f4ecd8] dark:bg-[#e2d7c0] text-[#1a1a1a] border-2 border-[#1a1a1a] shadow-[2px_2px_0px_#1a1a1a] box-border px-2.5 flex flex-col items-center justify-center select-none shrink-0 min-w-[75px]">
          <span className="text-[8px] uppercase opacity-75 tracking-wider font-bold leading-none">
            {lang === 'pt' ? 'Fórmula' : 'Rythme'}
          </span>
          <span className="text-xs font-cactus font-bold leading-tight mt-0.5">
            {activeTimeSig}
          </span>
        </div>
        {rightAction}
      </div>
    </div>
  );
};
