import React, { useEffect, useRef } from 'react';
import { getKnobAngle, formatKnobValue, quantizeKnobValue } from './mixerKnobMath';
import { useMixerKnobTouchDrag } from './useMixerKnobTouchDrag';

interface UseMixerKnobInteractionProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  decimals?: number;
  defaultValue?: number;
  onChange: (val: number) => void;
  onAudioDrag?: (val: number) => void;
  label: string;
  unit?: string;
}

export function useMixerKnobInteraction({
  value,
  min,
  max,
  step = 1,
  decimals,
  defaultValue = 0,
  onChange,
  onAudioDrag,
  label,
  unit = '',
}: UseMixerKnobInteractionProps) {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const onAudioDragRef = useRef(onAudioDrag);
  onAudioDragRef.current = onAudioDrag;

  const isDraggingRef = useRef(false);
  const startYRef = useRef(0);
  const startValueRef = useRef(0);
  const lastTapTimeRef = useRef(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const rotationGroupRef = useRef<SVGGElement>(null);
  const valueLabelRef = useRef<HTMLSpanElement>(null);
  const knobContainerRef = useRef<HTMLDivElement>(null);

  const quantize = (rawVal: number) => quantizeKnobValue(rawVal, min, max, step, defaultValue, unit);

  const updateVisuals = (val: number) => {
    if (rotationGroupRef.current) {
      const angle = getKnobAngle(val, min, max);
      rotationGroupRef.current.setAttribute('transform', `rotate(${angle} 16 16)`);
    }
    if (valueLabelRef.current) {
      valueLabelRef.current.textContent = formatKnobValue(val, unit, decimals);
    }
    if (inputRef.current) {
      inputRef.current.title = `${label}: ${formatKnobValue(val, unit, decimals)}`;
      inputRef.current.value = String(val);
    }
  };

  const resetToDefault = () => {
    const resetVal = defaultValue !== undefined ? defaultValue : 0;
    updateVisuals(resetVal);
    if (onAudioDragRef.current) onAudioDragRef.current(resetVal);
    React.startTransition(() => {
      onChangeRef.current(resetVal);
    });
  };

  useEffect(() => {
    if (!isDraggingRef.current) {
      updateVisuals(value);
    }
  }, [value]);

  const handlePointerDown = (e: React.PointerEvent) => {
    isDraggingRef.current = true;
    startYRef.current = e.clientY;
    startValueRef.current = value;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch (_) {}
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    const diffY = startYRef.current - e.clientY;
    const rawVal = startValueRef.current + (diffY / 150) * (max - min);
    const val = quantize(rawVal);
    updateVisuals(val);
    if (onAudioDragRef.current) onAudioDragRef.current(val);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch (_) {}
    const rawVal = parseFloat(inputRef.current?.value || String(value));
    const val = quantize(rawVal);
    React.startTransition(() => {
      onChangeRef.current(val);
    });
  };

  const handleKeyboardChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isDraggingRef.current) return;
    const val = quantize(parseFloat(e.target.value));
    updateVisuals(val);
    onChangeRef.current(val);
  };

  useMixerKnobTouchDrag({
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
  });

  return {
    inputRef,
    rotationGroupRef,
    valueLabelRef,
    knobContainerRef,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handleKeyboardChange,
    resetToDefault,
  };
}
