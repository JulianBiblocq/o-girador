import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { selectTracksMeta, useSequencerStore } from '../../../stores/useSequencerStore';
import { useSequencerSettingsStore } from '../../../stores/useSequencerSettingsStore';
import { livePlayheadZoomState, registerTimelineCanvasZoomListener } from '../../../utils/timeline/timelineZoomUtils';
import { renderTimelineTracksCanvas } from './timelineCanvasRenderer';
import { buildTimelineRowLayouts } from './timelineCanvasRowLayoutBuilder';
import { invalidateTimelineCanvasTheme } from './timelineCanvasThemeCache';
import { useTimelineCanvasInteractions } from './useTimelineCanvasInteractions';

export interface TimelineTracksCanvasViewportProps {
  scrollRef: React.RefObject<HTMLDivElement | null>; gridRef: React.RefObject<HTMLDivElement | null>;
  tracksAreaRef: React.RefObject<HTMLDivElement | null>; trackIds: number[];
  expandedAutoIds: Set<number>; collapsedAutoLaneIds?: Set<number>;
  headerWidth: number; measureWidth: number; totalMeasures: number;
  measureWidths: number[]; measureLeftPositions: number[]; isPanningActive: boolean; lang: string;
  onOpenPatternPicker?: (trackId: number, measureIdx: number, rect: DOMRect) => void;
  onClearHeaderSelection?: () => void;
}

export const TimelineTracksCanvasViewport = React.memo<TimelineTracksCanvasViewportProps>((props) => {
  const { scrollRef, gridRef, tracksAreaRef, trackIds, expandedAutoIds, collapsedAutoLaneIds, headerWidth, measureWidth, totalMeasures, measureWidths, measureLeftPositions, isPanningActive, lang, onOpenPatternPicker, onClearHeaderSelection } = props;
  const canvasRef = useRef<HTMLCanvasElement | null>(null), rafIdRef = useRef<number | null>(null);
  const scrollStateRef = useRef({ scrollLeft: 0, scrollTop: 0 }), viewportDimRef = useRef({ clientW: 1200, clientH: 600 });
  const scrollViewportRectRef = useRef<{ left: number; top: number; width: number; height: number } | null>(null);
  const tracksOffsetTopRef = useRef<number>(0), lastGridHRef = useRef<number>(-1);
  const backingStoreRef = useRef({ physW: 0, physH: 0, cssW: 0, cssH: 0 });

  const tracksMeta = useSequencerStore(useShallow(selectTracksMeta));
  const { rowLayouts, totalTracksHeight } = useMemo(
    () => buildTimelineRowLayouts({ trackIds, tracksMeta, expandedAutoIds, collapsedAutoLaneIds }),
    [trackIds, tracksMeta, expandedAutoIds, collapsedAutoLaneIds]
  );
  const livePropsRef = useRef({ headerWidth, measureWidth, totalMeasures, measureWidths, measureLeftPositions, rowLayouts, totalTracksHeight, isPanningActive, lang });
  livePropsRef.current = { headerWidth, measureWidth, totalMeasures, measureWidths, measureLeftPositions, rowLayouts, totalTracksHeight, isPanningActive, lang };

  const refreshViewportRect = useCallback(() => {
    const sEl = scrollRef.current; if (!sEl) return;
    const r = sEl.getBoundingClientRect();
    scrollViewportRectRef.current = { left: r.left, top: r.top, width: r.width, height: r.height };
  }, [scrollRef]);

  const paintCanvas = useCallback((overrideMeasureW?: number, overrideScrollLeft?: number) => {
    const canvas = canvasRef.current, ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const p = livePropsRef.current, scrollLeft = overrideScrollLeft !== undefined ? overrideScrollLeft : scrollStateRef.current.scrollLeft;
    const tracksScrollTop = Math.max(0, scrollStateRef.current.scrollTop - tracksOffsetTopRef.current);
    const canvasW = Math.max(1, Math.round(viewportDimRef.current.clientW - p.headerWidth));
    const canvasH = Math.max(1, Math.round(Math.min(p.totalTracksHeight, viewportDimRef.current.clientH)));
    const dpr = typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 2) : 1;
    const physW = Math.round(canvasW * dpr), physH = Math.round(canvasH * dpr);

    if (backingStoreRef.current.physW !== physW || backingStoreRef.current.physH !== physH) {
      canvas.width = physW; canvas.height = physH;
      canvas.style.width = `${canvasW}px`; canvas.style.height = `${canvasH}px`;
      backingStoreRef.current = { physW, physH, cssW: canvasW, cssH: canvasH };
    }

    const st = useSequencerStore.getState(), isLeftHanded = Boolean(st.isLeftHanded);
    const liveMeasureW = overrideMeasureW ?? (livePlayheadZoomState.isZooming && livePlayheadZoomState.liveMeasureW > 0 ? livePlayheadZoomState.liveMeasureW : p.measureWidth);

    renderTimelineTracksCanvas({
      ctx, canvasW, canvasH, dpr, scrollLeft, tracksScrollTop, baseMeasureW: p.measureWidth, liveMeasureW,
      totalMeasures: p.totalMeasures, measureWidths: p.measureWidths, measureLeftPositions: p.measureLeftPositions,
      rowLayouts: p.rowLayouts, tracks: st.tracks, tracksMeta: selectTracksMeta(st),
      timeSig: st.timeSig || '4/4', measureTimeSigs: st.measureTimeSigs, songSections: st.songSections,
      loopStartMeasure: st.loopStartMeasure, loopEndMeasure: st.loopEndMeasure, isLoopRegionActive: st.isLoopRegionActive,
      selectedTimelineCells: st.selectedTimelineCells, activeTimelineCell: st.activeTimelineCell,
      lassoRect: interactions.lassoRectRef.current, isLeftHanded, isEcoMode: st.isEcoMode, isPanningActive: p.isPanningActive, lang: p.lang,
      focusCtx: { focusTrackId: st.focusTrackId, referenceTrackId: st.referenceTrackId, activeAoVivoTrackId: st.activeAoVivoTrackId, editingTrackId: st.editingTrackId },
    });
  }, []);

  const requestCanvasRepaint = useCallback(() => {
    if (rafIdRef.current !== null) return;
    rafIdRef.current = requestAnimationFrame(() => { rafIdRef.current = null; paintCanvas(); });
  }, [paintCanvas]);

  const getAnalyticalCanvasRect = useCallback(() => {
    if (!scrollViewportRectRef.current) refreshViewportRect();
    const vr = scrollViewportRectRef.current; if (!vr) return null;
    const p = livePropsRef.current, bs = backingStoreRef.current;
    return {
      left: vr.left + p.headerWidth, top: vr.top + Math.max(0, tracksOffsetTopRef.current - scrollStateRef.current.scrollTop),
      width: bs.cssW || Math.max(1, vr.width - p.headerWidth), height: bs.cssH || Math.max(1, Math.min(p.totalTracksHeight, vr.height)),
    };
  }, [refreshViewportRect]);

  const interactions = useTimelineCanvasInteractions({
    canvasRef, isPanningActive, headerOffsetX: 0, baseMeasureW: measureWidth,
    getLiveMeasureW: () => (livePlayheadZoomState.isZooming && livePlayheadZoomState.liveMeasureW > 0 ? livePlayheadZoomState.liveMeasureW : livePropsRef.current.measureWidth),
    totalMeasures, measureWidths, measureLeftPositions, rowLayouts,
    getScrollState: () => ({ scrollLeft: scrollStateRef.current.scrollLeft, tracksScrollTop: Math.max(0, scrollStateRef.current.scrollTop - tracksOffsetTopRef.current) }),
    getAnalyticalCanvasRect, onRefreshViewportRect: refreshViewportRect,
    scrollByDelta: (dx, dy) => { if (scrollRef.current) { if (dx) scrollRef.current.scrollLeft += dx; if (dy) scrollRef.current.scrollTop += dy; } },
    onRequestRepaint: requestCanvasRepaint, onOpenPatternPicker, onClearHeaderSelection,
  });

  useEffect(() => {
    const sEl = scrollRef.current, gEl = gridRef.current, tEl = tracksAreaRef.current;
    if (!sEl) return;
    viewportDimRef.current = { clientW: sEl.clientWidth, clientH: sEl.clientHeight };
    scrollStateRef.current = { scrollLeft: sEl.scrollLeft, scrollTop: sEl.scrollTop };
    if (tEl) tracksOffsetTopRef.current = tEl.offsetTop;
    refreshViewportRect(); paintCanvas();

    const onScroll = () => { scrollStateRef.current.scrollLeft = sEl.scrollLeft; scrollStateRef.current.scrollTop = sEl.scrollTop; paintCanvas(); };
    sEl.addEventListener('scroll', onScroll, { passive: true });
    const unsubZoom = registerTimelineCanvasZoomListener((w, sl) => { scrollStateRef.current.scrollLeft = sl; paintCanvas(w, sl); });
    const unsubStore = useSequencerStore.subscribe(() => requestCanvasRepaint());
    const unsubSettings = useSequencerSettingsStore.subscribe(() => requestCanvasRepaint());
    const roScroll = typeof ResizeObserver !== 'undefined' ? new ResizeObserver((entries) => {
      const cr = entries[0]?.contentRect;
      if (cr && cr.width > 0 && cr.height > 0) { viewportDimRef.current = { clientW: cr.width, clientH: cr.height }; refreshViewportRect(); paintCanvas(); }
    }) : null;
    roScroll?.observe(sEl);
    const roGrid = typeof ResizeObserver !== 'undefined' && gEl ? new ResizeObserver((entries) => {
      const h = entries[0]?.contentRect.height ?? 0;
      if (Math.abs(h - lastGridHRef.current) >= 0.5) { lastGridHRef.current = h; if (tracksAreaRef.current) tracksOffsetTopRef.current = tracksAreaRef.current.offsetTop; requestCanvasRepaint(); }
    }) : null;
    if (gEl) roGrid?.observe(gEl);
    const mo = typeof MutationObserver !== 'undefined' ? new MutationObserver(() => { invalidateTimelineCanvasTheme(); requestCanvasRepaint(); }) : null;
    if (typeof document !== 'undefined') { mo?.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'data-theme', 'style'] }); mo?.observe(document.body, { attributes: true, attributeFilter: ['class', 'data-theme', 'style'] }); }

    return () => {
      sEl.removeEventListener('scroll', onScroll); unsubZoom(); unsubStore(); unsubSettings();
      roScroll?.disconnect(); roGrid?.disconnect(); mo?.disconnect();
      if (rafIdRef.current !== null) cancelAnimationFrame(rafIdRef.current);
    };
  }, [scrollRef, gridRef, tracksAreaRef, paintCanvas, refreshViewportRect, requestCanvasRepaint]);

  useEffect(() => { paintCanvas(); }, [measureWidth, totalMeasures, measureWidths, measureLeftPositions, rowLayouts, totalTracksHeight, isPanningActive, lang, paintCanvas]);

  return (
    <div className="sticky top-0 z-0 pointer-events-none" style={{ left: `${headerWidth}px`, width: 0, height: 0, overflow: 'visible' }}>
      <canvas ref={canvasRef} className="block pointer-events-auto" style={{ position: 'absolute', top: 0, left: 0 }} onPointerEnter={interactions.onPointerEnter} onPointerDown={interactions.onPointerDown} onPointerMove={interactions.onPointerMove} onPointerUp={interactions.onPointerUp} onPointerCancel={interactions.onPointerCancel} onPointerLeave={interactions.onPointerLeave} onClick={interactions.onClick} onDoubleClick={interactions.onDoubleClick} onContextMenu={interactions.onContextMenu} />
    </div>
  );
});
