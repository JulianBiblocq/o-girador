import React, { useState } from 'react';
import { SongSection, Language } from '../../types';
import { getSectionBounds } from '../../utils/timeline/timelineMeasureWidths';

export interface TimelineSectionsBannersProps {
  songSections: SongSection[]; totalMeasures: number; visibleRange: { start: number; end: number };
  measureWidths: number[]; measureLeftPositions: number[]; measureWidth: number; isPanningActive?: boolean;
  copiedSection: any; lang: Language;
  onSectionBlockPointerDown: (e: React.PointerEvent<HTMLDivElement>, section: SongSection) => void;
  onResizePointerDown: (e: React.PointerEvent<HTMLDivElement>, section: SongSection, edge: 'left' | 'right') => void;
  onEditSection: (section: SongSection) => void; onDeleteSection: (id: string) => void;
  onCopySection?: (section: SongSection) => void; onPasteSection: (mIdx: number) => void;
}

export const TimelineSectionsBanners = React.memo<TimelineSectionsBannersProps>(({
  songSections, totalMeasures, visibleRange, measureWidths, measureLeftPositions,
  measureWidth, isPanningActive, copiedSection, lang, onSectionBlockPointerDown,
  onResizePointerDown, onEditSection, onDeleteSection, onCopySection, onPasteSection,
}) => {
  const [hoveredPasteMeasure, setHoveredPasteMeasure] = useState<number | null>(null);
  const maxLevel = Math.max(0, ...songSections.map(s => s.level || 0));

  return (
    <>
      {songSections.map((section) => {
        const { left: startX, width } = getSectionBounds(section.startMeasure, section.endMeasure, measureLeftPositions, measureWidths);
        const topOffset = (maxLevel - (section.level || 0)) * 26 + 4;

        return (
          <div
            key={section.id}
            data-testid={`section-block-${section.name}`}
            data-section-id={section.id}
            className={`absolute flex items-center justify-between px-2 text-xs font-bold rounded cordel-border-sm select-none shadow-[2px_2px_0px_0px_rgba(0,0,0,0.15)] cursor-grab active:cursor-grabbing hover:brightness-105 transition-[background-color] ${
              isPanningActive ? 'pointer-events-none' : ''
            }`}
            onPointerDown={(e) => onSectionBlockPointerDown(e, section)}
            onDoubleClick={(e) => { e.stopPropagation(); onEditSection(section); }}
            style={{
              left: `${startX}px`, width: `${width - 8}px`, marginLeft: '4px', top: `${topOffset}px`,
              height: '24px', backgroundColor: section.color || '#eaddcf', color: '#1a1a1a',
              borderColor: '#1a1a1a', borderWidth: '1.5px', zIndex: 10,
            }}
          >
            <div
              data-testid={`section-resize-right-${section.id}`}
              className="absolute right-0 top-0 bottom-0 w-2.5 cursor-ew-resize flex items-center justify-center hover:bg-black/15 select-none z-20 rounded-r"
              onPointerDown={(e) => onResizePointerDown(e, section, 'right')}
              title={lang === 'fr' ? 'Étendre à droite' : 'Estender para direita'}
            >
              <div className="flex gap-[0.5px]">
                <div className="w-[1px] h-2 bg-black/40" /><div className="w-[1px] h-2 bg-black/40" /><div className="w-[1px] h-2 bg-black/40" />
              </div>
            </div>

            <span
              onDoubleClick={(e) => { e.stopPropagation(); onEditSection(section); }}
              onPointerDown={(e) => e.stopPropagation()}
              className="truncate max-w-[65%] font-cactus uppercase tracking-wider cursor-pointer hover:underline z-10"
              title={lang === 'fr' ? 'Double-cliquez pour modifier' : 'Duplo clique para editar'}
            >
              {section.name}
            </span>

            <div className="flex gap-1 shrink-0 z-10">
              {onCopySection && (
                <button
                  type="button" onClick={(e) => { e.stopPropagation(); onCopySection(section); }}
                  className="bg-black/10 hover:bg-black/25 text-black text-[9px] p-0.5 px-1 rounded cordel-border-sm cursor-pointer"
                  title={lang === 'fr' ? 'Copier la section' : 'Copiar seção'}
                >📋</button>
              )}
              <button
                type="button" onClick={(e) => { e.stopPropagation(); onDeleteSection(section.id); }}
                className="bg-red-800/80 hover:bg-red-800 text-white text-[9px] p-0.5 px-1 rounded cordel-border-sm cursor-pointer"
                title={lang === 'fr' ? 'Supprimer' : 'Excluir'}
              >✕</button>
            </div>
          </div>
        );
      })}

      {copiedSection && Array.from({ length: totalMeasures })
        .map((_, mIdx) => ({ mIdx }))
        .filter(({ mIdx }) => mIdx >= visibleRange.start && mIdx <= visibleRange.end)
        .map(({ mIdx }) => (
          <button
            key={`paste-sec-${mIdx}`} onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); onPasteSection(mIdx); }}
            onMouseEnter={() => setHoveredPasteMeasure(mIdx)} onMouseLeave={() => setHoveredPasteMeasure(null)}
            className="absolute inset-y-0.5 bg-emerald-600/25 hover:bg-emerald-600/45 text-emerald-800 dark:text-emerald-200 font-sans font-bold text-[9px] px-1 border-x border-y border-dashed border-emerald-600 flex items-center justify-center gap-1 cursor-pointer z-30 transition-all shadow-[inset_0_0_4px_rgba(16,185,129,0.2)]"
            style={{ left: `${measureLeftPositions[mIdx] ?? (mIdx * measureWidth)}px`, width: `${measureWidths[mIdx] ?? measureWidth}px` }}
            title={lang === 'fr' ? `Coller à la mesure ${mIdx + 1}` : `Colar no compasso ${mIdx + 1}`}
          >
            📋 {lang === 'fr' ? `Coller M.${mIdx + 1}` : `Colar C.${mIdx + 1}`}
          </button>
        ))}

      {copiedSection && hoveredPasteMeasure !== null && (() => {
        const pb = getSectionBounds(hoveredPasteMeasure, hoveredPasteMeasure + (copiedSection.length || 1) - 1, measureLeftPositions, measureWidths);
        return (
          <div
            className="absolute top-1 bottom-1 flex items-center justify-between px-3 text-xs font-bold rounded border border-dashed pointer-events-none opacity-50 z-20 animate-pulse"
            style={{
              left: `${pb.left}px`, width: `${Math.max(0, pb.width - 8)}px`, marginLeft: '4px',
              backgroundColor: copiedSection.color || '#f19066', color: '#1a1a1a', borderColor: '#1a1a1a', borderWidth: '1.5px',
            }}
          >
            <span className="truncate max-w-[80%] font-cactus uppercase tracking-wider">
              {copiedSection.name} ({lang === 'fr' ? 'Aperçu' : 'Prévia'})
            </span>
          </div>
        );
      })()}
    </>
  );
});
