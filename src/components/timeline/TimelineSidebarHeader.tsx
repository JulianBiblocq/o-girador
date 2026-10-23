import React from 'react';
import { Search } from 'lucide-react';
import { Language } from '../../types';

export interface TimelineSidebarHeaderProps {
  headerWidth: number;
  isMobile: boolean;
  lang: Language;
  totalMeasures: number;
  measureWidth: number;
  isPlaying: boolean;
  isMultiSelectMode: boolean;
  selectedTimelineCellsCount: number;
  onZoom: (w: number) => void;
  toggleMultiSelectMode: () => void;
  alertAsync?: (msg: string) => void;
}

export const TimelineSidebarHeader: React.FC<TimelineSidebarHeaderProps> = React.memo(({
  headerWidth, isMobile, lang, totalMeasures, measureWidth, isPlaying, isMultiSelectMode,
  selectedTimelineCellsCount, onZoom, toggleMultiSelectMode, alertAsync,
}) => {
  const windowWidth = typeof window !== 'undefined' ? window.innerWidth : 1200;
  const largeWidth = Math.max(20, Math.floor((windowWidth - headerWidth - 50) / totalMeasures));

  return (
    <div
      className={`timeline-sticky-header sticky left-0 z-40 bg-[var(--cordel-bg)] border-r-2 border-[var(--cordel-border)] flex flex-col items-center justify-center gap-1 ${isMobile ? 'px-1.5' : 'px-3'}`}
      style={{ width: headerWidth, minWidth: headerWidth, transformOrigin: '0 0' }}
    >
      <div className="flex items-center bg-[var(--cordel-text)]/5 rounded p-0.5 cordel-border-sm w-full max-w-[160px] pointer-events-auto">
        {([['L', largeWidth], ['M', 60], ['S', 120]] as const).map(([lbl, w]) => (
          <button
            key={lbl}
            onClick={() => onZoom(w)}
            className={`flex-1 text-[10px] font-bold py-1 rounded transition-colors ${
              Math.abs(measureWidth - w) < 25 ? 'bg-[var(--cordel-text)] text-[var(--cordel-bg)] shadow-sm' : 'text-[var(--cordel-text)]/50 hover:bg-[var(--cordel-text)]/10'
            } cursor-pointer`}
          >
            {lbl}
          </button>
        ))}
        <button
          onClick={() => {
            if (isPlaying) alertAsync?.(lang === 'fr' ? 'Vue macro indisponible pendant la lecture.' : 'Visão macro indisponível durante reprodução.');
            else onZoom(320);
          }}
          className={`flex items-center justify-center flex-1 text-[10px] font-bold py-1 rounded transition-colors ${
            measureWidth > 240 ? 'bg-[var(--cordel-text)] text-[var(--cordel-bg)] shadow-sm' : 'text-[var(--cordel-text)]/50 hover:bg-[var(--cordel-text)]/10'
          } ${isPlaying ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}`}
        >
          <Search size={11} className="shrink-0" />
        </button>
      </div>

      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); toggleMultiSelectMode(); }}
        className={`w-full max-w-[160px] py-0.5 px-1.5 text-[9px] font-bold rounded flex items-center justify-center gap-1 border pointer-events-auto cursor-pointer ${
          isMultiSelectMode
            ? 'bg-[#8b2a1a] text-[#f4ecd8] border-[#8b2a1a] shadow-sm animate-pulse'
            : selectedTimelineCellsCount > 0
            ? 'bg-[var(--cordel-text)]/10 text-[var(--cordel-text)] border-[var(--cordel-border)]/40 hover:bg-[var(--cordel-text)]/15'
            : 'bg-transparent text-[var(--cordel-text)]/60 border-dashed border-[var(--cordel-border)]/30 hover:bg-[var(--cordel-text)]/5'
        }`}
      >
        <span>{isMultiSelectMode ? '☑' : '☐'}</span>
        <span className="uppercase tracking-wider">
          {lang === 'fr' ? 'Sélection' : 'Seleção'}{selectedTimelineCellsCount > 0 ? ` (${selectedTimelineCellsCount})` : ''}
        </span>
      </button>
    </div>
  );
});
