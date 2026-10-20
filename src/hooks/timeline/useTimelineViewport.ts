import { useState, useRef, useCallback, useEffect, startTransition } from 'react';

export interface UseTimelineViewportOptions {
  totalMeasures: number;
  measureWidth: number;
  headerWidth: number;
  scrollRef: React.RefObject<HTMLDivElement | null>;
  isPlaying: boolean;
  isActive?: boolean;
}

export function useTimelineViewport({
  totalMeasures, measureWidth, headerWidth, scrollRef, isPlaying, isActive = true,
}: UseTimelineViewportOptions) {
  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;
  const measureWidthRef = useRef(measureWidth);
  measureWidthRef.current = measureWidth;

  const [visibleRange, setVisibleRange] = useState(() => {
    if (totalMeasures <= 48) return { start: 0, end: Math.max(0, totalMeasures - 1) };
    const initW = typeof window !== 'undefined' ? window.innerWidth : 1200;
    const initVis = Math.ceil((initW - headerWidth) / measureWidth);
    return { start: 0, end: Math.min(totalMeasures - 1, initVis + 8) };
  });

  const isRangeScheduledRef = useRef(false);
  const viewportCacheRef = useRef({
    width: typeof window !== 'undefined' ? window.innerWidth - headerWidth : 1200,
    lastScrollLeft: 0,
  });

  const updateVisibleRange = useCallback((immediate = false) => {
    if (totalMeasures <= 48) {
      setVisibleRange(prev => (prev.start === 0 && prev.end === Math.max(0, totalMeasures - 1)) ? prev : { start: 0, end: Math.max(0, totalMeasures - 1) });
      return;
    }
    const computeRange = () => {
      const { lastScrollLeft, width } = viewportCacheRef.current;
      const curW = measureWidthRef.current;
      const buffer = 8;
      let start = Math.max(0, Math.floor(lastScrollLeft / curW) - buffer);
      const end = Math.min(totalMeasures - 1, Math.ceil((lastScrollLeft + width) / curW) + buffer);
      if (start > end) start = Math.max(0, end - buffer);
      startTransition(() => {
        setVisibleRange(prev => (prev.start === start && prev.end === end) ? prev : { start, end });
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
      if (!isPlayingRef.current && totalMeasures > 48) updateVisibleRange(false);
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
    updateVisibleRange(true);
  }, [measureWidth, totalMeasures, updateVisibleRange]);

  useEffect(() => {
    if (isPlaying) {
      if (totalMeasures > 48) setVisibleRange({ start: 0, end: Math.max(0, totalMeasures - 1) });
    } else {
      updateVisibleRange(true);
    }
  }, [isPlaying, totalMeasures, updateVisibleRange]);

  return { visibleRange, viewportCacheRef, updateVisibleRange };
}
