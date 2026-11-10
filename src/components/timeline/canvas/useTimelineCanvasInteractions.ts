import React, { useCallback, useEffect, useRef } from 'react';
import { useAudioStore } from '../../../stores/useAudioStore';
import { selectTracksMeta, useSequencerStore } from '../../../stores/useSequencerStore';
import { resolveTimelineCanvasHit } from './timelineCanvasHitTester';
import { TimelineHitResult, TimelineRowLayout } from './timelineCanvasTypes';
import { useTimelineCanvasLassoAndTouch } from './useTimelineCanvasLassoAndTouch';

export interface UseTimelineCanvasInteractionsParams {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  isPanningActive: boolean; headerOffsetX?: number; baseMeasureW: number;
  getLiveMeasureW: () => number; totalMeasures: number;
  measureWidths: number[]; measureLeftPositions: number[]; rowLayouts: TimelineRowLayout[];
  getScrollState: () => { scrollLeft: number; tracksScrollTop: number };
  getAnalyticalCanvasRect?: () => { left: number; top: number; width: number; height: number } | null;
  onRefreshViewportRect?: () => void;
  scrollByDelta?: (dx: number, dy: number) => void;
  onRequestRepaint: () => void;
  onOpenPatternPicker?: (trackId: number, measureIdx: number, rect: DOMRect) => void;
  onClearHeaderSelection?: () => void;
}

export function useTimelineCanvasInteractions(params: UseTimelineCanvasInteractionsParams) {
  const cachedRectRef = useRef<{ left: number; top: number; width: number; height: number } | null>(null);

  const refreshContainerRect = useCallback(() => {
    params.onRefreshViewportRect?.();
    if (params.getAnalyticalCanvasRect) {
      const r = params.getAnalyticalCanvasRect();
      if (r) { cachedRectRef.current = r; return r; }
    }
    const el = params.canvasRef.current; if (!el) return null;
    const r = el.getBoundingClientRect();
    cachedRectRef.current = { left: r.left, top: r.top, width: r.width, height: r.height };
    return cachedRectRef.current;
  }, [params]);

  const getCurrentRect = useCallback(
    () => (params.getAnalyticalCanvasRect ? params.getAnalyticalCanvasRect() : null) || cachedRectRef.current || refreshContainerRect(),
    [params, refreshContainerRect]
  );

  useEffect(() => {
    const el = params.canvasRef.current;
    if (!el || typeof ResizeObserver === 'undefined' || params.getAnalyticalCanvasRect) return;
    const ro = new ResizeObserver(() => { refreshContainerRect(); });
    ro.observe(el); return () => ro.disconnect();
  }, [params.canvasRef, params.getAnalyticalCanvasRect, refreshContainerRect]);

  const lasso = useTimelineCanvasLassoAndTouch({ ...params, getContainerRect: getCurrentRect });

  const hitAt = (clientX: number, clientY: number): TimelineHitResult | null => {
    const rect = getCurrentRect(); if (!rect) return null;
    const st = useSequencerStore.getState(), { scrollLeft, tracksScrollTop } = params.getScrollState();
    return resolveTimelineCanvasHit({
      clientX, clientY, cachedContainerRect: rect, headerOffsetX: params.headerOffsetX,
      scrollLeft, tracksScrollTop, baseMeasureW: params.baseMeasureW, liveMeasureW: params.getLiveMeasureW(),
      totalMeasures: params.totalMeasures, measureWidths: params.measureWidths, measureLeftPositions: params.measureLeftPositions,
      rowLayouts: params.rowLayouts, tracks: st.tracks, tracksMeta: selectTracksMeta(st),
      timeSig: st.timeSig || '4/4', measureTimeSigs: st.measureTimeSigs, lang: st.lang || 'fr',
    });
  };

  const onPointerEnter = () => { refreshContainerRect(); };
  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    (document.activeElement as HTMLElement)?.blur?.();
    refreshContainerRect(); lasso.suppressNextClickRef.current = false;
    if (params.isPanningActive || e.button === 1 || e.button === 2) return;
    const hit = hitAt(e.clientX, e.clientY); if (!hit) return;
    params.onClearHeaderSelection?.();
    if (e.pointerType === 'touch') { lasso.startTouchPointer(e, hit); return; }
    if (e.button === 0 && hit.zone === 'cell') {
      const s = useSequencerStore.getState();
      if (!e.ctrlKey && !e.metaKey && !e.shiftKey && !s.isMultiSelectMode) s.setActiveTimelineCell({ trackId: hit.trackId, measureIdx: hit.measureIdx });
      lasso.startLassoPointer(e, hit);
    }
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.pointerType === 'touch') {
      const cand = lasso.touchCandRef.current;
      if (cand && cand.pointerId === e.pointerId && Math.hypot(e.clientX - cand.startX, e.clientY - cand.startY) > 8) {
        cand.moved = true; if (lasso.longPressTimerRef.current) { clearTimeout(lasso.longPressTimerRef.current); lasso.longPressTimerRef.current = null; }
      }
      return;
    }
    if (lasso.moveLassoPointer(e) || params.isPanningActive || typeof window === 'undefined') return;
    const hit = hitAt(e.clientX, e.clientY), el = params.canvasRef.current;
    if (el) el.style.cursor = hit && (hit.zone === 'pattern-badge' || hit.zone === 'variation-toggle') ? 'pointer' : 'default';
    (window as any).activeHoveredStep = params.getLiveMeasureW() >= 140 && hit && !hit.isToada && hit.patternId !== -1
      ? { trackId: hit.trackId, patternId: hit.patternId, stepIdx: hit.actualStepIdx, allowedStrokes: hit.allowedStrokes }
      : null;
  };

  const onPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => { if (e.pointerType === 'touch') lasso.finishTouchPointer(e); else lasso.endLassoPointer(e); };
  const onPointerCancel = (e: React.PointerEvent<HTMLCanvasElement>) => {
    lasso.touchPointersRef.current.delete(e.pointerId); lasso.touchCandRef.current = null; lasso.clearTimers(); lasso.endLassoPointer(e);
  };
  const onPointerLeave = () => { if (typeof window !== 'undefined') (window as any).activeHoveredStep = null; };

  const onClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (params.isPanningActive) return;
    if (lasso.suppressNextClickRef.current) { lasso.suppressNextClickRef.current = false; return; }
    const hit = hitAt(e.clientX, e.clientY); if (!hit) return;
    params.onClearHeaderSelection?.();
    const s = useSequencerStore.getState();
    if (hit.zone === 'variation-toggle' && hit.patternId !== -1) {
      s.handleTimelinePatternVariationToggle(hit.trackId, hit.patternId, hit.measureIdx, !hit.measureAllowVariations); return;
    }
    if (hit.zone === 'pattern-badge') {
      if (!hit.isToada) { s.setActiveTimelineCell({ trackId: hit.trackId, measureIdx: hit.measureIdx }); params.onOpenPatternPicker?.(hit.trackId, hit.measureIdx, hit.anchorRect); }
      return;
    }
    if (e.shiftKey) s.selectTimelineCell(hit.trackId, hit.measureIdx, 'range');
    else if (e.ctrlKey || e.metaKey || s.isMultiSelectMode) s.selectTimelineCell(hit.trackId, hit.measureIdx, 'toggle');
    else { s.selectTimelineCell(hit.trackId, hit.measureIdx, 'single'); s.clearAutomationSelection(); }
    if (!s.isPlaying) {
      s.setCurrentMeasure(hit.measureIdx);
      if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('o-girador-timeline-nav', { detail: { mIdx: hit.measureIdx, sIdx: 0 } }));
    } else if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('o-girador-timeline-nav', { detail: { mIdx: hit.measureIdx, sIdx: hit.stepIdx } }));
    }
    if ((hit.instType === 'voice' || hit.isToada) && hit.patternId !== -1) {
      useAudioStore.getState().setSelectedVocalPatternId(hit.patternId, hit.trackId);
      if (s.armedPatternId !== null) s.disarmAllPatterns();
    }
  };

  const onDoubleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    e.stopPropagation(); if (params.isPanningActive) return;
    const hit = hitAt(e.clientX, e.clientY);
    if (hit && !hit.isToada) params.onOpenPatternPicker?.(hit.trackId, hit.measureIdx, hit.anchorRect);
  };

  const onContextMenu = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const hit = hitAt(e.clientX, e.clientY); if (!hit) return;
    e.preventDefault(); e.stopPropagation();
    const s = useSequencerStore.getState();
    if (!s.selectedTimelineCells.some((c) => c.trackId === hit.trackId && c.mIdx === hit.measureIdx)) s.selectTimelineCell(hit.trackId, hit.measureIdx, 'single');
    s.openTimelineContextMenu({ x: e.clientX, y: e.clientY, trackId: hit.trackId, measureIdx: hit.measureIdx, patternId: hit.patternId !== -1 ? hit.patternId : null });
  };

  return { lassoRectRef: lasso.lassoRectRef, onPointerEnter, onPointerDown, onPointerMove, onPointerUp, onPointerCancel, onPointerLeave, onClick, onDoubleClick, onContextMenu };
}
