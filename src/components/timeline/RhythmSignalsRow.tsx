import React, { useContext } from 'react';
import { TimelineUIContext } from '../../contexts/TimelineUIContext';
import { XiloHand } from '../XiloIcons';
import { useSequencerSettingsStore } from '../../stores/useSequencerSettingsStore';
import { RhythmSignalCell } from './RhythmSignalCell';

interface RhythmSignalsRowProps {
  totalMeasures: number;
  rhythmSignals: any[];
  measureSignals: (string | null)[];
  onMeasureSignalChange: (mIdx: number, sigId: string | null) => void;
  visibleRange: { start: number; end: number };
}

const RhythmSignalsRowComponent: React.FC<RhythmSignalsRowProps> = ({
  totalMeasures, rhythmSignals, measureSignals, onMeasureSignalChange, visibleRange = { start: 0, end: 8 },
}) => {
  const uiContext = useContext(TimelineUIContext);
  if (!uiContext) throw new Error('RhythmSignalsRow must be used within TimelineUIContext');

  const { MEASURE_W, HEADER_W, totalContentW, isMobile, lang, signalDropdownOpen, setSignalDropdownOpen } = uiContext;
  const enabledSignalIds = useSequencerSettingsStore((s) => s.enabledSignalIds);

  if (rhythmSignals.length === 0) return null;

  return (
    <div
      className="flex border-b border-[var(--cordel-border)]/20 h-8 relative"
      style={{ width: `${HEADER_W + totalContentW + 150}px`, minWidth: `${HEADER_W + totalContentW + 150}px` }}
    >
      <div
        className={`timeline-sticky-header sticky left-0 z-35 bg-[var(--cordel-bg)] border-r-2 border-[var(--cordel-border)] flex items-center py-1 gap-1 ${isMobile ? 'px-1' : 'px-2'}`}
        style={{ width: HEADER_W, minWidth: HEADER_W, transformOrigin: '0 0' }}
      >
        <span className="text-base flex items-center justify-center"><XiloHand size={14} className="shrink-0" /></span>
        {!isMobile && (
          <span className="font-cactus text-[10px] font-bold uppercase tracking-wider text-[var(--cordel-text)]">
            {lang === 'fr' ? 'Signaux' : 'Sinais'}
          </span>
        )}
      </div>

      {visibleRange.start > 0 && (
        <div style={{ width: `${visibleRange.start * MEASURE_W}px`, minWidth: `${visibleRange.start * MEASURE_W}px` }} className="shrink-0" />
      )}

      {Array.from({ length: totalMeasures })
        .map((_, mIdx) => ({ mIdx }))
        .filter(({ mIdx }) => mIdx >= visibleRange.start && mIdx <= visibleRange.end)
        .map(({ mIdx }) => (
          <RhythmSignalCell
            key={mIdx} mIdx={mIdx} MEASURE_W={MEASURE_W} sigId={measureSignals[mIdx] ?? null}
            rhythmSignals={rhythmSignals} enabledSignalIds={enabledSignalIds || []}
            signalDropdownOpen={signalDropdownOpen} lang={lang}
            setSignalDropdownOpen={setSignalDropdownOpen} onMeasureSignalChange={onMeasureSignalChange}
          />
        ))}
    </div>
  );
};

export const RhythmSignalsRow = React.memo(RhythmSignalsRowComponent);
