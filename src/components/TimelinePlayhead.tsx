import React, { useEffect, useRef, useContext } from 'react';
import { TimelineUIContext } from '../contexts/TimelineUIContext';

const TimelinePlayheadComponent: React.FC = () => {
  const uiContext = useContext(TimelineUIContext);
  const playheadRef = useRef<HTMLDivElement>(null);

  if (!uiContext) return null;
  const { MEASURE_W, HEADER_W } = uiContext;

  useEffect(() => {
    const handleTick = (e: Event) => {
      const customEvent = e as CustomEvent<{ step: number; measure: number; maxTicks: number; ratio?: number; time?: number }>;
      const { step, measure, maxTicks, ratio = step / maxTicks } = customEvent.detail;
      
      const el = playheadRef.current;
      if (!el) return;

      if (step < 0) {
        el.style.display = 'none';
        // Handle reset scroll when stopped
        const scrollEl = document.getElementById('timeline-scroll-container');
        if (scrollEl) scrollEl.scrollLeft = 0;
        return;
      }

      // Calculate position using pre-calculated ratio
      const playheadX = measure * MEASURE_W + ratio * MEASURE_W;
      
      // Direct DOM manipulation
      el.style.transform = `translateX(${HEADER_W + playheadX}px)`;
      el.style.display = 'block';

      // Auto-scroll logic inside custom event listener
      const scrollEl = document.getElementById('timeline-scroll-container');
      if (scrollEl) {
        const vw = scrollEl.clientWidth - HEADER_W;
        if (vw > 0) {
          scrollEl.scrollLeft = Math.max(0, playheadX - vw * 0.4);
        }
      }
    };

    window.addEventListener('o-girador-tick', handleTick);
    return () => {
      window.removeEventListener('o-girador-tick', handleTick);
    };
  }, [MEASURE_W, HEADER_W]);

  return (
    <div
      ref={playheadRef}
      className="absolute top-0 bottom-0 border-l-2 border-red-600 pointer-events-none z-30 shadow-[0_0_10px_rgba(220,38,38,0.7)]"
      style={{
        left: 0,
        display: 'none',
        willChange: 'transform',
      }}
    />
  );
};

export const TimelinePlayhead = React.memo(TimelinePlayheadComponent);
