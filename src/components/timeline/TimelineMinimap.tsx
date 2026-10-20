import React, { useEffect, useRef, useCallback, useContext } from 'react';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { TimelineUIContext } from '../../contexts/TimelineUIContext';
import { TimelineMinimapCanvasRenderer } from './TimelineMinimapCanvasRenderer';
import { useTimelineMinimapDrag } from './useTimelineMinimapDrag';

interface TimelineMinimapProps {
  scrollRef: React.RefObject<HTMLDivElement | null>;
  pendingScrollLeftRef: React.MutableRefObject<number | null>;
  totalMeasures: number;
  measureWidth: number;
  onMeasureWidthChange: (width: number) => void;
  onZoomStart?: () => void;
  onZoomEnd?: () => void;
}

const TimelineMinimapComponent: React.FC<TimelineMinimapProps> = ({
  scrollRef, pendingScrollLeftRef, totalMeasures, measureWidth,
  onMeasureWidthChange, onZoomStart, onZoomEnd,
}) => {
  const uiContext = useContext(TimelineUIContext);
  if (!uiContext) throw new Error('TimelineMinimap must be used within TimelineUIContext');

  const { HEADER_W, MEASURE_W } = uiContext;
  const tracks = useSequencerStore((s) => s.tracks);

  const containerRef = useRef<HTMLDivElement>(null);
  const sliderRef = useRef<HTMLDivElement>(null);
  const sliderWidthRef = useRef<number>(50);
  const sliderLeftRef = useRef<number>(0);
  const rafScheduledRef = useRef<boolean>(false);

  const updateMinimapViewport = useCallback(() => {
    if (!scrollRef.current || !sliderRef.current || !containerRef.current) return;
    const totalW = totalMeasures * MEASURE_W + 150;
    const vW = scrollRef.current.clientWidth - HEADER_W;
    const mW = containerRef.current.clientWidth;
    if (totalW <= 0 || mW <= 0) return;
    const ratio = mW / totalW;
    const sW = Math.max(16, Math.min(mW, vW * ratio));
    const sL = scrollRef.current.scrollLeft * ratio;
    sliderWidthRef.current = sW;
    sliderLeftRef.current = sL;
    sliderRef.current.style.width = `${sW}px`;
    sliderRef.current.style.transform = `translate3d(${sL}px, 0, 0)`;
  }, [totalMeasures, MEASURE_W, HEADER_W, scrollRef]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const handleScroll = () => {
      if (rafScheduledRef.current) return;
      rafScheduledRef.current = true;
      requestAnimationFrame(() => {
        rafScheduledRef.current = false;
        if (!scrollRef.current || !sliderRef.current || !containerRef.current) return;
        const totalW = totalMeasures * MEASURE_W + 150;
        const mW = containerRef.current.clientWidth;
        if (totalW <= 0 || mW <= 0) return;
        const sL = scrollRef.current.scrollLeft * (mW / totalW);
        sliderLeftRef.current = sL;
        sliderRef.current.style.transform = `translate3d(${sL}px, 0, 0)`;
      });
    };
    el.addEventListener('scroll', handleScroll, { passive: true });
    updateMinimapViewport();
    window.addEventListener('resize', updateMinimapViewport);
    return () => { el.removeEventListener('scroll', handleScroll); window.removeEventListener('resize', updateMinimapViewport); };
  }, [scrollRef, updateMinimapViewport, totalMeasures, MEASURE_W]);

  useEffect(() => { updateMinimapViewport(); }, [measureWidth, totalMeasures, updateMinimapViewport]);

  const { onPointerDown, onPointerMove, onPointerUp, handleZoomHandle } = useTimelineMinimapDrag({
    scrollRef, pendingScrollLeftRef, minimapContainerRef: containerRef, minimapSliderRef: sliderRef,
    sliderWidthRef, sliderLeftRef, totalMeasures, MEASURE_W, HEADER_W, onMeasureWidthChange, onZoomStart, onZoomEnd,
  });

  return (
    <div className="border-b border-[var(--cordel-border)]/20 bg-[var(--cordel-bg)] px-4 py-1 shrink-0 select-none">
      <div
        ref={containerRef}
        className="h-10 w-full relative bg-black/40 rounded border border-[var(--cordel-border)]/15 overflow-hidden cursor-pointer"
        onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}
      >
        <TimelineMinimapCanvasRenderer tracks={tracks} totalMeasures={totalMeasures} />
        <div
          ref={sliderRef}
          className="absolute top-0 bottom-0 bg-blue-500/10 dark:bg-blue-400/10 border-y-2 border-blue-500 dark:border-blue-400 shadow-[0_0_6px_rgba(59,130,246,0.25)] cursor-grab active:cursor-grabbing z-10"
          style={{ width: '100px', left: '0px', willChange: 'transform', transformOrigin: 'left center' }}
        >
          <div className="absolute left-0 top-0 bottom-0 w-3.5 bg-blue-500 dark:bg-blue-400 cursor-ew-resize opacity-95 hover:opacity-100 flex items-center justify-center gap-[2px]" onPointerDown={(e) => handleZoomHandle(e, true)}>
            <div className="w-[1.5px] h-3.5 bg-white/60 rounded-xs" /><div className="w-[1.5px] h-3.5 bg-white/60 rounded-xs" /><div className="w-[1.5px] h-3.5 bg-white/60 rounded-xs" />
          </div>
          <div className="absolute right-0 top-0 bottom-0 w-3.5 bg-blue-500 dark:bg-blue-400 cursor-ew-resize opacity-95 hover:opacity-100 flex items-center justify-center gap-[2px]" onPointerDown={(e) => handleZoomHandle(e, false)}>
            <div className="w-[1.5px] h-3.5 bg-white/60 rounded-xs" /><div className="w-[1.5px] h-3.5 bg-white/60 rounded-xs" /><div className="w-[1.5px] h-3.5 bg-white/60 rounded-xs" />
          </div>
        </div>
      </div>
    </div>
  );
};

export const TimelineMinimap = React.memo(TimelineMinimapComponent);
