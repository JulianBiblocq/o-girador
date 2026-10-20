import React, { useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import { computeAndApplyWheelZoom, attachTouchPinch } from '../../utils/timeline/timelineZoomUtils';

export interface UseTimelinePinchPanOptions {
  containerRef: React.RefObject<HTMLDivElement | null>;
  scrollRef: React.RefObject<HTMLDivElement | null>;
  gridRef: React.RefObject<HTMLDivElement | null>;
  measureWidth: number; headerWidth: number; totalMeasures: number;
  isPlaying: boolean; onMeasureWidthChange: (width: number) => void;
  toolMode?: 'cursor' | 'hand'; isSpacePressed?: boolean; isMultiSelectMode?: boolean;
  clearTimelineSelection?: () => void; clearAutomationSelection?: () => void;
}

export function useTimelinePinchPan({
  containerRef, scrollRef, gridRef, measureWidth, headerWidth, totalMeasures,
  isPlaying, onMeasureWidthChange, toolMode = 'cursor', isSpacePressed = false,
  isMultiSelectMode = false, clearTimelineSelection, clearAutomationSelection,
}: UseTimelinePinchPanOptions) {
  const measureWidthRef = useRef(measureWidth);
  const pendingTargetWidthRef = useRef<number | null>(null);
  const pendingScrollLeft = useRef<number | null>(null);
  const isPanningActive = toolMode === 'hand' || isSpacePressed;
  const isPanningDragging = useRef(false);
  const panPointerId = useRef<number | null>(null);
  const panStartX = useRef(0), panStartY = useRef(0), panStartScrollLeft = useRef(0), panStartScrollTop = useRef(0);

  useLayoutEffect(() => { if (gridRef.current) gridRef.current.style.transform = ''; }, [measureWidth, gridRef]);
  useLayoutEffect(() => {
    if (pendingScrollLeft.current !== null && scrollRef.current) {
      scrollRef.current.scrollLeft = Math.max(0, pendingScrollLeft.current);
      pendingScrollLeft.current = null;
    }
  }, [measureWidth, scrollRef]);

  useEffect(() => {
    if (pendingTargetWidthRef.current !== null && measureWidth === pendingTargetWidthRef.current) pendingTargetWidthRef.current = null;
    else measureWidthRef.current = measureWidth;
  }, [measureWidth]);

  const handleZoom = useCallback((targetWidth: number) => {
    if (measureWidthRef.current === targetWidth) return;
    if (isPlaying && gridRef.current) {
      gridRef.current.style.transform = `scaleX(${targetWidth / measureWidthRef.current})`;
      setTimeout(() => React.startTransition(() => onMeasureWidthChange(targetWidth)), 10);
    } else {
      onMeasureWidthChange(targetWidth);
    }
  }, [isPlaying, gridRef, onMeasureWidthChange]);

  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      const cEl = containerRef.current, sEl = scrollRef.current;
      if (!cEl || !sEl) return;
      const r = cEl.getBoundingClientRect();
      const inB = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
      if (!inB && !cEl.contains(e.target as Node) && !Boolean((e.target as Element)?.closest?.('.timeline-container'))) return;
      e.preventDefault(); e.stopPropagation();

      const res = computeAndApplyWheelZoom({ e, containerEl: cEl, scrollEl: sEl, gridEl: gridRef.current, currentW: measureWidthRef.current, headerWidth, totalMeasures });
      if (!res) return;
      measureWidthRef.current = res.targetW;
      pendingTargetWidthRef.current = res.targetW;
      pendingScrollLeft.current = res.newScrollLeft;
      if (isPlaying) React.startTransition(() => onMeasureWidthChange(res.targetW));
      else onMeasureWidthChange(res.targetW);
    };
    window.addEventListener('wheel', handleWheel, { passive: false, capture: true });
    return () => window.removeEventListener('wheel', handleWheel, { capture: true });
  }, [headerWidth, totalMeasures, onMeasureWidthChange, isPlaying, containerRef, scrollRef, gridRef]);

  useEffect(() => {
    const cEl = containerRef.current;
    if (!cEl) return;
    const onScroll = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey && scrollRef.current && e.deltaY !== 0) {
        e.preventDefault(); scrollRef.current.scrollLeft += e.deltaY;
      }
    };
    cEl.addEventListener('wheel', onScroll, { passive: false });
    return () => cEl.removeEventListener('wheel', onScroll);
  }, [containerRef, scrollRef]);

  useEffect(() => {
    if (containerRef.current) return attachTouchPinch(containerRef.current, () => measureWidthRef.current, onMeasureWidthChange);
  }, [containerRef, onMeasureWidthChange]);

  const handleViewportPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    const isBlank = target === scrollRef.current || target === gridRef.current || target?.classList?.contains('grid-lines-overlay') || target?.classList?.contains('wallpaper-surface-bg');
    if (isBlank && !e.shiftKey && !e.ctrlKey && !e.metaKey && !isMultiSelectMode) {
      clearTimelineSelection?.(); clearAutomationSelection?.();
    }
    if (e.button === 0 && (isPanningActive || isBlank)) {
      isPanningDragging.current = true; panPointerId.current = e.pointerId;
      e.currentTarget.setPointerCapture?.(e.pointerId);
      panStartX.current = e.clientX; panStartY.current = e.clientY;
      panStartScrollLeft.current = e.currentTarget.scrollLeft; panStartScrollTop.current = e.currentTarget.scrollTop;
      e.currentTarget.classList.add('panning-dragging'); e.preventDefault(); e.stopPropagation();
    }
  };
  const handleViewportPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isPanningDragging.current && e.pointerId === panPointerId.current) {
      e.currentTarget.scrollLeft = panStartScrollLeft.current - (e.clientX - panStartX.current);
      e.currentTarget.scrollTop = panStartScrollTop.current - (e.clientY - panStartY.current);
      e.preventDefault(); e.stopPropagation();
    }
  };
  const handleViewportPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isPanningDragging.current && e.pointerId === panPointerId.current) {
      isPanningDragging.current = false; panPointerId.current = null;
      e.currentTarget.releasePointerCapture?.(e.pointerId);
      e.currentTarget.classList.remove('panning-dragging'); e.stopPropagation();
    }
  };

  return { pendingScrollLeft, measureWidthRef, handleZoom, isPanningActive, handleViewportPointerDown, handleViewportPointerMove, handleViewportPointerUp };
}
