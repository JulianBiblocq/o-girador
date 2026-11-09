import React, { useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import { applyAnchoredTimelineZoom, attachTouchPinch, computeWheelZoomTarget, livePlayheadZoomState, setTimelineZoomingDomFlag } from '../../utils/timeline/timelineZoomUtils';
import { useSequencerStore } from '../../stores/useSequencerStore';

export interface UseTimelinePinchPanOptions {
  containerRef: React.RefObject<HTMLDivElement | null>; scrollRef: React.RefObject<HTMLDivElement | null>;
  gridRef: React.RefObject<HTMLDivElement | null>; measureWidth: number; headerWidth: number; totalMeasures: number;
  totalContentW: number; leftPositions: number[]; widths: number[]; isPlaying: boolean;
  onMeasureWidthChange: (width: number) => void; toolMode?: 'cursor' | 'hand'; isSpacePressed?: boolean;
  isMultiSelectMode?: boolean; clearTimelineSelection?: () => void; clearAutomationSelection?: () => void;
}

export function useTimelinePinchPan({
  containerRef, scrollRef, gridRef, measureWidth, headerWidth, totalMeasures,
  totalContentW, leftPositions, widths, isPlaying, onMeasureWidthChange,
  toolMode = 'cursor', isSpacePressed = false, isMultiSelectMode = false,
  clearTimelineSelection, clearAutomationSelection,
}: UseTimelinePinchPanOptions) {
  const currentVisualWidthRef = useRef(measureWidth), targetMeasureWidthRef = useRef(measureWidth);
  const pendingScrollLeft = useRef<number | null>(null);
  const zoomRafRef = useRef<number | null>(null), zoomCommitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cachedRectRef = useRef<{ rect: DOMRect; ts: number } | null>(null);
  const geomRef = useRef({ baseMeasureW: measureWidth, totalContentW, leftPositions, widths, isPlaying, headerWidth, totalMeasures });
  geomRef.current = { baseMeasureW: measureWidth, totalContentW, leftPositions, widths, isPlaying, headerWidth, totalMeasures };

  const isPanningActive = toolMode === 'hand' || isSpacePressed;
  const isPanningDragging = useRef(false), panPointerId = useRef<number | null>(null);
  const panStartX = useRef(0), panStartY = useRef(0), panStartScrollLeft = useRef(0), panStartScrollTop = useRef(0);
  useLayoutEffect(() => {
    if (gridRef.current) gridRef.current.style.transform = '';
    if (pendingScrollLeft.current !== null && scrollRef.current) {
      scrollRef.current.scrollLeft = Math.max(0, pendingScrollLeft.current); pendingScrollLeft.current = null;
    }
    if (zoomRafRef.current === null && zoomCommitTimerRef.current === null) setTimelineZoomingDomFlag(containerRef.current, scrollRef.current, false);
  }, [measureWidth, gridRef, scrollRef, containerRef]);
  useEffect(() => {
    if (zoomRafRef.current === null && zoomCommitTimerRef.current === null) {
      currentVisualWidthRef.current = measureWidth; targetMeasureWidthRef.current = measureWidth;
    }
  }, [measureWidth]);
  useEffect(() => () => {
    if (zoomRafRef.current !== null) cancelAnimationFrame(zoomRafRef.current);
    if (zoomCommitTimerRef.current !== null) clearTimeout(zoomCommitTimerRef.current);
    livePlayheadZoomState.isZooming = false;
  }, []);

  const scheduleSmoothZoomTo = useCallback((nextTargetW: number) => {
    targetMeasureWidthRef.current = nextTargetW;
    setTimelineZoomingDomFlag(containerRef.current, scrollRef.current, true);
    if (zoomCommitTimerRef.current !== null) { clearTimeout(zoomCommitTimerRef.current); zoomCommitTimerRef.current = null; }
    if (zoomRafRef.current !== null) return;

    const stepZoomFrame = () => {
      const cEl = containerRef.current, sEl = scrollRef.current;
      if (!cEl || !sEl) { zoomRafRef.current = null; setTimelineZoomingDomFlag(cEl, sEl, false); return; }
      const curW = currentVisualWidthRef.current, targetW = targetMeasureWidthRef.current;
      const diff = targetW - curW;
      const nextW = Math.abs(diff) <= 0.8 ? targetW : Math.round((curW + diff * 0.42) * 100) / 100;
      const g = geomRef.current, st = useSequencerStore.getState();
      const anchorM = st.activeTimelineCell?.measureIdx ?? st.selectedTimelineCells[0]?.mIdx ?? st.currentMeasure ?? 0;
      const res = applyAnchoredTimelineZoom({
        containerEl: cEl, scrollEl: sEl, gridEl: gridRef.current, currentW: curW, targetW: nextW,
        baseMeasureW: g.baseMeasureW, headerWidth: g.headerWidth, totalMeasures: g.totalMeasures, totalContentW: g.totalContentW,
        leftPositions: g.leftPositions, widths: g.widths, isPlaying: g.isPlaying, anchorMeasureIdx: anchorM,
        playheadMeasureIdx: st.currentMeasure ?? 0,
      });
      currentVisualWidthRef.current = res ? res.targetW : nextW;
      if (res) pendingScrollLeft.current = res.newScrollLeft;

      if (Math.abs(targetMeasureWidthRef.current - currentVisualWidthRef.current) > 0.1) {
        zoomRafRef.current = requestAnimationFrame(stepZoomFrame);
      } else {
        zoomRafRef.current = null;
        zoomCommitTimerRef.current = setTimeout(() => {
          zoomCommitTimerRef.current = null;
          const finalW = Math.round(currentVisualWidthRef.current);
          currentVisualWidthRef.current = finalW; targetMeasureWidthRef.current = finalW;
          if (finalW === geomRef.current.baseMeasureW) setTimelineZoomingDomFlag(containerRef.current, scrollRef.current, false);
          else React.startTransition(() => onMeasureWidthChange(finalW));
        }, 160);
      }
    };
    zoomRafRef.current = requestAnimationFrame(stepZoomFrame);
  }, [containerRef, scrollRef, gridRef, onMeasureWidthChange]);

  const handleZoom = useCallback((targetWidth: number) => {
    const clamped = Math.max(20, Math.min(320, Math.round(targetWidth)));
    if (Math.abs(currentVisualWidthRef.current - clamped) >= 0.5) scheduleSmoothZoomTo(clamped);
  }, [scheduleSmoothZoomTo]);
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
      const nextTarget = computeWheelZoomTarget(e.deltaY !== 0 ? e.deltaY : e.deltaX, targetMeasureWidthRef.current);
      if (nextTarget !== null) scheduleSmoothZoomTo(nextTarget);
    };
    window.addEventListener('wheel', handleWheel, { passive: false, capture: true });
    return () => window.removeEventListener('wheel', handleWheel, { capture: true });
  }, [containerRef, scrollRef, scheduleSmoothZoomTo]);
  useEffect(() => {
    const cEl = containerRef.current;
    if (!cEl) return;
    const onScroll = (e: WheelEvent) => { if (!e.ctrlKey && !e.metaKey && scrollRef.current && e.deltaY !== 0) { e.preventDefault(); scrollRef.current.scrollLeft += e.deltaY; } };
    cEl.addEventListener('wheel', onScroll, { passive: false });
    return () => cEl.removeEventListener('wheel', onScroll);
  }, [containerRef, scrollRef]);
  useEffect(() => {
    if (containerRef.current) return attachTouchPinch(containerRef.current, () => currentVisualWidthRef.current, (w) => scheduleSmoothZoomTo(w));
  }, [containerRef, scheduleSmoothZoomTo]);

  const handleViewportPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const t = e.target as HTMLElement;
    const isBlank = t === scrollRef.current || t === gridRef.current || t?.classList?.contains('grid-lines-overlay') || t?.classList?.contains('wallpaper-surface-bg');
    if (isBlank && !e.shiftKey && !e.ctrlKey && !e.metaKey && !isMultiSelectMode) { clearTimelineSelection?.(); clearAutomationSelection?.(); }
    if (e.button === 0 && (isPanningActive || isBlank)) {
      isPanningDragging.current = true; panPointerId.current = e.pointerId; e.currentTarget.setPointerCapture?.(e.pointerId);
      panStartX.current = e.clientX; panStartY.current = e.clientY;
      panStartScrollLeft.current = e.currentTarget.scrollLeft; panStartScrollTop.current = e.currentTarget.scrollTop;
      e.currentTarget.classList.add('panning-dragging'); e.preventDefault(); e.stopPropagation();
    }
  };
  const handleViewportPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isPanningDragging.current || e.pointerId !== panPointerId.current) return;
    e.currentTarget.scrollLeft = panStartScrollLeft.current - (e.clientX - panStartX.current);
    e.currentTarget.scrollTop = panStartScrollTop.current - (e.clientY - panStartY.current);
    e.preventDefault(); e.stopPropagation();
  };
  const handleViewportPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isPanningDragging.current || e.pointerId !== panPointerId.current) return;
    isPanningDragging.current = false; panPointerId.current = null;
    e.currentTarget.releasePointerCapture?.(e.pointerId); e.currentTarget.classList.remove('panning-dragging'); e.stopPropagation();
  };

  return { pendingScrollLeft, measureWidthRef: currentVisualWidthRef, handleZoom, isPanningActive, handleViewportPointerDown, handleViewportPointerMove, handleViewportPointerUp };
}
