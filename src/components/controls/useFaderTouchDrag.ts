import React, { useRef, useEffect } from 'react';
import { faderPositionToDbString } from '../../utils/audioMath';

interface UseFaderTouchDragProps {
  trackAreaRef: React.RefObject<HTMLDivElement | null>;
  calculateValueFromPointer: (clientY: number) => number;
  getTopPosition: (val: number) => number;
  visualThumbRef: React.MutableRefObject<HTMLDivElement | null>;
  valueTextRef: React.MutableRefObject<HTMLSpanElement | null>;
  updateAudioNode: (val: number) => void;
  onChange: (val: number) => void;
  resetToUnity: (e?: React.SyntheticEvent | Event) => void;
  trackAreaHeight: number;
}

export function useFaderTouchDrag({
  trackAreaRef,
  calculateValueFromPointer,
  getTopPosition,
  visualThumbRef,
  valueTextRef,
  updateAudioNode,
  onChange,
  resetToUnity,
  trackAreaHeight,
}: UseFaderTouchDragProps) {
  const isDraggingRef = useRef(false);
  const rectRef = useRef<DOMRect | null>(null);
  const lastTouchTimeRef = useRef<number>(0);

  useEffect(() => {
    const el = trackAreaRef.current;
    if (!el) return;

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        const now = performance.now();
        if (now - lastTouchTimeRef.current < 300) {
          e.preventDefault();
          lastTouchTimeRef.current = 0;
          resetToUnity(e);
          return;
        }
        lastTouchTimeRef.current = now;
        e.preventDefault();
        isDraggingRef.current = true;
        rectRef.current = el.getBoundingClientRect();
        const val = calculateValueFromPointer(e.touches[0].clientY);
        const topPx = getTopPosition(val);
        if (visualThumbRef.current) visualThumbRef.current.style.top = `${topPx}px`;
        if (valueTextRef.current) valueTextRef.current.textContent = faderPositionToDbString(val);
        updateAudioNode(val);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (isDraggingRef.current && e.touches.length > 0) {
        e.preventDefault();
        const val = calculateValueFromPointer(e.touches[0].clientY);
        const topPx = getTopPosition(val);
        if (visualThumbRef.current) visualThumbRef.current.style.top = `${topPx}px`;
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
  }, [trackAreaHeight, calculateValueFromPointer, getTopPosition, resetToUnity, onChange, updateAudioNode, visualThumbRef, valueTextRef]);
}
