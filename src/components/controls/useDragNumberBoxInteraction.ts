import { useRef, useEffect } from 'react';
import { getDragNumberBoxFillStyles, computeDragNumberStepValue } from './dragNumberBoxMath';

interface UseDragNumberBoxInteractionProps {
  value: number;
  disabled: boolean;
  actualMin: number;
  actualMax: number;
  range: number;
  step?: number;
  mode: 'unipolar' | 'bipolar';
  defaultValue: number;
  onChange: (val: number) => void;
  onAudioDrag?: (val: number) => void;
  formatValue: (val: number) => string;
  gaugeRef?: React.RefObject<HTMLDivElement | null>;
}

export function useDragNumberBoxInteraction({
  value,
  disabled,
  actualMin,
  actualMax,
  range,
  step,
  mode,
  defaultValue,
  onChange,
  onAudioDrag,
  formatValue,
  gaugeRef,
}: UseDragNumberBoxInteractionProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const valueSpanRef = useRef<HTMLSpanElement>(null);
  const startYRef = useRef<number>(0);
  const startValRef = useRef<number>(0);
  const currentValRef = useRef<number>(value);
  const isDraggingRef = useRef<boolean>(false);
  const lastTouchTimeRef = useRef<number>(0);
  const onAudioDragRef = useRef(onAudioDrag);
  onAudioDragRef.current = onAudioDrag;

  const updateDomDisplay = (val: number) => {
    if (valueSpanRef.current) {
      valueSpanRef.current.textContent = disabled ? '—' : formatValue(val);
    }
    if (containerRef.current) {
      const fillStyles = getDragNumberBoxFillStyles(val, actualMin, range, mode);
      containerRef.current.style.setProperty('--fill-left', fillStyles.left);
      containerRef.current.style.setProperty('--fill-width', fillStyles.width);
    }
  };

  const resetToDefault = () => {
    if (disabled) return;
    const resetVal = defaultValue !== undefined ? defaultValue : 0;
    currentValRef.current = resetVal;
    updateDomDisplay(resetVal);
    if (gaugeRef && 'current' in gaugeRef && gaugeRef.current) {
      gaugeRef.current.style.transform = `scaleX(${Math.max(0, Math.min(1, (resetVal - actualMin) / (range || 1)))})`;
    }
    if (onAudioDragRef.current) onAudioDragRef.current(resetVal);
    onChange(resetVal);
  };

  useEffect(() => {
    currentValRef.current = value;
    if (!isDraggingRef.current) {
      updateDomDisplay(value);
    }
  }, [value, disabled, actualMin, range, mode]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (disabled) return;
    e.preventDefault();
    containerRef.current?.setPointerCapture(e.pointerId);
    containerRef.current?.classList.add('is-dragging');
    startYRef.current = e.clientY;
    startValRef.current = currentValRef.current;
    isDraggingRef.current = true;
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (disabled || !isDraggingRef.current || !containerRef.current?.hasPointerCapture(e.pointerId)) return;
    const dy = startYRef.current - e.clientY;
    const delta = (dy / 150) * range;
    const newVal = computeDragNumberStepValue(startValRef.current + delta, actualMin, actualMax, step);
    currentValRef.current = newVal;
    updateDomDisplay(newVal);
    if (onAudioDragRef.current) onAudioDragRef.current(newVal);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (disabled) return;
    if (containerRef.current?.hasPointerCapture(e.pointerId)) {
      containerRef.current.releasePointerCapture(e.pointerId);
      containerRef.current.classList.remove('is-dragging');
      isDraggingRef.current = false;
      onChange(currentValRef.current);
    }
  };

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handleTouchStart = (e: TouchEvent) => {
      if (disabled) return;
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
  }, [disabled, defaultValue, actualMin, range]);

  return {
    containerRef,
    valueSpanRef,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    resetToDefault,
  };
}
