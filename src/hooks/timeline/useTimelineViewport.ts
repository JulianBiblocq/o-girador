import { useState, useRef, useCallback, useEffect, startTransition } from 'react';

export interface UseTimelineViewportOptions {
  totalMeasures: number;
  measureWidth: number;
  headerWidth: number;
  scrollRef: React.RefObject<HTMLDivElement | null>;
  isPlaying: boolean;
  isActive?: boolean;
}

const VIRTUALIZATION_MIN_MEASURES = 24;
const VIEWPORT_BUFFER_MEASURES = 8;
const SCROLL_HYSTERESIS_MEASURES = 4;

export function useTimelineViewport({
  totalMeasures, measureWidth, headerWidth, scrollRef, isPlaying, isActive = true,
}: UseTimelineViewportOptions) {
  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;
  const measureWidthRef = useRef(measureWidth);
  measureWidthRef.current = measureWidth;

  const [visibleRange, setVisibleRange] = useState(() => {
    if (totalMeasures <= VIRTUALIZATION_MIN_MEASURES) {
      return { start: 0, end: Math.max(0, totalMeasures - 1) };
    }
    const initW = typeof window !== 'undefined' ? window.innerWidth : 1200;
    const initVis = Math.ceil((initW - headerWidth) / Math.max(20, measureWidth));
    return { start: 0, end: Math.min(totalMeasures - 1, initVis + VIEWPORT_BUFFER_MEASURES) };
  });

  const isRangeScheduledRef = useRef(false);
  const viewportCacheRef = useRef({
    width: typeof window !== 'undefined' ? window.innerWidth - headerWidth : 1200,
    lastScrollLeft: 0,
  });

  const updateVisibleRange = useCallback((immediate = false) => {
    if (totalMeasures <= VIRTUALIZATION_MIN_MEASURES) {
      setVisibleRange(prev => (prev.start === 0 && prev.end === Math.max(0, totalMeasures - 1)) ? prev : { start: 0, end: Math.max(0, totalMeasures - 1) });
      return;
    }
    const computeRange = () => {
      const { lastScrollLeft, width } = viewportCacheRef.current;
      const curW = Math.max(20, measureWidthRef.current);
      let start = Math.max(0, Math.floor(lastScrollLeft / curW) - VIEWPORT_BUFFER_MEASURES);
      const end = Math.min(totalMeasures - 1, Math.ceil((lastScrollLeft + width) / curW) + VIEWPORT_BUFFER_MEASURES);
      if (start > end) start = Math.max(0, end - VIEWPORT_BUFFER_MEASURES);
      startTransition(() => {
        setVisibleRange(prev => {
          if (prev.start === start && prev.end === end) return prev;
          if (!immediate) {
            const atLeftEdge = start === 0 && prev.start !== 0;
            const atRightEdge = end === totalMeasures - 1 && prev.end !== totalMeasures - 1;
            const deltaStart = Math.abs(prev.start - start);
            const deltaEnd = Math.abs(prev.end - end);
            if (!atLeftEdge && !atRightEdge && deltaStart < SCROLL_HYSTERESIS_MEASURES && deltaEnd < SCROLL_HYSTERESIS_MEASURES) {
              return prev;
            }
          }
          return { start, end };
        });
      });
    };
    if (immediate) {
      computeRange();
    } else {
      if (isRangeScheduledRef.current) return;
      isRangeScheduledRef.current = true;
      requestAnimationFrame(() => {
        isRangeScheduledRef.current = false;
        computeRange();
      });
    }
  }, [totalMeasures]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !isActive) return;
    viewportCacheRef.current.lastScrollLeft = el.scrollLeft;
    viewportCacheRef.current.width = el.clientWidth - headerWidth;
    const handleScroll = () => {
      viewportCacheRef.current.lastScrollLeft = el.scrollLeft;
      if (totalMeasures > VIRTUALIZATION_MIN_MEASURES) updateVisibleRange(false);
    };
    el.addEventListener('scroll', handleScroll, { passive: true });
    updateVisibleRange(true);
    const ro = new ResizeObserver((entries) => {
      if (entries[0]) viewportCacheRef.current.width = entries[0].contentRect.width - headerWidth;
      updateVisibleRange(true);
    });
    ro.observe(el);
    return () => {
      el.removeEventListener('scroll', handleScroll);
      ro.disconnect();
    };
  }, [updateVisibleRange, scrollRef, isActive, totalMeasures, headerWidth]);

  useEffect(() => {
    if (scrollRef.current) viewportCacheRef.current.lastScrollLeft = scrollRef.current.scrollLeft;
    updateVisibleRange(true);
  }, [measureWidth, totalMeasures, updateVisibleRange, scrollRef]);

  return { visibleRange, viewportCacheRef, updateVisibleRange };
}
