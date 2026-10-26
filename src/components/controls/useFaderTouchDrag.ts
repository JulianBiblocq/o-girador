import React, { useRef, useEffect } from 'react';
import { faderPositionToDbString } from '../../utils/audioMath';

interface UseFaderTouchDragProps {
  railRef: React.RefObject<HTMLDivElement | null>;
  calculateValueFromPointer: (clientY: number) => number;
  cacheRailRect: () => DOMRect | null;
  clearRailRect: () => void;
  visualThumbRef: React.MutableRefObject<HTMLDivElement | null>;
  valueTextRef: React.MutableRefObject<HTMLSpanElement | null>;
  updateAudioNode: (val: number) => void;
  onChange: (val: number) => void;
  resetToUnity: (e?: React.SyntheticEvent | Event) => void;
}

export function useFaderTouchDrag({
  railRef,
  calculateValueFromPointer,
  cacheRailRect,
  clearRailRect,
  visualThumbRef,
  valueTextRef,
  updateAudioNode,
  onChange,
  resetToUnity,
}: UseFaderTouchDragProps) {
  const isDraggingRef = useRef(false);
  const lastTouchTimeRef = useRef<number>(0);

  useEffect(() => {
    const el = railRef.current;
    if (!el) return;

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        const now = performance.now();
        if (now - lastTouchTimeRef.current < 300) {
          e.preventDefault();
          lastTouchTimeRef.current = 0;
          clearRailRect();
          resetToUnity(e);
          return;
        }
        lastTouchTimeRef.current = now;
        e.preventDefault();
        isDraggingRef.current = true;
        cacheRailRect();
        const val = calculateValueFromPointer(e.touches[0].clientY);
        if (visualThumbRef.current) visualThumbRef.current.style.bottom = `${val}%`;
        if (valueTextRef.current) valueTextRef.current.textContent = faderPositionToDbString(val);
        updateAudioNode(val);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (isDraggingRef.current && e.touches.length > 0) {
        e.preventDefault();
        const val = calculateValueFromPointer(e.touches[0].clientY);
        if (visualThumbRef.current) visualThumbRef.current.style.bottom = `${val}%`;
        if (valueTextRef.current) valueTextRef.current.textContent = faderPositionToDbString(val);
        updateAudioNode(val);
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (isDraggingRef.current) {
        e.preventDefault();
        isDraggingRef.current = false;
        const touch = e.changedTouches[0] || e.touches[0];
        if (touch) {
          const val = calculateValueFromPointer(touch.clientY);
          updateAudioNode(val);
          onChange(val);
        }
        clearRailRect();
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
  }, [calculateValueFromPointer, cacheRailRect, clearRailRect, resetToUnity, onChange, updateAudioNode, visualThumbRef, valueTextRef, railRef]);
}
