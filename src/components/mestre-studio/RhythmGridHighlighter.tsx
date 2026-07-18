import React, { useEffect } from 'react';
import { subscribeToTick, unsubscribeFromTick } from '../../hooks/useAudioSync';

interface TrackPatternId {
  trackId: number;
  patternId: number;
}

interface RhythmGridHighlighterProps {
  trackPatternIds: TrackPatternId[];
}

export const RhythmGridHighlighter: React.FC<RhythmGridHighlighterProps> = ({ trackPatternIds }) => {
  useEffect(() => {
    let previousTick: number | null = null;
    const handleTick = (detail: { step: number; measure: number; maxTicks: number; ratio?: number }) => {
      const { step } = detail;
      
      if (previousTick !== null) {
        const prevH = document.getElementsByClassName('step-active-highlight');
        while (prevH.length > 0) prevH[0].classList.remove('step-active-highlight', 'border-[#8b2a1a]');
        const prevV = document.getElementsByClassName('step-active-highlight-v');
        while (prevV.length > 0) prevV[0].classList.remove('step-active-highlight-v', 'border-[#8b2a1a]');
      }
      
      if (step >= 0) {
        trackPatternIds.forEach(({ trackId, patternId }) => {
          let el = document.getElementById(`step-cell-${trackId}-${patternId}-${step}`);
          if (el) el.classList.add('step-active-highlight', 'border-[#8b2a1a]');
          el = document.getElementById(`step-cell-v-${trackId}-${patternId}-${step}`);
          if (el) el.classList.add('step-active-highlight-v', 'border-[#8b2a1a]');
        });
      }
      
      previousTick = step;
    };
    subscribeToTick(handleTick);
    return () => unsubscribeFromTick(handleTick);
  }, [trackPatternIds]);

  return null;
};
