import React, { useRef, useEffect, useCallback } from 'react';

interface UseTimelineMinimapDragOptions {
  scrollRef: React.RefObject<HTMLDivElement | null>;
  pendingScrollLeftRef: React.MutableRefObject<number | null>;
  minimapContainerRef: React.RefObject<HTMLDivElement | null>;
  minimapSliderRef: React.RefObject<HTMLDivElement | null>;
  sliderWidthRef: React.MutableRefObject<number>;
  sliderLeftRef: React.MutableRefObject<number>;
  totalMeasures: number;
  MEASURE_W: number;
  HEADER_W: number;
  onMeasureWidthChange: (width: number) => void;
  onZoomStart?: () => void;
  onZoomEnd?: () => void;
}

export function useTimelineMinimapDrag({
  scrollRef, pendingScrollLeftRef, minimapContainerRef, minimapSliderRef,
  sliderWidthRef, sliderLeftRef, totalMeasures, MEASURE_W, HEADER_W,
  onMeasureWidthChange, onZoomStart, onZoomEnd,
}: UseTimelineMinimapDragOptions) {
  const isDragging = useRef(false);
  const pointerIdRef = useRef<number | null>(null);
  const dragAbortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => () => { if (dragAbortControllerRef.current) dragAbortControllerRef.current.abort(); }, []);

  const handleMinimapDrag = useCallback((clientX: number) => {
    if (!scrollRef.current || !minimapContainerRef.current || !minimapSliderRef.current) return;
    const rect = minimapContainerRef.current.getBoundingClientRect();
    const ratio = rect.width / (totalMeasures * MEASURE_W + 150);
    if (ratio <= 0) return;
    const sw = sliderWidthRef.current || 50;
    const newLeft = Math.max(0, Math.min(rect.width - sw, clientX - rect.left - sw / 2));
    sliderLeftRef.current = newLeft;
    scrollRef.current.scrollLeft = newLeft / ratio;
    minimapSliderRef.current.style.transform = `translate3d(${newLeft}px, 0, 0)`;
  }, [totalMeasures, MEASURE_W, scrollRef, minimapContainerRef, minimapSliderRef, sliderLeftRef, sliderWidthRef]);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    isDragging.current = true;
    pointerIdRef.current = e.pointerId;
    minimapContainerRef.current?.setPointerCapture(e.pointerId);
    handleMinimapDrag(e.clientX);
    e.preventDefault();
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDragging.current && e.pointerId === pointerIdRef.current) handleMinimapDrag(e.clientX);
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDragging.current && e.pointerId === pointerIdRef.current) {
      isDragging.current = false;
      pointerIdRef.current = null;
      minimapContainerRef.current?.releasePointerCapture(e.pointerId);
    }
  };

  const handleZoomHandle = (e: React.PointerEvent<HTMLDivElement>, isLeft: boolean) => {
    if (e.button !== 0) return;
    e.preventDefault(); e.stopPropagation();
    if (!minimapContainerRef.current || !minimapSliderRef.current || !scrollRef.current) return;
    const initX = e.clientX, initS = sliderWidthRef.current, initL = sliderLeftRef.current, M = minimapContainerRef.current.clientWidth;
    const hEl = e.currentTarget, pId = e.pointerId;
    if (typeof hEl.setPointerCapture === 'function') { try { hEl.setPointerCapture(pId); } catch (_) {} }
    let rafId: number | null = null, latestX = initX;
    onZoomStart?.();

    const performZoom = (clientX: number, isFinal: boolean = false) => {
      const deltaX = clientX - initX;
      const targetS = Math.max(16, isLeft ? initS - deltaX : initS + deltaX);
      const targetL = isLeft ? Math.max(0, Math.min(M - targetS, initL + deltaX)) : initL;
      const vW = scrollRef.current ? scrollRef.current.clientWidth - HEADER_W : 800;
      const clampedW = Math.max(20, Math.min(960, ((M * vW) / targetS - 150) / totalMeasures));

      React.startTransition(() => {
        const newScrollLeft = (targetL / M) * (totalMeasures * clampedW + 150);
        pendingScrollLeftRef.current = newScrollLeft;
        if (scrollRef.current) scrollRef.current.scrollLeft = newScrollLeft;
        onMeasureWidthChange(clampedW);
        if (isFinal) onZoomEnd?.();
      });

      if (minimapSliderRef.current) {
        sliderWidthRef.current = targetS; sliderLeftRef.current = targetL;
        minimapSliderRef.current.style.width = `${targetS}px`;
        minimapSliderRef.current.style.transform = `translate3d(${targetL}px, 0, 0)`;
      }
    };

    const onMove = (ev: PointerEvent) => {
      latestX = ev.clientX;
      if (rafId === null) {
        rafId = requestAnimationFrame(() => { rafId = null; performZoom(latestX, false); });
      }
    };

    const onUp = () => {
      if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; }
      performZoom(latestX, true);
      if (typeof hEl.releasePointerCapture === 'function') { try { hEl.releasePointerCapture(pId); } catch (_) {} }
      if (dragAbortControllerRef.current) dragAbortControllerRef.current.abort();
      document.body.style.cursor = 'default';
    };

    if (dragAbortControllerRef.current) dragAbortControllerRef.current.abort();
    dragAbortControllerRef.current = new AbortController();
    const { signal } = dragAbortControllerRef.current;
    window.addEventListener('pointermove', onMove, { signal });
    window.addEventListener('pointerup', onUp, { signal });
    window.addEventListener('pointercancel', onUp, { signal });
    document.body.style.cursor = 'ew-resize';
  };

  return { onPointerDown, onPointerMove, onPointerUp, handleZoomHandle };
}
