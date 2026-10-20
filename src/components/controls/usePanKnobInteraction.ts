import React, { useEffect, useRef, useCallback } from 'react';
import { usePanAudioAndMidi } from './usePanAudioAndMidi';

interface UsePanKnobInteractionProps {
  trackId?: number;
  value: number;
  defaultValue?: number;
  onChange: (val: number) => void;
  panKnobRef?: React.RefObject<SVGGElement | null>;
}

export function usePanKnobInteraction({
  trackId,
  value,
  defaultValue = 0,
  onChange,
  panKnobRef,
}: UsePanKnobInteractionProps) {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const isDraggingRef = useRef(false);
  const startYRef = useRef(0);
  const startXRef = useRef(0);
  const startValueRef = useRef(0);
  const lastTouchTimeRef = useRef<number>(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const rotationGroupRef = useRef<SVGGElement>(null);

  const setRotationRef = (el: SVGGElement | null) => {
    (rotationGroupRef as React.MutableRefObject<SVGGElement | null>).current = el;
    if (panKnobRef) {
      (panKnobRef as React.MutableRefObject<SVGGElement | null>).current = el;
    }
  };

  const updateVisuals = useCallback((val: number) => {
    if (rotationGroupRef.current) {
      rotationGroupRef.current.style.transform = '';
      const angle = val * 1.35;
      rotationGroupRef.current.setAttribute('transform', `rotate(${angle} 16 16)`);
    }
    if (inputRef.current) {
      inputRef.current.value = String(val);
      inputRef.current.title = `Pan: ${val === 0 ? 'Centro' : val > 0 ? 'D' + val : 'E' + Math.abs(val)}`;
    }
  }, []);

  const { updateAudio } = usePanAudioAndMidi(trackId, updateVisuals);

  useEffect(() => {
    if (!isDraggingRef.current) updateVisuals(value);
  }, [value, updateVisuals]);

  const resetToDefault = () => {
    const resetVal = defaultValue !== undefined ? defaultValue : 0;
    updateVisuals(resetVal);
    updateAudio(resetVal, true);
    React.startTransition(() => {
      onChangeRef.current(resetVal);
    });
  };

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        const now = performance.now();
        if (now - lastTouchTimeRef.current < 300) {
          e.preventDefault();
          lastTouchTimeRef.current = 0;
          resetToDefault();
          return;
        }
        lastTouchTimeRef.current = now;
      }
    };
    el.addEventListener('touchstart', handleTouchStart, { passive: false });
    return () => el.removeEventListener('touchstart', handleTouchStart);
  }, [defaultValue, trackId]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    isDraggingRef.current = true;
    startYRef.current = e.clientY;
    startXRef.current = e.clientX;
    startValueRef.current = value;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch (_) {}
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    const diffY = startYRef.current - e.clientY;
    const diffX = e.clientX - startXRef.current;
    const diff = Math.abs(diffY) >= Math.abs(diffX) ? diffY : diffX;
    let val = startValueRef.current + (diff / 140) * 200;
    val = Math.max(-100, Math.min(100, Math.round(val)));
    if (Math.abs(val) <= 2) val = 0;
    updateVisuals(val);
    updateAudio(val, false);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch (_) {}
    const diffY = startYRef.current - e.clientY;
    const diffX = e.clientX - startXRef.current;
    const diff = Math.abs(diffY) >= Math.abs(diffX) ? diffY : diffX;
    let val = startValueRef.current + (diff / 140) * 200;
    val = Math.max(-100, Math.min(100, Math.round(val)));
    if (Math.abs(val) <= 2) val = 0;
    updateVisuals(val);
    updateAudio(val, true);
    React.startTransition(() => {
      onChangeRef.current(val);
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = parseInt(e.target.value, 10);
    if (isNaN(val)) val = 0;
    if (Math.abs(val) <= 2) val = 0;
    updateVisuals(val);
    updateAudio(val, true);
    React.startTransition(() => {
      onChangeRef.current(val);
    });
  };

  return {
    containerRef,
    inputRef,
    setRotationRef,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    resetToDefault,
    handleInputChange,
  };
}
