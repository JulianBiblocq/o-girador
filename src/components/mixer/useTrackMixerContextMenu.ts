import { useState, useRef } from 'react';

export function useTrackMixerContextMenu() {
  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number } | null>(null);
  const contextLongPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const contextTouchStartPosRef = useRef<{ x: number; y: number } | null>(null);

  const handleContextMenuOpen = (clientX: number, clientY: number) => {
    setContextMenuPos({ x: clientX, y: clientY });
  };

  const handleContextMenuClose = () => {
    setContextMenuPos(null);
  };

  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      contextTouchStartPosRef.current = { x: touch.clientX, y: touch.clientY };
      contextLongPressTimerRef.current = setTimeout(() => {
        handleContextMenuOpen(touch.clientX, touch.clientY);
        contextLongPressTimerRef.current = null;
      }, 400);
    }
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (contextLongPressTimerRef.current && contextTouchStartPosRef.current && e.touches.length === 1) {
      const touch = e.touches[0];
      const dx = Math.abs(touch.clientX - contextTouchStartPosRef.current.x);
      const dy = Math.abs(touch.clientY - contextTouchStartPosRef.current.y);
      if (dx > 10 || dy > 10) {
        clearTimeout(contextLongPressTimerRef.current);
        contextLongPressTimerRef.current = null;
      }
    }
  };

  const onTouchEnd = () => {
    if (contextLongPressTimerRef.current) {
      clearTimeout(contextLongPressTimerRef.current);
      contextLongPressTimerRef.current = null;
    }
    contextTouchStartPosRef.current = null;
  };

  const onTouchCancel = () => {
    if (contextLongPressTimerRef.current) {
      clearTimeout(contextLongPressTimerRef.current);
      contextLongPressTimerRef.current = null;
    }
    contextTouchStartPosRef.current = null;
  };

  return {
    contextMenuPos,
    handleContextMenuOpen,
    handleContextMenuClose,
    touchHandlers: {
      onTouchStart,
      onTouchMove,
      onTouchEnd,
      onTouchCancel,
    },
  };
}
