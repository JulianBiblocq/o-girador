import React, { useEffect } from 'react';

interface UseMixerKnobTouchDragProps {
  knobContainerRef: React.RefObject<HTMLDivElement | null>;
  isDraggingRef: React.MutableRefObject<boolean>;
  startYRef: React.MutableRefObject<number>;
  startValueRef: React.MutableRefObject<number>;
  lastTapTimeRef: React.MutableRefObject<number>;
  min: number;
  max: number;
  value: number;
  quantize: (rawVal: number) => number;
  updateVisuals: (val: number) => void;
  resetToDefault: () => void;
  onAudioDragRef: React.MutableRefObject<((val: number) => void) | undefined>;
  onChangeRef: React.MutableRefObject<(val: number) => void>;
  inputRef: React.RefObject<HTMLInputElement | null>;
}

export function useMixerKnobTouchDrag({
  knobContainerRef,
  isDraggingRef,
  startYRef,
  startValueRef,
  lastTapTimeRef,
  min,
  max,
  value,
  quantize,
  updateVisuals,
  resetToDefault,
  onAudioDragRef,
  onChangeRef,
  inputRef,
}: UseMixerKnobTouchDragProps) {
  useEffect(() => {
    const el = knobContainerRef.current;
    if (!el) return;

    const handleTouchStart = (e: TouchEvent) => {
      const now = performance.now();
      if (now - lastTapTimeRef.current < 300) {
        e.preventDefault();
        lastTapTimeRef.current = 0;
        resetToDefault();
        return;
      }
      lastTapTimeRef.current = now;
      if (e.touches.length > 0) {
        e.preventDefault();
        isDraggingRef.current = true;
        startYRef.current = e.touches[0].clientY;
        startValueRef.current = value;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (isDraggingRef.current && e.touches.length > 0) {
        e.preventDefault();
        const diffY = startYRef.current - e.touches[0].clientY;
        const rawVal = startValueRef.current + (diffY / 150) * (max - min);
        const val = quantize(rawVal);
        updateVisuals(val);
        if (onAudioDragRef.current) onAudioDragRef.current(val);
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (isDraggingRef.current) {
        e.preventDefault();
        isDraggingRef.current = false;
        const rawVal = parseFloat(inputRef.current?.value || String(value));
        const val = quantize(rawVal);
        React.startTransition(() => {
          onChangeRef.current(val);
        });
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
  }, [min, max, value, quantize, updateVisuals, resetToDefault, inputRef]);
}
