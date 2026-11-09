import { useState, useRef, useCallback, useEffect, useMemo, startTransition } from 'react';

export interface UseTimelineViewportOptions {
  totalMeasures: number;
  measureWidth: number;
  headerWidth: number;
  scrollRef: React.RefObject<HTMLDivElement | null>;
  isPlaying: boolean;
  isActive?: boolean;
}

const SCROLL_HYSTERESIS_MEASURES = 3;

function computeViewportBounds(totalMeasures: number, scrollLeft: number, viewW: number, measureW: number) {
  const curW = Math.max(20, measureW);
  const buffer = curW >= 140 ? 2 : 6;
  const visibleCount = Math.ceil(Math.max(300, viewW) / curW);
  if (totalMeasures <= visibleCount + buffer * 2) {
    return { start: 0, end: Math.max(0, totalMeasures - 1) };
  }
  let start = Math.max(0, Math.floor(scrollLeft / curW) - buffer);
  const end = Math.min(totalMeasures - 1, Math.ceil((scrollLeft + viewW) / curW) + buffer);
  if (start > end) start = Math.max(0, end - buffer);
  return { start, end };
}

export function useTimelineViewport({
  totalMeasures, measureWidth, headerWidth, scrollRef, isActive = true,
}: UseTimelineViewportOptions) {
  const measureWidthRef = useRef(measureWidth);
  measureWidthRef.current = measureWidth;

  const viewportCacheRef = useRef({
    width: typeof window !== 'undefined' ? window.innerWidth - headerWidth : 1200,
    lastScrollLeft: 0,
  });

  const [rangeState, setRangeState] = useState(() =>
    computeViewportBounds(totalMeasures, 0, viewportCacheRef.current.width, measureWidth)
  );
  const isRangeScheduledRef = useRef(false);

  const updateVisibleRange = useCallback((immediate = false) => {
    const apply = () => {
      if (scrollRef.current) viewportCacheRef.current.lastScrollLeft = scrollRef.current.scrollLeft;
      const { lastScrollLeft, width } = viewportCacheRef.current;
      const next = computeViewportBounds(totalMeasures, lastScrollLeft, width, measureWidthRef.current);
      startTransition(() => {
        setRangeState(prev => {
          if (prev.start === next.start && prev.end === next.end) return prev;
          if (!immediate) {
            const atLeft = next.start === 0 && prev.start !== 0;
            const atRight = next.end === totalMeasures - 1 && prev.end !== totalMeasures - 1;
            const dS = Math.abs(prev.start - next.start), dE = Math.abs(prev.end - next.end);
            if (!atLeft && !atRight && dS < SCROLL_HYSTERESIS_MEASURES && dE < SCROLL_HYSTERESIS_MEASURES) return prev;
          }
          return next;
        });
      });
    };
    if (immediate) {
      apply();
    } else if (!isRangeScheduledRef.current) {
      isRangeScheduledRef.current = true;
      requestAnimationFrame(() => { isRangeScheduledRef.current = false; apply(); });
    }
  }, [totalMeasures, scrollRef]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !isActive) return;
    viewportCacheRef.current.lastScrollLeft = el.scrollLeft;
    viewportCacheRef.current.width = el.clientWidth - headerWidth;
    const handleScroll = () => {
      viewportCacheRef.current.lastScrollLeft = el.scrollLeft;
      updateVisibleRange(false);
    };
    el.addEventListener('scroll', handleScroll, { passive: true });
    updateVisibleRange(true);
    const ro = new ResizeObserver((entries) => {
      if (entries[0]) viewportCacheRef.current.width = entries[0].contentRect.width - headerWidth;
      updateVisibleRange(true);
    });
    ro.observe(el);
    return () => { el.removeEventListener('scroll', handleScroll); ro.disconnect(); };
  }, [updateVisibleRange, scrollRef, isActive, totalMeasures, headerWidth]);

  useEffect(() => { updateVisibleRange(true); }, [measureWidth, totalMeasures, updateVisibleRange]);

  const visibleRange = useMemo(() => {
    const liveScroll = scrollRef.current ? scrollRef.current.scrollLeft : viewportCacheRef.current.lastScrollLeft;
    const syncBounds = computeViewportBounds(totalMeasures, liveScroll, viewportCacheRef.current.width, measureWidth);
    if (measureWidth >= 140 && (syncBounds.end - syncBounds.start) < (rangeState.end - rangeState.start)) {
      return syncBounds;
    }
    return rangeState;
  }, [measureWidth, totalMeasures, rangeState, scrollRef]);

  return { visibleRange, viewportCacheRef, updateVisibleRange };
}
