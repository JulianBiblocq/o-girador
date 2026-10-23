import React, { useRef, useContext } from 'react';
import { TimelineUIContext } from '../contexts/TimelineUIContext';
import { useSequencerStore } from '../stores/useSequencerStore';
import { usePlayheadFollower } from './timeline/TimelinePlayheadFollower';

const TimelinePlayheadComponent: React.FC<{ isActive?: boolean }> = ({ isActive = true }) => {
  const uiContext = useContext(TimelineUIContext);
  const playheadRef = useRef<HTMLDivElement>(null);
  const measureHighlightRef = useRef<HTMLDivElement>(null);

  const MEASURE_W = uiContext ? uiContext.MEASURE_W : 0;
  const HEADER_W = uiContext ? uiContext.HEADER_W : 0;
  const measureWidths = uiContext?.measureWidths;
  const measureLeftPositions = uiContext?.measureLeftPositions;

  usePlayheadFollower({
    playheadRef,
    measureHighlightRef,
    headerWidth: HEADER_W,
    measureWidth: MEASURE_W,
    measureWidths,
    measureLeftPositions,
    isActive,
  });

  if (!uiContext) return null;

  const isEcoMode = useSequencerStore.getState().isEcoMode;
  const isMobileDevice = typeof window !== 'undefined' && window.innerWidth <= 768;
  const disableHeavyShadow = isEcoMode || isMobileDevice;

  return (
    <>
      <div
        ref={measureHighlightRef}
        className="absolute top-0 bottom-0 pointer-events-none z-[10] bg-[rgba(255,255,255,0.08)] mix-blend-screen"
        style={{ left: 0, display: 'none', willChange: 'transform' }}
      />
      <div
        ref={playheadRef}
        id="timeline-playhead-line"
        className={`absolute top-0 bottom-0 border-l-2 border-red-600 pointer-events-none z-30 ${
          disableHeavyShadow ? '' : 'shadow-[0_0_10px_rgba(220,38,38,0.7)]'
        }`}
        style={{ left: 0, display: 'none', willChange: 'transform' }}
      />
    </>
  );
};

export const TimelinePlayhead = React.memo(TimelinePlayheadComponent);
