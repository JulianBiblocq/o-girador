import React, { useEffect } from 'react';
import { useSequencerStore } from '../../../stores/useSequencerStore';
import { useSequencerSettingsStore } from '../../../stores/useSequencerSettingsStore';
import { registerTimelineCanvasZoomListener } from '../../../utils/timeline/timelineZoomUtils';
import { invalidateTimelineCanvasTheme } from './timelineCanvasThemeCache';

interface TimelineCanvasObserversParams {
  scrollRef: React.RefObject<HTMLDivElement | null>;
  gridRef: React.RefObject<HTMLDivElement | null>;
  tracksAreaRef: React.RefObject<HTMLDivElement | null>;
  scrollStateRef: React.MutableRefObject<{ scrollLeft: number; scrollTop: number }>;
  viewportDimRef: React.MutableRefObject<{ clientW: number; clientH: number }>;
  tracksOffsetTopRef: React.MutableRefObject<number>;
  lastGridHRef: React.MutableRefObject<number>;
  rafIdRef: React.MutableRefObject<number | null>;
  refreshViewportRect: () => void;
  paintCanvas: (overrideMeasureW?: number, overrideScrollLeft?: number) => void;
  requestCanvasRepaint: () => void;
}

export function useTimelineCanvasObservers({
  scrollRef,
  gridRef,
  tracksAreaRef,
  scrollStateRef,
  viewportDimRef,
  tracksOffsetTopRef,
  lastGridHRef,
  rafIdRef,
  refreshViewportRect,
  paintCanvas,
  requestCanvasRepaint,
}: TimelineCanvasObserversParams): void {
  useEffect(() => {
    const sEl = scrollRef.current;
    const gEl = gridRef.current;
    const tEl = tracksAreaRef.current;
    if (!sEl) return;

    viewportDimRef.current = { clientW: sEl.clientWidth, clientH: sEl.clientHeight };
    scrollStateRef.current = { scrollLeft: sEl.scrollLeft, scrollTop: sEl.scrollTop };
    if (tEl) tracksOffsetTopRef.current = tEl.offsetTop;
    refreshViewportRect();
    paintCanvas();

    const onScroll = () => {
      scrollStateRef.current.scrollLeft = sEl.scrollLeft;
      scrollStateRef.current.scrollTop = sEl.scrollTop;
      paintCanvas();
    };
    sEl.addEventListener('scroll', onScroll, { passive: true });
    const unsubZoom = registerTimelineCanvasZoomListener((w, sl) => {
      scrollStateRef.current.scrollLeft = sl;
      paintCanvas(w, sl);
    });
    const unsubStore = useSequencerStore.subscribe(() => requestCanvasRepaint());
    const unsubSettings = useSequencerSettingsStore.subscribe((state, prevState) => {
      if (
        state.enabledSignalIds !== prevState.enabledSignalIds ||
        state.forcedStrokes !== prevState.forcedStrokes
      ) {
        requestCanvasRepaint();
      }
    });

    const roScroll =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver((entries) => {
            const cr = entries[0]?.contentRect;
            if (cr && cr.width > 0 && cr.height > 0) {
              viewportDimRef.current = { clientW: cr.width, clientH: cr.height };
              refreshViewportRect();
              paintCanvas();
            }
          })
        : null;
    roScroll?.observe(sEl);

    const roGrid =
      typeof ResizeObserver !== 'undefined' && gEl
        ? new ResizeObserver((entries) => {
            const h = entries[0]?.contentRect.height ?? 0;
            if (Math.abs(h - lastGridHRef.current) >= 0.5) {
              lastGridHRef.current = h;
              if (tracksAreaRef.current) tracksOffsetTopRef.current = tracksAreaRef.current.offsetTop;
              requestCanvasRepaint();
            }
          })
        : null;
    if (gEl) roGrid?.observe(gEl);

    const mo =
      typeof MutationObserver !== 'undefined'
        ? new MutationObserver(() => {
            invalidateTimelineCanvasTheme();
            requestCanvasRepaint();
          })
        : null;
    if (typeof document !== 'undefined') {
      mo?.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'data-theme', 'style'] });
      mo?.observe(document.body, { attributes: true, attributeFilter: ['class', 'data-theme', 'style'] });
    }

    return () => {
      sEl.removeEventListener('scroll', onScroll);
      unsubZoom();
      unsubStore();
      unsubSettings();
      roScroll?.disconnect();
      roGrid?.disconnect();
      mo?.disconnect();
      if (rafIdRef.current !== null) cancelAnimationFrame(rafIdRef.current);
    };
  }, [scrollRef, gridRef, tracksAreaRef, paintCanvas, refreshViewportRect, requestCanvasRepaint, scrollStateRef, viewportDimRef, tracksOffsetTopRef, lastGridHRef, rafIdRef]);
}
