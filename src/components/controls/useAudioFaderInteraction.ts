import React, { useRef, useEffect } from 'react';
import { AudioFaderTarget, updateFaderLabelText, updateAudioFaderTarget } from './audioFaderSync';

interface UseAudioFaderInteractionProps {
  value: number;
  numMin: number;
  numMax: number;
  numStep: number;
  audioTarget?: AudioFaderTarget;
  trackId?: number;
  onChange: (val: number) => void;
}

export function useAudioFaderInteraction({
  value,
  numMin,
  numMax,
  numStep,
  audioTarget,
  trackId,
  onChange,
}: UseAudioFaderInteractionProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const visualThumbRef = useRef<HTMLDivElement>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const isDraggingRef = useRef(false);
  const rectRef = useRef<DOMRect | null>(null);
  const lastAudioUpdateTimeRef = useRef(0);
  const THROTTLE_MS = 25;

  const getPercentage = (val: number) => {
    if (numMax === numMin) return 0;
    return ((val - numMin) / (numMax - numMin)) * 100;
  };

  const updateVisualAndAudio = (val: number, force = false) => {
    const pct = getPercentage(val);
    if (visualThumbRef.current) visualThumbRef.current.style.left = `${pct}%`;
    updateFaderLabelText(val, audioTarget, containerRef.current);
    const now = performance.now();
    if (force || now - lastAudioUpdateTimeRef.current >= THROTTLE_MS) {
      lastAudioUpdateTimeRef.current = now;
      updateAudioFaderTarget(val, audioTarget, trackId);
    }
  };

  const calculateValueFromPointer = (clientX: number) => {
    const rect = rectRef.current;
    if (!rect) return value;
    const relativeX = clientX - rect.left;
    let ratio = Math.min(1, Math.max(0, relativeX / rect.width));
    let val = numMin + ratio * (numMax - numMin);
    const steps = Math.round((val - numMin) / numStep);
    return Math.min(numMax, Math.max(numMin, numMin + steps * numStep));
  };

  useEffect(() => {
    if (!isDraggingRef.current) updateVisualAndAudio(value, true);
  }, [value, audioTarget, trackId]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        e.preventDefault();
        isDraggingRef.current = true;
        rectRef.current = el.getBoundingClientRect();
        updateVisualAndAudio(calculateValueFromPointer(e.touches[0].clientX), true);
      }
    };
    const handleTouchMove = (e: TouchEvent) => {
      if (isDraggingRef.current && e.touches.length > 0) {
        e.preventDefault();
        updateVisualAndAudio(calculateValueFromPointer(e.touches[0].clientX), false);
      }
    };
    const handleTouchEnd = (e: TouchEvent) => {
      if (isDraggingRef.current) {
        e.preventDefault();
        isDraggingRef.current = false;
        const touch = e.changedTouches[0] || e.touches[0];
        if (touch) {
          const val = calculateValueFromPointer(touch.clientX);
          updateVisualAndAudio(val, true);
          onChangeRef.current(val);
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
  }, [numMin, numMax, numStep]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    isDraggingRef.current = true;
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch (_) {}
    if (containerRef.current) rectRef.current = containerRef.current.getBoundingClientRect();
    updateVisualAndAudio(calculateValueFromPointer(e.clientX), true);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    e.preventDefault();
    updateVisualAndAudio(calculateValueFromPointer(e.clientX), false);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch (_) {}
    const val = calculateValueFromPointer(e.clientX);
    updateVisualAndAudio(val, true);
    onChange(val);
  };

  return {
    containerRef,
    visualThumbRef,
    getPercentage,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
  };
}
