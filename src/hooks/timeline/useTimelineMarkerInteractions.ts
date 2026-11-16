import React, { useState, useRef, useEffect } from 'react';
import { SongMarker } from '../../types';
import { findMeasureIndexAtX } from '../../utils/timeline/timelineMeasureWidths';

export interface UseTimelineMarkerInteractionsOptions {
  totalMeasures: number;
  measureWidth: number;
  measureWidths: number[];
  measureLeftPositions: number[];
  headerWidth: number;
  snapMode: 'measure' | 'beat' | 'none';
  setSnapGuideX: (x: number | null) => void;
  onUpdateMarker: (id: string, name: string, measure: number, color?: string, fallbackIdx?: number) => void;
  toolMode?: 'cursor' | 'hand';
  isSpacePressed?: boolean;
}

export function useTimelineMarkerInteractions({
  totalMeasures, measureWidth, measureWidths, measureLeftPositions, headerWidth,
  snapMode, setSnapGuideX, onUpdateMarker, toolMode = 'cursor', isSpacePressed = false,
}: UseTimelineMarkerInteractionsOptions) {
  const [markerModalOpen, setMarkerModalOpen] = useState(false);
  const [editingMarker, setEditingMarker] = useState<SongMarker | null>(null);
  const [editingMarkerIdx, setEditingMarkerIdx] = useState<number | undefined>(undefined);
  const [defaultMarkerMeasure, setDefaultMarkerMeasure] = useState(1);
  const dragAbortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => () => { dragAbortControllerRef.current?.abort(); }, []);

  const handleMarkerRulerDblClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('[data-marker]')) return;
    const clickX = e.clientX - e.currentTarget.getBoundingClientRect().left;
    const mIdx = Math.max(0, Math.min(totalMeasures - 1, findMeasureIndexAtX(clickX, measureLeftPositions, measureWidths)));
    setEditingMarker(null);
    setEditingMarkerIdx(undefined);
    setDefaultMarkerMeasure(mIdx + 1);
    setMarkerModalOpen(true);
  };

  const handleMarkerPointerDown = (e: React.PointerEvent<HTMLDivElement>, marker: SongMarker, markerIdx?: number) => {
    if ((e.target as HTMLElement).closest('[data-marker-delete]')) return;
    if (toolMode === 'hand' || isSpacePressed || e.button !== 0) return;
    const el = e.currentTarget;
    try { el.setPointerCapture(e.pointerId); } catch (_) {}
    el.setAttribute('data-has-moved', 'false');
    const startX = e.clientX;
    const startLeft = measureLeftPositions[marker.measure] ?? (marker.measure * measureWidth);

    const onMove = (moveEv: PointerEvent) => {
      const dx = moveEv.clientX - startX;
      if (Math.abs(dx) > 3) el.setAttribute('data-has-moved', 'true');
      const rawLeft = Math.max(0, startLeft + dx);
      const nearestM = Math.max(0, Math.min(totalMeasures - 1, findMeasureIndexAtX(rawLeft, measureLeftPositions, measureWidths)));
      const curLeft = snapMode === 'measure'
        ? (measureLeftPositions[nearestM] ?? nearestM * measureWidth)
        : rawLeft;
      el.style.left = `${curLeft}px`;
      setSnapGuideX(snapMode !== 'none' ? headerWidth + curLeft : null);
    };

    const onUp = () => {
      try { el.releasePointerCapture(e.pointerId); } catch (_) {}
      dragAbortControllerRef.current?.abort();
      setSnapGuideX(null);
      const moved = el.getAttribute('data-has-moved') === 'true';
      const finLeft = parseFloat(el.style.left);
      const finStart = Number.isFinite(finLeft)
        ? Math.max(0, Math.min(totalMeasures - 1, findMeasureIndexAtX(finLeft + 2, measureLeftPositions, measureWidths)))
        : marker.measure;
      if (moved && finStart !== marker.measure) {
        onUpdateMarker(marker.id, marker.name, finStart, marker.color, markerIdx);
      } else {
        el.style.left = `${startLeft}px`;
      }
    };

    dragAbortControllerRef.current?.abort();
    dragAbortControllerRef.current = new AbortController();
    const { signal } = dragAbortControllerRef.current;
    window.addEventListener('pointermove', onMove, { signal });
    window.addEventListener('pointerup', onUp, { signal });
    e.stopPropagation();
  };

  return {
    markerModalOpen, setMarkerModalOpen,
    editingMarker, setEditingMarker,
    editingMarkerIdx, setEditingMarkerIdx,
    defaultMarkerMeasure, setDefaultMarkerMeasure,
    handleMarkerRulerDblClick, handleMarkerPointerDown,
  };
}
