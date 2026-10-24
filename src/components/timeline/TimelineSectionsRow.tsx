import React, { useState, useRef, useEffect } from 'react';
import { Check, Plus } from 'lucide-react';
import { SongSection, Language } from '../../types';
import { XiloMagnet } from '../XiloIcons';
import { getSectionBounds } from '../../utils/timeline/timelineMeasureWidths';
import { TimelineSectionsEmptySlots, TimelineSectionsEmptySlotsProps } from './TimelineSectionsEmptySlots';
import { TimelineSectionsBanners, TimelineSectionsBannersProps } from './TimelineSectionsBanners';
import { TimelineQuickSectionPopover, TimelineQuickSectionPopoverProps } from './TimelineQuickSectionPopover';

export interface TimelineSectionsRowProps {
  headerWidth: number;
  totalContentW: number;
  isMobile: boolean;
  lang: Language;
  songSections: SongSection[];
  snapMode: 'measure' | 'beat' | 'none';
  setSnapMode: (mode: 'measure' | 'beat' | 'none') => void;
  onOpenCreateSectionModal: (defaultLevel?: number) => void;
  measureLeftPositions: number[];
  measureWidths: number[];
  isDraggingRange: boolean;
  dragStartMeasure: number | null;
  dragCurrentMeasure: number | null;
  emptySlotsProps: TimelineSectionsEmptySlotsProps;
  bannersProps: TimelineSectionsBannersProps;
  quickPopoverProps: TimelineQuickSectionPopoverProps;
}

export const TimelineSectionsRow = React.memo<TimelineSectionsRowProps>(({
  headerWidth, totalContentW, isMobile, lang, songSections, snapMode, setSnapMode,
  onOpenCreateSectionModal, measureLeftPositions, measureWidths, isDraggingRange,
  dragStartMeasure, dragCurrentMeasure, emptySlotsProps, bannersProps, quickPopoverProps,
}) => {
  const [snapDropdownOpen, setSnapDropdownOpen] = useState(false);
  const snapDropdownRef = useRef<HTMLDivElement>(null);
  const maxLevel = Math.max(1, ...songSections.map(s => s.level || 0));
  const rowH = 32 + maxLevel * 26;
  const totalRowW = headerWidth + totalContentW + 150;

  useEffect(() => {
    const onClickOutside = () => setSnapDropdownOpen(false);
    window.addEventListener('click', onClickOutside);
    return () => window.removeEventListener('click', onClickOutside);
  }, []);

  return (
    <div
      className="flex border-b border-[var(--cordel-border)]/30 bg-[var(--cordel-bg)]/80 relative"
      style={{ width: `${totalRowW}px`, minWidth: `${totalRowW}px`, height: `${rowH}px`, zIndex: snapDropdownOpen ? 60 : undefined }}
    >
      <div
        className={`sticky left-0 z-40 bg-[var(--cordel-bg)] border-r-2 border-[var(--cordel-border)] flex items-center justify-between font-cactus text-[11px] font-bold uppercase shrink-0 ${
          isMobile ? 'px-1.5' : 'px-2'
        }`}
        style={{ width: headerWidth, minWidth: headerWidth }}
      >
        <span className="text-[9px] font-cactus font-bold uppercase text-[var(--cordel-text)]/60 truncate select-none">
          {isMobile ? 'Sect.' : (lang === 'fr' ? 'Sections' : 'Seções')}
        </span>

        <div className="flex items-center gap-1 shrink-0">
          <div className="relative" ref={snapDropdownRef}>
            <button
              onClick={(e) => { e.stopPropagation(); setSnapDropdownOpen(!snapDropdownOpen); }}
              className={`w-5 h-5 flex items-center justify-center rounded cordel-border-sm cursor-pointer transition-colors ${
                snapMode !== 'none' ? 'bg-[var(--cordel-text)] text-[var(--cordel-bg)]' : 'bg-[var(--cordel-bg)] text-[var(--cordel-text)]/50 hover:bg-[var(--cordel-text)]/10'
              }`}
              title={snapMode === 'measure' ? (lang === 'fr' ? 'Magnétisme : Mesure' : 'Atração : Compasso') : snapMode === 'beat' ? (lang === 'fr' ? 'Magnétisme : Temps' : 'Atração : Tempo') : (lang === 'fr' ? 'Magnétisme : Libre' : 'Atração : Livre')}
            >
              <XiloMagnet size={11} className={snapMode === 'none' ? 'opacity-40' : ''} />
            </button>

            {snapDropdownOpen && (
              <div
                className="absolute top-full left-0 mt-1 z-[100] bg-[var(--cordel-bg)] text-[var(--cordel-text)] cordel-border-sm shadow-[3px_3px_0px_rgba(0,0,0,1)] py-1 min-w-[115px] flex flex-col gap-0.5"
                onClick={(e) => e.stopPropagation()}
              >
                {(['measure', 'beat', 'none'] as const).map(mode => (
                  <button
                    key={mode} onClick={() => { setSnapMode(mode); setSnapDropdownOpen(false); }}
                    className={`px-2.5 py-1 text-[10px] font-cactus font-bold uppercase text-left flex items-center justify-between hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] cursor-pointer transition-colors ${snapMode === mode ? 'bg-[var(--cordel-text)]/15 font-extrabold' : ''}`}
                  >
                    <span>{mode === 'measure' ? (lang === 'fr' ? 'Mesure' : 'Compasso') : mode === 'beat' ? (lang === 'fr' ? 'Temps' : 'Tempos') : (lang === 'fr' ? 'Libre' : 'Livre')}</span>
                    {snapMode === mode && <Check size={12} strokeWidth={2.5} />}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => onOpenCreateSectionModal(1)}
              className="bg-[var(--cordel-text)] text-[var(--cordel-bg)] font-bold text-[9px] px-1 py-0.5 rounded cordel-border-sm hover:opacity-80 transition-opacity cursor-pointer flex items-center justify-center gap-0.5 h-5"
              title={lang === 'fr' ? 'Créer une sous-section (Niveau 2)' : 'Criar subseção (Nível 2)'}
            >
              <Plus size={10} strokeWidth={2.5} />
              <span>N2</span>
            </button>
            <button
              onClick={() => onOpenCreateSectionModal(0)}
              className="bg-[var(--cordel-text)] text-[var(--cordel-bg)] font-bold text-[10px] px-1.5 py-0.5 rounded cordel-border-sm hover:opacity-80 transition-opacity cursor-pointer flex items-center justify-center gap-0.5 h-5"
              title={lang === 'fr' ? 'Créer une section principale (Niveau 1)' : 'Criar seção principal (Nível 1)'}
            >
              <Plus size={12} strokeWidth={2.5} />
              {!isMobile ? <span>{lang === 'fr' ? 'Sect.' : 'Seção'}</span> : <span>N1</span>}
            </button>
          </div>
        </div>
      </div>

      <div className="flex-grow relative h-full">
        <TimelineSectionsEmptySlots {...emptySlotsProps} />

        {isDraggingRange && dragStartMeasure !== null && dragCurrentMeasure !== null && (() => {
          const b = getSectionBounds(Math.min(dragStartMeasure, dragCurrentMeasure), Math.max(dragStartMeasure, dragCurrentMeasure), measureLeftPositions, measureWidths);
          return (
            <div
              className="absolute bg-blue-500/25 border-2 border-dashed border-blue-500 pointer-events-none rounded-sm"
              style={{ left: `${b.left + 4}px`, width: `${Math.max(0, b.width - 8)}px`, top: '4px', bottom: '4px', zIndex: 30 }}
            />
          );
        })()}

        <TimelineQuickSectionPopover {...quickPopoverProps} />
        <TimelineSectionsBanners {...bannersProps} />
      </div>
    </div>
  );
});
