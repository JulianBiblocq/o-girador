import React from 'react';
import { TimeSignature, Language } from '../../types';
import { TimelineRulerControls } from './TimelineRulerControls';
import { TimelineMeasureRhythmSignal } from './TimelineMeasureRhythmSignal';
import { TimelineSidebarHeader } from './TimelineSidebarHeader';

export interface TimelineRulerRowProps {
  headerWidth: number; totalContentW: number; isMobile: boolean; lang: Language;
  totalMeasures: number; measureWidth: number; measureWidths: number[]; measureLeftPositions: number[];
  visibleRange: { start: number; end: number }; loopStartMeasure: number | null; loopEndMeasure: number | null;
  isLoopRegionActive: boolean; setIsLoopRegionActive: (active: boolean) => void;
  measureTimeSigs: Record<number, TimeSignature>; measureLabelsMap: Map<number, string>;
  measureSignals: (string | null)[]; rhythmSignals: any[]; enabledSignalIds: string[] | null;
  signalDropdownOpen: number | null; setSignalDropdownOpen: (m: number | null) => void;
  onMeasureSignalChange?: (mIdx: number, sigId: string | null) => void;
  onSetLoopStart: (mIdx: number) => void; onSetLoopEnd: (mIdx: number) => void;
  onMeasureTimeSigChange: (mIdx: number, sig: TimeSignature) => void;
  onInsertMeasure?: (mIdx: number, count: number) => void; onDeleteMeasure?: (mIdx: number) => void;
  confirmAsync: (msg: string) => Promise<boolean>;
  onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => void;
  onPointerMove: (e: React.PointerEvent<HTMLDivElement>) => void;
  onPointerUp: (e: React.PointerEvent<HTMLDivElement>) => void;
  onZoom: (w: number) => void; isMultiSelectMode: boolean;
  selectedTimelineCellsCount: number; toggleMultiSelectMode: () => void;
  onOpenAddMeasuresModal: () => void; isPlaying: boolean; alertAsync?: (msg: string) => void;
}

export const TimelineRulerRow = React.memo<TimelineRulerRowProps>(({
  headerWidth, totalContentW, isMobile, lang, totalMeasures, measureWidth, measureWidths,
  measureLeftPositions, visibleRange, loopStartMeasure, loopEndMeasure, isLoopRegionActive,
  setIsLoopRegionActive, measureTimeSigs, measureLabelsMap, measureSignals, rhythmSignals,
  enabledSignalIds, signalDropdownOpen, setSignalDropdownOpen, onMeasureSignalChange,
  onSetLoopStart, onSetLoopEnd, onMeasureTimeSigChange, onInsertMeasure, onDeleteMeasure,
  confirmAsync, onPointerDown, onPointerMove, onPointerUp, onZoom, isMultiSelectMode,
  selectedTimelineCellsCount, toggleMultiSelectMode, onOpenAddMeasuresModal, isPlaying, alertAsync,
}) => {
  const totalRowW = headerWidth + totalContentW + 150;

  return (
    <div
      className="flex min-h-14 h-auto border-b-2 border-[var(--cordel-border)] sticky top-0 z-50 bg-[var(--cordel-bg)] cursor-pointer select-none relative"
      style={{ width: `${totalRowW}px`, minWidth: `${totalRowW}px` }}
      onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}
    >
      <TimelineSidebarHeader
        headerWidth={headerWidth}
        isMobile={isMobile}
        lang={lang}
        totalMeasures={totalMeasures}
        measureWidth={measureWidth}
        isPlaying={isPlaying}
        isMultiSelectMode={isMultiSelectMode}
        selectedTimelineCellsCount={selectedTimelineCellsCount}
        onZoom={onZoom}
        toggleMultiSelectMode={toggleMultiSelectMode}
        alertAsync={alertAsync}
      />

      {visibleRange.start > 0 && <div style={{ width: `${measureLeftPositions[visibleRange.start] ?? (visibleRange.start * measureWidth)}px`, minWidth: `${measureLeftPositions[visibleRange.start] ?? (visibleRange.start * measureWidth)}px` }} className="shrink-0" />}

      {Array.from({ length: totalMeasures }).map((_, mIdx) => ({ mIdx })).filter(({ mIdx }) => mIdx >= visibleRange.start && mIdx <= visibleRange.end).map(({ mIdx }) => {
        const mTimeSig = measureTimeSigs?.[mIdx] || '4/4';
        const beats = mTimeSig === '3/4' || mTimeSig === '6/8' ? 3 : mTimeSig === '2/4' ? 2 : mTimeSig === '12/8' ? 12 : 4;
        const inLoop = loopStartMeasure !== null && loopEndMeasure !== null && mIdx >= loopStartMeasure && mIdx <= loopEndMeasure;

        return (
          <div
            key={mIdx}
            className={`group flex flex-col justify-between px-2 py-1 text-[10px] font-bold transition-all border-r shrink-0 relative ${(mIdx + 1) % 4 === 0 ? 'border-r-2 border-r-blue-500/50 dark:border-r-blue-400/50 shadow-[1px_0_0_0_rgba(59,130,246,0.1)]' : 'border-r-[var(--cordel-border)]/30'} ${loopStartMeasure !== null && loopEndMeasure !== null ? (inLoop ? (isLoopRegionActive ? 'bg-blue-600/5 border-t-4 border-t-blue-600/80' : 'bg-gray-500/5 border-t-4 border-t-gray-500/80') : (isLoopRegionActive ? 'bg-black/10 dark:bg-black/30 opacity-70' : '')) : ''}`}
            style={{ width: measureWidths[mIdx] ?? measureWidth, minWidth: measureWidths[mIdx] ?? measureWidth, height: '100%' }}
          >
            {inLoop && (
              <div
                className="absolute top-[-4px] left-0 right-0 h-3 cursor-pointer z-50 hover:bg-white/20 transition-colors"
                onMouseDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); setIsLoopRegionActive(!isLoopRegionActive); }}
              />
            )}
            <TimelineRulerControls
              mIdx={mIdx} measureLabel={measureLabelsMap.get(mIdx) || `M.${mIdx + 1}`} mTimeSig={mTimeSig}
              measureWidth={measureWidths[mIdx] ?? measureWidth} loopStartMeasure={loopStartMeasure}
              loopEndMeasure={loopEndMeasure} totalMeasures={totalMeasures} lang={lang}
              onSetLoopStart={onSetLoopStart} onSetLoopEnd={onSetLoopEnd} onMeasureTimeSigChange={onMeasureTimeSigChange}
              onInsertMeasure={onInsertMeasure} onDeleteMeasure={onDeleteMeasure} confirmAsync={confirmAsync}
            />

            <TimelineMeasureRhythmSignal
              mIdx={mIdx} sigId={measureSignals[mIdx] ?? null} rhythmSignals={rhythmSignals}
              enabledSignalIds={enabledSignalIds} isOpen={signalDropdownOpen === mIdx} lang={lang}
              onToggleOpen={() => setSignalDropdownOpen(signalDropdownOpen === mIdx ? null : mIdx)}
              onClose={() => setSignalDropdownOpen(null)}
              onSelectSignal={(sigId) => onMeasureSignalChange?.(mIdx, sigId)}
            />

            <div className="flex w-full opacity-50 text-[8px] pb-0.5 mt-auto">
              {Array.from({ length: beats }).map((_, b) => (
                <span key={b} className="text-left pl-1 border-l border-[var(--cordel-border)]/10" style={{ width: `${100 / beats}%` }}>{b + 1}</span>
              ))}
            </div>
          </div>
        );
      })}

      {visibleRange.end < totalMeasures - 1 && <div style={{ width: `${Math.max(0, totalContentW - (measureLeftPositions[visibleRange.end + 1] ?? ((visibleRange.end + 1) * measureWidth)))}px`, minWidth: `${Math.max(0, totalContentW - (measureLeftPositions[visibleRange.end + 1] ?? ((visibleRange.end + 1) * measureWidth)))}px` }} className="shrink-0" />}

      <div className="px-4 z-40 bg-[var(--cordel-bg)] border-r border-[var(--cordel-border)]/30 flex items-center justify-start h-full shrink-0" style={{ width: 150, minWidth: 150 }} onClick={e => e.stopPropagation()} onMouseDown={e => e.stopPropagation()} onTouchStart={e => e.stopPropagation()}>
        <button onClick={onOpenAddMeasuresModal} className="px-2 py-1 bg-[var(--cordel-bg)] text-[var(--cordel-text)] cordel-border-sm text-xs font-bold font-cactus cursor-pointer hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] flex items-center justify-center gap-1 w-full" style={{ height: '28px' }}>
          <span>➕</span><span>{lang === 'fr' ? 'Mesure' : 'Compasso'}</span>
        </button>
      </div>
    </div>
  );
});
