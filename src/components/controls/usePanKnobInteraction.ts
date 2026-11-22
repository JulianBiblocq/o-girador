import React, { useRef, useCallback, useEffect } from 'react';
import { usePanAudioAndMidi } from './usePanAudioAndMidi';
import { calculatePanFromDelta, UsePanKnobInteractionProps } from './panKnobMath';

export function usePanKnobInteraction({
  trackId,
  value,
  defaultValue = 0,
  onChange,
  panKnobRef,
  memberTicks,
}: UsePanKnobInteractionProps) {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const memberTicksRef = useRef(memberTicks);
  memberTicksRef.current = memberTicks;

  const isDraggingRef = useRef(false);
  const startYRef = useRef(0);
  const startXRef = useRef(0);
  const startValueRef = useRef(0);
  const lastTouchTimeRef = useRef<number>(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const rotationGroupRef = useRef<SVGGElement>(null);
  const tickGroupRefs = useRef<Array<SVGGElement | null>>([]);

  const setRotationRef = (el: SVGGElement | null) => {
    (rotationGroupRef as React.MutableRefObject<SVGGElement | null>).current = el;
    if (panKnobRef) {
      (panKnobRef as React.MutableRefObject<SVGGElement | null>).current = el;
    }
  };

  const setTickGroupRef = useCallback((idx: number, el: SVGGElement | null) => {
    tickGroupRefs.current[idx] = el;
  }, []);

  const updateVisuals = useCallback((val: number) => {
    if (rotationGroupRef.current) {
      rotationGroupRef.current.style.transform = '';
      rotationGroupRef.current.setAttribute('transform', `rotate(${val * 1.35} 16 16)`);
    }
    const ticks = memberTicksRef.current;
    if (ticks && ticks.length > 0) {
      for (let i = 0; i < ticks.length; i++) {
        const g = tickGroupRefs.current[i];
        if (!g) continue;
        const clamped = Math.max(-100, Math.min(100, ticks[i].baseOffset + val));
        g.setAttribute('transform', `rotate(${clamped * 1.35} 16 16)`);
      }
    }
    if (inputRef.current) {
      inputRef.current.value = String(val);
      inputRef.current.title = `Pan: ${val === 0 ? 'Centro' : val > 0 ? 'D' + val : 'E' + Math.abs(val)}`;
    }
  }, []);

  const { updateAudio } = usePanAudioAndMidi(trackId, updateVisuals);

  useEffect(() => {
    if (!isDraggingRef.current) updateVisuals(value);
  }, [value, memberTicks, updateVisuals]);

  const resetToDefault = () => {
    const resetVal = defaultValue !== undefined ? defaultValue : 0;
    updateVisuals(resetVal);
    updateAudio(resetVal, true);
    React.startTransition(() => { onChangeRef.current(resetVal); });
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
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch (_) {}
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    const val = calculatePanFromDelta(startYRef.current, startXRef.current, e.clientY, e.clientX, startValueRef.current);
    updateVisuals(val);
    updateAudio(val, false);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch (_) {}
    const val = calculatePanFromDelta(startYRef.current, startXRef.current, e.clientY, e.clientX, startValueRef.current);
    updateVisuals(val);
    updateAudio(val, true);
    React.startTransition(() => { onChangeRef.current(val); });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = parseInt(e.target.value, 10);
    if (isNaN(val)) val = 0;
    if (Math.abs(val) <= 2) val = 0;
    updateVisuals(val);
    updateAudio(val, true);
    React.startTransition(() => { onChangeRef.current(val); });
  };

  return {
    containerRef, inputRef, setRotationRef, setTickGroupRef,
    handlePointerDown, handlePointerMove, handlePointerUp, resetToDefault, handleInputChange,
  };
}
