/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { SongMarker, SongSection } from '../../types';
import { filterTopLevelSections } from '../../utils/sections/resolveTopLevelSectionForMeasure';

interface Props {
  songMarkers: SongMarker[];
  songSections: SongSection[];
  currentMeasure: number;
  onNavigateSection: (measureIdx: number) => void;
}

export const MobileSectionPads: React.FC<Props> = ({
  songMarkers,
  songSections,
  currentMeasure,
  onNavigateSection,
}) => {
  // Déterminer la liste des repères/sections ordonnés
  const items = React.useMemo(() => {
    if (songMarkers && songMarkers.length > 0) {
      return [...songMarkers]
        .sort((a, b) => a.measure - b.measure)
        .map((m) => ({ id: m.id, name: m.name, measure: m.measure }));
    }
    if (songSections && songSections.length > 0) {
      return filterTopLevelSections(songSections).map((s) => ({
        id: s.id,
        name: s.name,
        measure: s.startMeasure,
      }));
    }
    return [{ id: 'default', name: 'MORCEAU', measure: 0 }];
  }, [songMarkers, songSections]);

  return (
    <div className="w-full h-8 px-2 py-0.5 bg-black/70 backdrop-blur-xs border-t border-[var(--cordel-border)]/50 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0 z-10 select-none">
      <span className="text-[8px] font-mono uppercase text-[#f4ecd8]/60 tracking-wider shrink-0 mr-0.5">
        SECTIONS:
      </span>
      {items.map((item, idx) => {
        const nextItem = items[idx + 1];
        const isActive =
          currentMeasure >= item.measure &&
          (nextItem ? currentMeasure < nextItem.measure : true);

        return (
          <button
            key={item.id}
            onClick={() => onNavigateSection(item.measure)}
            className={`px-2 py-0.5 text-[9px] font-cactus font-bold uppercase tracking-wider whitespace-nowrap border transition-all active:scale-95 shadow-[1px_1px_0px_rgba(0,0,0,0.8)] ${
              isActive
                ? 'bg-[#b94a2c] text-[#f4ecd8] border-[#f4ecd8]'
                : 'bg-[#1a1a1a] text-[var(--cordel-text)] border-[var(--cordel-border)] hover:border-[#b94a2c]'
            }`}
          >
            {item.name}
          </button>
        );
      })}
    </div>
  );
};
