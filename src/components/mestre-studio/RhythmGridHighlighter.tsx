import React, { useEffect } from 'react';

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
    const handleTick = (e: Event) => {
      const customEvent = e as CustomEvent<{ step: number }>;
      const { step } = customEvent.detail;
      
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
    window.addEventListener('o-girador-tick', handleTick);
    return () => window.removeEventListener('o-girador-tick', handleTick);
  }, [trackPatternIds]);

  return null;
};
