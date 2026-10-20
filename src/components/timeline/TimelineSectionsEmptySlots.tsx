import React from 'react';
import { Language } from '../../types';

export interface TimelineSectionsEmptySlotsProps {
  totalMeasures: number;
  visibleRange: { start: number; end: number };
  measureWidths: number[];
  measureWidth: number;
  copiedSection: any;
  lang: Language;
  onEmptySlotPointerDown: (e: React.PointerEvent, mIdx: number) => void;
  onEmptySlotPointerEnter: (mIdx: number) => void;
  onPlusClick: (mIdx: number) => void;
}

export const TimelineSectionsEmptySlots = React.memo<TimelineSectionsEmptySlotsProps>(({
  totalMeasures, visibleRange, measureWidths, measureWidth, copiedSection, lang,
  onEmptySlotPointerDown, onEmptySlotPointerEnter, onPlusClick,
}) => {
  return (
    <div className="absolute inset-0 flex pointer-events-none z-0">
      {Array.from({ length: totalMeasures }).map((_, mIdx) => {
        const mW = `${measureWidths[mIdx] ?? measureWidth}px`;
        if (mIdx < visibleRange.start || mIdx > visibleRange.end) {
          return <div key={mIdx} style={{ width: mW, minWidth: mW, height: '100%' }} />;
        }
        return (
          <div
            key={mIdx}
            className={`group relative border-r border-dashed border-[var(--cordel-border)]/15 hover:bg-black/[0.03] flex items-center justify-center select-none pointer-events-auto ${
              copiedSection ? 'cursor-pointer' : 'cursor-crosshair'
            }`}
            style={{ width: mW, minWidth: mW, height: '100%' }}
            onPointerDown={(e) => onEmptySlotPointerDown(e, mIdx)}
            onPointerEnter={() => onEmptySlotPointerEnter(mIdx)}
          >
            {!copiedSection && (
              <button
                className="opacity-0 group-hover:opacity-100 transition-opacity duration-150 bg-[var(--cordel-text)] text-[var(--cordel-bg)] font-bold text-[10px] w-4.5 h-4.5 rounded-full flex items-center justify-center shadow-[1px_1px_3px_rgba(0,0,0,0.3)] hover:scale-110 cursor-pointer z-20 pointer-events-auto"
                onClick={(e) => {
                  e.stopPropagation();
                  onPlusClick(mIdx);
                }}
                title={lang === 'fr' ? 'Créer une section' : 'Criar seção'}
              >
                ＋
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
});
