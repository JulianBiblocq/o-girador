import { useEffect } from 'react';

interface UseNonPassiveTouchFallbackOptions {
  containerRef: React.RefObject<HTMLElement | null>;
  isDraggingRef: React.MutableRefObject<boolean>;
  startDrag: (x: number, y: number) => void;
  updateDrag: (x: number, y: number) => void;
  stopDrag: (x: number, y: number) => void;
}

export function useNonPassiveTouchFallback({
  containerRef,
  isDraggingRef,
  startDrag,
  updateDrag,
  stopDrag,
}: UseNonPassiveTouchFallbackOptions) {
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        e.preventDefault();
        const touch = e.touches[0];
        startDrag(touch.clientX, touch.clientY);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (isDraggingRef.current && e.touches.length > 0) {
        e.preventDefault();
        const touch = e.touches[0];
        updateDrag(touch.clientX, touch.clientY);
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (isDraggingRef.current) {
        e.preventDefault();
        const touch = e.changedTouches[0] || e.touches[0];
        if (touch) {
          stopDrag(touch.clientX, touch.clientY);
        } else {
          isDraggingRef.current = false;
        }
      }
    };

    el.addEventListener('touchstart', handleTouchStart, { passive: false });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd, { passive: false });
    window.addEventListener('touchcancel', handleTouchEnd, { passive: false });

    return () => {
      el.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [containerRef, isDraggingRef, startDrag, updateDrag, stopDrag]);
}
