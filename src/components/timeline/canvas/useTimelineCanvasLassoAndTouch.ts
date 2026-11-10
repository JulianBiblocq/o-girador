import React, { useEffect, useRef } from 'react';
import { useSequencerStore } from '../../../stores/useSequencerStore';
import { computeLassoSelectedCells } from './timelineCanvasHitTester';
import { TimelineHitResult, TimelineLassoRect, TimelineRowLayout } from './timelineCanvasTypes';

export interface UseTimelineCanvasLassoParams {
  isPanningActive: boolean; headerOffsetX?: number; baseMeasureW: number;
  getLiveMeasureW: () => number; totalMeasures: number;
  measureWidths: number[]; measureLeftPositions: number[]; rowLayouts: TimelineRowLayout[];
  getContainerRect: () => { left: number; top: number; width: number; height: number } | null;
  getScrollState: () => { scrollLeft: number; tracksScrollTop: number };
  scrollByDelta?: (dx: number, dy: number) => void; onRequestRepaint: () => void;
  onOpenPatternPicker?: (trackId: number, measureIdx: number, rect: DOMRect) => void;
}

export function useTimelineCanvasLassoAndTouch(params: UseTimelineCanvasLassoParams) {
  const lassoRectRef = useRef<TimelineLassoRect | null>(null);
  const lassoStateRef = useRef<{
    pointerId: number; startClientX: number; startClientY: number; curClientX: number; curClientY: number;
    startWorldX: number; startWorldY: number; additive: boolean;
    initialCells: Array<{ trackId: number; mIdx: number }>; isEngaged: boolean; lastSig: string;
  } | null>(null);
  const autoScrollRafRef = useRef<number | null>(null);
  const touchPointersRef = useRef<Set<number>>(new Set());
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchCandRef = useRef<{ pointerId: number; startX: number; startY: number; hit: TimelineHitResult; moved: boolean } | null>(null);
  const lastTapRef = useRef<{ time: number; x: number; y: number; trackId: number; measureIdx: number } | null>(null);
  const suppressNextClickRef = useRef(false);
  const clearTimers = () => {
    if (longPressTimerRef.current) { clearTimeout(longPressTimerRef.current); longPressTimerRef.current = null; }
    if (autoScrollRafRef.current !== null) { cancelAnimationFrame(autoScrollRafRef.current); autoScrollRafRef.current = null; }
  };
  useEffect(() => clearTimers, []);

  const updateLassoSelection = (clientX: number, clientY: number) => {
    const st = lassoStateRef.current, rect = params.getContainerRect();
    if (!st || !rect) return;
    const { scrollLeft, tracksScrollTop } = params.getScrollState();
    const curCanvasX = Math.max(0, Math.min(rect.width, clientX - rect.left - (params.headerOffsetX || 0)));
    const curCanvasY = Math.max(0, Math.min(rect.height, clientY - rect.top));
    const startCanvasX = Math.max(0, Math.min(rect.width, st.startWorldX - scrollLeft));
    const startCanvasY = Math.max(0, Math.min(rect.height, st.startWorldY - tracksScrollTop));
    lassoRectRef.current = { x: Math.min(startCanvasX, curCanvasX), y: Math.min(startCanvasY, curCanvasY), width: Math.abs(curCanvasX - startCanvasX), height: Math.abs(curCanvasY - startCanvasY) };
    const cells = computeLassoSelectedCells({
      worldStartX: st.startWorldX, worldStartY: st.startWorldY, worldEndX: curCanvasX + scrollLeft, worldEndY: curCanvasY + tracksScrollTop,
      rowLayouts: params.rowLayouts, measureLeftPositions: params.measureLeftPositions, measureWidths: params.measureWidths,
      baseMeasureW: params.baseMeasureW, liveMeasureW: params.getLiveMeasureW(), totalMeasures: params.totalMeasures,
      additive: st.additive, initialCells: st.initialCells,
    });
    const sig = cells.map((c) => `${c.trackId}:${c.mIdx}`).join(',');
    if (sig !== st.lastSig) { st.lastSig = sig; useSequencerStore.setState({ selectedTimelineCells: cells }); }
    params.onRequestRepaint();
  };

  const startTouchPointer = (e: React.PointerEvent<HTMLCanvasElement>, hit: TimelineHitResult) => {
    touchPointersRef.current.add(e.pointerId);
    if (touchPointersRef.current.size > 1) { clearTimers(); touchCandRef.current = null; return; }
    touchCandRef.current = { pointerId: e.pointerId, startX: e.clientX, startY: e.clientY, hit, moved: false };
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    const cx = e.clientX, cy = e.clientY;
    longPressTimerRef.current = setTimeout(() => {
      if (!touchCandRef.current || touchCandRef.current.moved || touchPointersRef.current.size !== 1) return;
      suppressNextClickRef.current = true;
      const s = useSequencerStore.getState();
      s.setActiveTimelineCell({ trackId: hit.trackId, measureIdx: hit.measureIdx });
      if (!s.selectedTimelineCells.some((c) => c.trackId === hit.trackId && c.mIdx === hit.measureIdx)) s.selectTimelineCell(hit.trackId, hit.measureIdx, 'single');
      s.openTimelineContextMenu({ x: cx, y: cy, trackId: hit.trackId, measureIdx: hit.measureIdx, patternId: hit.patternId !== -1 ? hit.patternId : null });
    }, 400);
  };

  const finishTouchPointer = (e: React.PointerEvent<HTMLCanvasElement>) => {
    touchPointersRef.current.delete(e.pointerId);
    if (longPressTimerRef.current) { clearTimeout(longPressTimerRef.current); longPressTimerRef.current = null; }
    const cand = touchCandRef.current; touchCandRef.current = null;
    if (!cand || cand.moved || suppressNextClickRef.current) return;
    const { hit } = cand;
    if (hit.zone === 'variation-toggle' && hit.patternId !== -1) {
      suppressNextClickRef.current = true;
      useSequencerStore.getState().handleTimelinePatternVariationToggle(hit.trackId, hit.patternId, hit.measureIdx, !hit.measureAllowVariations);
    } else if (hit.zone === 'pattern-badge') {
      suppressNextClickRef.current = true; if (!hit.isToada) params.onOpenPatternPicker?.(hit.trackId, hit.measureIdx, hit.anchorRect);
    } else {
      const now = Date.now(), prev = lastTapRef.current;
      if (prev && now - prev.time < 280 && Math.hypot(e.clientX - prev.x, e.clientY - prev.y) < 24 && prev.trackId === hit.trackId && prev.measureIdx === hit.measureIdx) {
        lastTapRef.current = null; suppressNextClickRef.current = true;
        if (!hit.isToada) params.onOpenPatternPicker?.(hit.trackId, hit.measureIdx, hit.anchorRect);
      } else lastTapRef.current = { time: now, x: e.clientX, y: e.clientY, trackId: hit.trackId, measureIdx: hit.measureIdx };
    }
  };

  const startLassoPointer = (e: React.PointerEvent<HTMLCanvasElement>, hit: TimelineHitResult | null) => {
    if (params.isPanningActive || e.button !== 0 || e.pointerType !== 'mouse' || !hit || hit.zone !== 'cell') return;
    const rect = params.getContainerRect(); if (!rect) return;
    const { scrollLeft, tracksScrollTop } = params.getScrollState();
    lassoStateRef.current = {
      pointerId: e.pointerId, startClientX: e.clientX, startClientY: e.clientY, curClientX: e.clientX, curClientY: e.clientY,
      startWorldX: e.clientX - rect.left - (params.headerOffsetX || 0) + scrollLeft, startWorldY: e.clientY - rect.top + tracksScrollTop,
      additive: Boolean(e.ctrlKey || e.metaKey), initialCells: [...useSequencerStore.getState().selectedTimelineCells], isEngaged: false, lastSig: '',
    };
    try { e.currentTarget.setPointerCapture?.(e.pointerId); } catch {}
  };

  const moveLassoPointer = (e: React.PointerEvent<HTMLCanvasElement>): boolean => {
    const st = lassoStateRef.current; if (!st || st.pointerId !== e.pointerId) return false;
    st.curClientX = e.clientX; st.curClientY = e.clientY;
    if (!st.isEngaged) { if (Math.hypot(e.clientX - st.startClientX, e.clientY - st.startClientY) <= 5) return false; st.isEngaged = true; }
    updateLassoSelection(e.clientX, e.clientY);
    const rect = params.getContainerRect();
    if (rect && params.scrollByDelta) {
      const lx = e.clientX - rect.left - (params.headerOffsetX || 0), ly = e.clientY - rect.top;
      const dx = lx < 30 ? -8 : lx > rect.width - 30 ? 8 : 0, dy = ly < 30 ? -8 : ly > rect.height - 30 ? 8 : 0;
      if ((dx !== 0 || dy !== 0) && autoScrollRafRef.current === null) {
        const stepScroll = () => {
          if (!lassoStateRef.current?.isEngaged) { autoScrollRafRef.current = null; return; }
          params.scrollByDelta?.(dx, dy); updateLassoSelection(lassoStateRef.current.curClientX, lassoStateRef.current.curClientY);
          autoScrollRafRef.current = requestAnimationFrame(stepScroll);
        };
        autoScrollRafRef.current = requestAnimationFrame(stepScroll);
      } else if (dx === 0 && dy === 0 && autoScrollRafRef.current !== null) { cancelAnimationFrame(autoScrollRafRef.current); autoScrollRafRef.current = null; }
    }
    return true;
  };

  const endLassoPointer = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const st = lassoStateRef.current;
    if (!st || st.pointerId !== e.pointerId) return;
    if (st.isEngaged) suppressNextClickRef.current = true;
    lassoStateRef.current = null; lassoRectRef.current = null;
    if (autoScrollRafRef.current !== null) { cancelAnimationFrame(autoScrollRafRef.current); autoScrollRafRef.current = null; }
    try { e.currentTarget.releasePointerCapture?.(e.pointerId); } catch {}
    params.onRequestRepaint();
  };
  return { lassoRectRef, touchPointersRef, longPressTimerRef, touchCandRef, suppressNextClickRef, clearTimers, startTouchPointer, finishTouchPointer, startLassoPointer, moveLassoPointer, endLassoPointer };
}
