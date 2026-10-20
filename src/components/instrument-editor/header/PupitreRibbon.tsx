/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Language } from '../../../types';
import { PupitreRibbonChip } from './PupitreRibbonChip';

export interface PupitreRibbonProps {
  visibleTrackIds: number[];
  activeTrackId: number;
  onSelectTrack: (trackId: number) => void;
  onContextMenu: (trackId: number, x: number, y: number) => void;
  addBtnRef: React.RefObject<HTMLButtonElement | null>;
  isAddPickerOpen: boolean;
  onToggleAddPicker: () => void;
  lang: Language;
}

export const PupitreRibbon: React.FC<PupitreRibbonProps> = React.memo(({
  visibleTrackIds,
  activeTrackId,
  onSelectTrack,
  onContextMenu,
  addBtnRef,
  isAddPickerOpen,
  onToggleAddPicker,
  lang,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 2);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 2);
  }, []);

  useEffect(() => {
    updateScrollState();
    const el = scrollRef.current;
    if (!el) return;

    const ro = new ResizeObserver(() => updateScrollState());
    ro.observe(el);
    return () => ro.disconnect();
  }, [updateScrollState, visibleTrackIds]);

  const handleScroll = useCallback((delta: number) => {
    scrollRef.current?.scrollBy({ left: delta, behavior: 'smooth' });
  }, []);

  const maskImage = useMemo(() => {
    if (canScrollLeft && canScrollRight) return 'linear-gradient(to right, transparent 0%, black 20px, black calc(100% - 20px), transparent 100%)';
    if (canScrollLeft) return 'linear-gradient(to right, transparent 0%, black 20px, black 100%)';
    if (canScrollRight) return 'linear-gradient(to right, black 0%, black calc(100% - 20px), transparent 100%)';
    return undefined;
  }, [canScrollLeft, canScrollRight]);

  return (
    <div className="relative flex items-center flex-1 min-w-0">
      {canScrollLeft && (
        <button
          type="button"
          onClick={() => handleScroll(-160)}
          title={lang === 'fr' ? 'Défiler à gauche' : 'Rolar para a esquerda'}
          className="absolute left-0 z-20 w-5 h-7 sm:h-8 flex items-center justify-center bg-[#f4ecd8] text-[#1a1a1a] border border-[#1a1a1a] shadow-[1px_1px_0px_#1a1a1a] hover:bg-[#ebdcc0] active:scale-95 transition-all rounded-sm select-none cursor-pointer"
        >
          <ChevronLeft size={14} strokeWidth={2.5} />
        </button>
      )}

      <div
        ref={scrollRef}
        onScroll={updateScrollState}
        style={{ maskImage, WebkitMaskImage: maskImage }}
        className="flex items-center gap-1.5 sm:gap-2 px-1 py-1 flex-1 min-w-0 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
        onWheel={(e) => {
          if (e.deltaY !== 0) {
            e.currentTarget.scrollLeft += e.deltaY;
          }
        }}
      >
        {visibleTrackIds.map((vTrackId) => (
          <PupitreRibbonChip
            key={vTrackId}
            trackId={vTrackId}
            isActive={vTrackId === activeTrackId}
            onSelect={onSelectTrack}
            onContextMenu={onContextMenu}
          />
        ))}

        <button
          ref={addBtnRef}
          type="button"
          onClick={onToggleAddPicker}
          title={lang === 'fr' ? 'Ajouter un instrument' : 'Adicionar instrumento'}
          className={`shrink-0 flex-shrink-0 w-8 h-8 sm:w-9 sm:h-9 min-w-[32px] min-h-[32px] sm:min-w-[36px] sm:min-h-[36px] rounded-md flex items-center justify-center font-cactus font-bold text-lg leading-none border-2 border-dashed transition-all duration-150 select-none cursor-pointer ${
            isAddPickerOpen
              ? 'bg-[#8b2a1a] text-[#f4ecd8] border-[#8b2a1a] shadow-[2px_2px_0px_#1a1a1a] scale-105 z-10'
              : 'bg-[#f4ecd8]/60 hover:bg-[#fbf8f0] text-[#1a1a1a]/70 hover:text-[#1a1a1a] border-[#1a1a1a]/40 hover:border-[#1a1a1a] shadow-[1px_1px_0px_rgba(0,0,0,0.3)] hover:shadow-[2px_2px_0px_#1a1a1a] hover:-translate-y-[1px]'
          }`}
        >
          +
        </button>
      </div>

      {canScrollRight && (
        <button
          type="button"
          onClick={() => handleScroll(160)}
          title={lang === 'fr' ? 'Défiler à droite' : 'Rolar para a direita'}
          className="absolute right-0 z-20 w-5 h-7 sm:h-8 flex items-center justify-center bg-[#f4ecd8] text-[#1a1a1a] border border-[#1a1a1a] shadow-[1px_1px_0px_#1a1a1a] hover:bg-[#ebdcc0] active:scale-95 transition-all rounded-sm select-none cursor-pointer"
        >
          <ChevronRight size={14} strokeWidth={2.5} />
        </button>
      )}
    </div>
  );
});

PupitreRibbon.displayName = 'PupitreRibbon';
