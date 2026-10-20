/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
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
  return (
    <div
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
  );
});

PupitreRibbon.displayName = 'PupitreRibbon';
