import React, { useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import { applyAnchoredTimelineZoom, attachTouchPinch } from '../../utils/timeline/timelineZoomUtils';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { usePerformanceStore } from '../../stores/usePerformanceStore';

export interface UseTimelinePinchPanOptions {
  containerRef: React.RefObject<HTMLDivElement | null>;
  scrollRef: React.RefObject<HTMLDivElement | null>;
  gridRef: React.RefObject<HTMLDivElement | null>;
  measureWidth: number; headerWidth: number; totalMeasures: number;
  totalContentW: number; leftPositions: number[]; widths: number[];
  isPlaying: boolean; onMeasureWidthChange: (width: number) => void;
  toolMode?: 'cursor' | 'hand'; isSpacePressed?: boolean; isMultiSelectMode?: boolean;
  clearTimelineSelection?: () => void; clearAutomationSelection?: () => void;
}

export function useTimelinePinchPan({
  containerRef, scrollRef, gridRef, measureWidth, headerWidth, totalMeasures,
  totalContentW, leftPositions, widths, isPlaying, onMeasureWidthChange,
  toolMode = 'cursor', isSpacePressed = false, isMultiSelectMode = false,
  clearTimelineSelection, clearAutomationSelection,
}: UseTimelinePinchPanOptions) {
  const measureWidthRef = useRef(measureWidth), pendingTargetWidthRef = useRef<number | null>(null), pendingScrollLeft = useRef<number | null>(null);
  const zoomRafRef = useRef<number | null>(null), zoomCommitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cachedRectRef = useRef<{ rect: DOMRect; ts: number } | null>(null);
  const geomRef = useRef({ baseMeasureW: measureWidth, totalContentW, leftPositions, widths, isPlaying, headerWidth, totalMeasures });
  geomRef.current = { baseMeasureW: measureWidth, totalContentW, leftPositions, widths, isPlaying, headerWidth, totalMeasures };

  const isPanningActive = toolMode === 'hand' || isSpacePressed;
  const isPanningDragging = useRef(false), panPointerId = useRef<number | null>(null);
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

  useEffect(() => () => {
    if (zoomRafRef.current !== null) cancelAnimationFrame(zoomRafRef.current);
    if (zoomCommitTimerRef.current !== null) clearTimeout(zoomCommitTimerRef.current);
  }, []);

  const scheduleAnchoredZoom = useCallback((nextW: number, debounceMs = 150) => {
    pendingTargetWidthRef.current = nextW;
    if (zoomRafRef.current === null) {
      zoomRafRef.current = requestAnimationFrame(() => {
        zoomRafRef.current = null;
        const targetW = pendingTargetWidthRef.current, cEl = containerRef.current, sEl = scrollRef.current;
        if (targetW === null || !cEl || !sEl) return;
        const g = geomRef.current, st = useSequencerStore.getState();
        const anchorM = st.activeTimelineCell?.measureIdx ?? st.selectedTimelineCells[0]?.mIdx ?? st.currentMeasure ?? 0;
        const res = applyAnchoredTimelineZoom({
          containerEl: cEl, scrollEl: sEl, gridEl: gridRef.current, currentW: measureWidthRef.current, targetW,
          baseMeasureW: g.baseMeasureW, headerWidth: g.headerWidth, totalMeasures: g.totalMeasures, totalContentW: g.totalContentW,
          leftPositions: g.leftPositions, widths: g.widths, isPlaying: g.isPlaying, anchorMeasureIdx: anchorM,
          playheadMeasureIdx: st.currentMeasure ?? 0, disablePlayheadRAF: usePerformanceStore.getState().disablePlayheadRAF,
        });
        if (res) { measureWidthRef.current = res.targetW; pendingScrollLeft.current = res.newScrollLeft; }
      });
    }
    if (zoomCommitTimerRef.current !== null) clearTimeout(zoomCommitTimerRef.current);
    zoomCommitTimerRef.current = setTimeout(() => {
      zoomCommitTimerRef.current = null;
      const finalW = measureWidthRef.current;
      React.startTransition(() => onMeasureWidthChange(finalW));
    }, debounceMs);
  }, [containerRef, scrollRef, gridRef, onMeasureWidthChange]);

  const handleZoom = useCallback((targetWidth: number) => {
    if (measureWidthRef.current === targetWidth) return;
    scheduleAnchoredZoom(targetWidth, isPlaying ? 120 : 16);
  }, [isPlaying, scheduleAnchoredZoom]);

  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      const cEl = containerRef.current, sEl = scrollRef.current;
      if (!cEl || !sEl) return;
      const now = performance.now();
      if (!cachedRectRef.current || now - cachedRectRef.current.ts > 200) cachedRectRef.current = { rect: cEl.getBoundingClientRect(), ts: now };
      const r = cachedRectRef.current.rect;
      const inB = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
      if (!inB && !cEl.contains(e.target as Node) && !Boolean((e.target as Element)?.closest?.('.timeline-container'))) return;
      e.preventDefault(); e.stopPropagation();
      const delta = e.deltaY !== 0 ? e.deltaY : e.deltaX;
      if (delta === 0) return;
      const baseW = pendingTargetWidthRef.current ?? measureWidthRef.current;
      const targetW = Math.max(60, Math.min(320, Math.round(baseW * (delta < 0 ? 1.15 : 0.87))));
      if (targetW !== baseW) scheduleAnchoredZoom(targetW, 150);
    };
    window.addEventListener('wheel', handleWheel, { passive: false, capture: true });
    return () => window.removeEventListener('wheel', handleWheel, { capture: true });
  }, [containerRef, scrollRef, scheduleAnchoredZoom]);

  useEffect(() => {
    const cEl = containerRef.current;
    if (!cEl) return;
    const onScroll = (e: WheelEvent) => { if (!e.ctrlKey && !e.metaKey && scrollRef.current && e.deltaY !== 0) { e.preventDefault(); scrollRef.current.scrollLeft += e.deltaY; } };
    cEl.addEventListener('wheel', onScroll, { passive: false });
    return () => cEl.removeEventListener('wheel', onScroll);
  }, [containerRef, scrollRef]);

  useEffect(() => {
    if (containerRef.current) return attachTouchPinch(containerRef.current, () => measureWidthRef.current, (w) => scheduleAnchoredZoom(w, 150));
  }, [containerRef, scheduleAnchoredZoom]);

  const handleViewportPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    const isBlank = target === scrollRef.current || target === gridRef.current || target?.classList?.contains('grid-lines-overlay') || target?.classList?.contains('wallpaper-surface-bg');
    if (isBlank && !e.shiftKey && !e.ctrlKey && !e.metaKey && !isMultiSelectMode) { clearTimelineSelection?.(); clearAutomationSelection?.(); }
    if (e.button === 0 && (isPanningActive || isBlank)) {
      isPanningDragging.current = true; panPointerId.current = e.pointerId; e.currentTarget.setPointerCapture?.(e.pointerId);
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
      e.currentTarget.releasePointerCapture?.(e.pointerId); e.currentTarget.classList.remove('panning-dragging'); e.stopPropagation();
    }
  };

  return { pendingScrollLeft, measureWidthRef, handleZoom, isPanningActive, handleViewportPointerDown, handleViewportPointerMove, handleViewportPointerUp };
}
