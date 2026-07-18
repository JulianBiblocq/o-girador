/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useContext } from 'react';
import { TimelineUIContext } from '../../contexts/TimelineUIContext';
import { XiloHand } from '../XiloIcons';
import { useSequencerSettingsStore } from '../../stores/useSequencerSettingsStore';

interface RhythmSignalsRowProps {
  totalMeasures: number;
  rhythmSignals: any[];
  measureSignals: (string | null)[];
  onMeasureSignalChange: (mIdx: number, sigId: string | null) => void;
  visibleRange: { start: number; end: number };
}

const RhythmSignalsRowComponent: React.FC<RhythmSignalsRowProps> = ({
  totalMeasures,
  rhythmSignals,
  measureSignals,
  onMeasureSignalChange,
  visibleRange = { start: 0, end: 8 },
}) => {
  const uiContext = useContext(TimelineUIContext);
  if (!uiContext) {
    throw new Error('RhythmSignalsRow must be used within a TimelineUIContext.Provider');
  }

  const {
    MEASURE_W,
    HEADER_W,
    totalContentW,
    isMobile,
    lang,
    signalDropdownOpen,
    setSignalDropdownOpen,
  } = uiContext;

  const enabledSignalIds = useSequencerSettingsStore((state) => state.enabledSignalIds);

  if (rhythmSignals.length === 0) return null;

  return (
    <div
      className="flex border-b border-[var(--cordel-border)]/20 h-8 relative"
      style={{ width: `${HEADER_W + totalContentW + 150}px`, minWidth: `${HEADER_W + totalContentW + 150}px` }}
    >
      {/* Sticky header */}
      <div
        className={`timeline-sticky-header sticky left-0 z-35 bg-[var(--cordel-bg)] border-r-2 border-[var(--cordel-border)] flex items-center py-1 gap-1 ${
          isMobile ? 'px-1' : 'px-2'
        }`}
        style={{ width: HEADER_W, minWidth: HEADER_W, transformOrigin: '0 0' }}
      >
        <span className="text-base flex items-center justify-center"><XiloHand size={14} className="shrink-0" /></span>
        {!isMobile && (
          <span className="font-cactus text-[10px] font-bold uppercase tracking-wider text-[var(--cordel-text)]">
            {lang === 'fr' ? 'Signaux' : 'Sinais'}
          </span>
        )}
      </div>

      {/* Left spacer column */}
      {visibleRange.start > 0 && (
        <div style={{ width: `${visibleRange.start * MEASURE_W}px`, minWidth: `${visibleRange.start * MEASURE_W}px` }} className="shrink-0" />
      )}

      {/* Measure signal cells */}
      {Array.from({ length: totalMeasures })
        .map((_, mIdx) => ({ mIdx }))
        .filter(({ mIdx }) => mIdx >= visibleRange.start && mIdx <= visibleRange.end)
        .map(({ mIdx }) => {
          const sigId = measureSignals[mIdx] ?? null;
          const activeSig = rhythmSignals.find(s => s.id === sigId) || null;
          const isCurrentMeasure = false;

          return (
            <div
              key={mIdx}
              className={`border-r border-[var(--cordel-border)]/20 flex items-center justify-center shrink-0 ${
                isCurrentMeasure ? 'bg-[var(--cordel-border)]/10' : ''
              }`}
              style={{
                width: MEASURE_W,
                minWidth: MEASURE_W,
                height: '100%',
              }}
            >
            {activeSig ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSignalDropdownOpen(signalDropdownOpen === mIdx ? null : mIdx);
                }}
                className="flex items-center gap-1 px-1.5 py-0.5 bg-[var(--cordel-border)]/20 hover:bg-[var(--cordel-border)]/40 transition-colors rounded text-[9px] font-bold text-[var(--cordel-text)] max-w-full"
                title={activeSig.name}
              >
                {activeSig.image ? (
                  <img src={activeSig.image} alt={activeSig.name} className="w-6 h-6 object-contain flex-shrink-0" />
                ) : (
                  <span className="text-[12px] flex-shrink-0 leading-none">📢</span>
                )}
                <span className="ruler-detailed truncate max-w-[70px]">{activeSig.name}</span>
              </button>
            ) : (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSignalDropdownOpen(signalDropdownOpen === mIdx ? null : mIdx);
                }}
                className="w-6 h-6 flex items-center justify-center bg-[var(--cordel-bg)] text-[var(--cordel-text)]/40 border border-dashed border-[var(--cordel-border)]/30 rounded text-[10px] font-bold hover:bg-[var(--cordel-border)]/20 hover:text-[var(--cordel-text)] transition-colors cursor-pointer"
                title={lang === 'fr' ? 'Assigner un signal' : 'Atribuir um sinal'}
              >
                +
              </button>
            )}

            {/* Dropdown de sélection */}
            {signalDropdownOpen === mIdx && (
              <div
                className="absolute top-full left-0 z-50 bg-[var(--cordel-bg)] border-2 border-[var(--cordel-border)] cordel-shadow min-w-[140px] flex flex-col py-1"
                style={{ marginTop: 2 }}
                onClick={e => e.stopPropagation()}
              >
                {/* Aucun signal */}
                <button
                  onClick={() => {
                    onMeasureSignalChange?.(mIdx, null);
                    setSignalDropdownOpen(null);
                  }}
                  className="flex items-center gap-2 px-3 py-1.5 text-[10px] font-bold text-[var(--cordel-text)] hover:bg-[var(--cordel-border)]/20 cursor-pointer text-left"
                >
                  <span className="text-xs opacity-50">✕</span>
                  <span className="opacity-70">{lang === 'fr' ? 'Aucun' : 'Nenhum'}</span>
                </button>
                <div className="border-t border-[var(--cordel-border)]/20 my-0.5" />
                {rhythmSignals
                  .filter(sig => enabledSignalIds === null || enabledSignalIds.includes(sig.id))
                  .map(sig => (
                  <button
                    key={sig.id}
                    onClick={() => {
                      onMeasureSignalChange?.(mIdx, sig.id);
                      setSignalDropdownOpen(null);
                    }}
                    className={`flex items-center gap-2 px-3 py-1.5 text-[10px] font-bold text-[var(--cordel-text)] hover:bg-[var(--cordel-border)]/20 cursor-pointer text-left ${
                      sigId === sig.id ? 'bg-[var(--cordel-border)]/30' : ''
                    }`}
                  >
                    {sig.image ? (
                      <img src={sig.image} alt={sig.name} className="w-6 h-6 object-contain flex-shrink-0" />
                    ) : (
                      <span className="text-[12px] w-6 h-6 flex items-center justify-center bg-black/10 rounded flex-shrink-0 leading-none">📢</span>
                    )}
                    <span className="truncate">{sig.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {/* Right spacer column */}
      {visibleRange.end < totalMeasures - 1 && (
        <div style={{ width: `${(totalMeasures - 1 - visibleRange.end) * MEASURE_W}px`, minWidth: `${(totalMeasures - 1 - visibleRange.end) * MEASURE_W}px` }} className="shrink-0" />
      )}

      {/* Spacer */}
      <div 
        className="h-full shrink-0"
        style={{ width: 150, minWidth: 150 }} 
      />
    </div>
  );
};

export const RhythmSignalsRow = React.memo(RhythmSignalsRowComponent, (prev, next) => {
  return prev.totalMeasures === next.totalMeasures &&
         prev.rhythmSignals === next.rhythmSignals &&
         prev.measureSignals === next.measureSignals &&
         prev.visibleRange.start === next.visibleRange.start &&
         prev.visibleRange.end === next.visibleRange.end;
});
