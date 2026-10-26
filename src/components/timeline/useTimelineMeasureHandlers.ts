import React, { useRef, useEffect } from 'react';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { useAudioStore } from '../../stores/useAudioStore';

export interface UseTimelineMeasureHandlersProps {
  trackId: number; mIdx: number; steps: number; patternId: number; instType: string;
  isToada?: boolean; isPanningActive: boolean;
  onMeasureClick: (mIdx: number, steps: number, clickX: number) => void;
  onOpenPatternPicker?: (trackId: number, measureIdx: number, rect: DOMRect) => void;
}

export function useTimelineMeasureHandlers({
  trackId, mIdx, steps, patternId, instType, isToada, isPanningActive, onMeasureClick, onOpenPatternPicker,
}: UseTimelineMeasureHandlersProps) {
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStartPosRef = useRef<{ x: number; y: number } | null>(null);
  const isLongPressTriggeredRef = useRef(false);
  const lastTouchEndTimeRef = useRef<number>(0);

  useEffect(() => () => { if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current); }, []);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    (document.activeElement as HTMLElement)?.blur();
    if (e.button === 0 && !isPanningActive) {
      if (!e.ctrlKey && !e.metaKey && !e.shiftKey && !useSequencerStore.getState().isMultiSelectMode) {
        useSequencerStore.getState().setActiveTimelineCell({ trackId, measureIdx: mIdx });
      }
    }
  };

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    (document.activeElement as HTMLElement)?.blur();
    if (isPanningActive) return;
    if (isLongPressTriggeredRef.current) { isLongPressTriggeredRef.current = false; return; }
    const isMulti = useSequencerStore.getState().isMultiSelectMode;
    if (e.shiftKey) useSequencerStore.getState().selectTimelineCell(trackId, mIdx, 'range');
    else if (e.ctrlKey || e.metaKey || isMulti) useSequencerStore.getState().selectTimelineCell(trackId, mIdx, 'toggle');
    else { useSequencerStore.getState().selectTimelineCell(trackId, mIdx, 'single'); useSequencerStore.getState().clearAutomationSelection(); }
    const rect = e.currentTarget.getBoundingClientRect();
    onMeasureClick(mIdx, steps, e.clientX - rect.left);
    if ((instType === 'voice' || isToada) && patternId !== -1) {
      useAudioStore.getState().setSelectedVocalPatternId(patternId, trackId);
      if (useSequencerStore.getState().armedPatternId !== null) useSequencerStore.getState().disarmAllPatterns();
    }
  };

  const handleDoubleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (isPanningActive || isToada) return;
    onOpenPatternPicker?.(trackId, mIdx, e.currentTarget.getBoundingClientRect());
  };

  const handleContextMenu = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault(); e.stopPropagation();
    const s = useSequencerStore.getState();
    if (!s.selectedTimelineCells.some((c) => c.trackId === trackId && c.mIdx === mIdx)) s.selectTimelineCell(trackId, mIdx, 'single');
    s.openTimelineContextMenu({ x: e.clientX, y: e.clientY, trackId, measureIdx: mIdx, patternId: patternId !== -1 ? patternId : null });
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length !== 1) return;
    const t = e.touches[0];
    touchStartPosRef.current = { x: t.clientX, y: t.clientY };
    isLongPressTriggeredRef.current = false;
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = setTimeout(() => {
      isLongPressTriggeredRef.current = true;
      const s = useSequencerStore.getState();
      s.setActiveTimelineCell({ trackId, measureIdx: mIdx });
      s.openTimelineContextMenu({ x: t.clientX, y: t.clientY, trackId, measureIdx: mIdx, patternId: patternId !== -1 ? patternId : null });
    }, 400);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!touchStartPosRef.current || e.touches.length !== 1) return;
    if ((Math.abs(e.touches[0].clientX - touchStartPosRef.current.x) > 8 || Math.abs(e.touches[0].clientY - touchStartPosRef.current.y) > 8) && longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current); longPressTimerRef.current = null;
    }
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (longPressTimerRef.current) { clearTimeout(longPressTimerRef.current); longPressTimerRef.current = null; }
    if (isLongPressTriggeredRef.current) { isLongPressTriggeredRef.current = false; return; }
    const now = Date.now();
    if (now - lastTouchEndTimeRef.current < 300) {
      if (!isPanningActive && !isToada) onOpenPatternPicker?.(trackId, mIdx, e.currentTarget.getBoundingClientRect());
      lastTouchEndTimeRef.current = 0;
    } else lastTouchEndTimeRef.current = now;
  };

  const handleTouchCancel = () => {
    if (longPressTimerRef.current) { clearTimeout(longPressTimerRef.current); longPressTimerRef.current = null; }
  };

  return { handlePointerDown, handleClick, handleDoubleClick, handleContextMenu, handleTouchStart, handleTouchMove, handleTouchEnd, handleTouchCancel };
}
