import React, { useState, useRef, useCallback } from 'react';

export function snapSliderValue(raw: number, min: number, max: number, step: number): number {
  const stepped = step > 1 ? Math.round((raw - min) / step) * step + min : Math.round(raw);
  return Math.max(min, Math.min(max, stepped));
}

export function computeSliderPercent(displayVal: number, min: number, max: number): number {
  const span = Math.max(1, max - min);
  return Math.max(0, Math.min(100, ((displayVal - min) / span) * 100));
}

export interface UseStudioRangeSliderDragParams {
  value: number;
  min: number;
  max: number;
  step: number;
  resetValue?: number;
  onVisualChange?: (val: number | null) => void;
  onScrub?: (val: number, isFirstChange: boolean) => void;
  onCommit?: (val: number, hadScrub: boolean) => void;
  onReset?: (resetVal: number) => void;
}

export function useStudioRangeSliderDrag(params: UseStudioRangeSliderDragParams) {
  const { value, min, max, step, resetValue, onVisualChange, onScrub, onCommit, onReset } = params;
  const railRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const activePointerIdRef = useRef<number | null>(null);
  const dragRectRef = useRef<DOMRect | null>(null);
  const hasUndoPushedRef = useRef(false);
  const hadScrubRef = useRef(false);
  const clampedProp = snapSliderValue(Number.isFinite(value) ? value : min, min, max, 1);
  const dragValRef = useRef<number>(clampedProp);
  const [dragVal, setDragVal] = useState<number | null>(null);

  const displayVal = isDraggingRef.current && dragVal !== null ? dragVal : (dragVal ?? clampedProp);
  const pct = computeSliderPercent(displayVal, min, max);

  const computeFromClientX = useCallback((clientX: number, rect: DOMRect | null): number => {
    if (!rect || rect.width <= 0) return clampedProp;
    const norm = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return snapSliderValue(min + norm * (max - min), min, max, step);
  }, [min, max, step, clampedProp]);

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.stopPropagation();
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch (_) {}
    const rect = railRef.current?.getBoundingClientRect() ?? null;
    dragRectRef.current = rect;
    const nextVal = computeFromClientX(e.clientX, rect);
    activePointerIdRef.current = e.pointerId;
    isDraggingRef.current = true;
    hasUndoPushedRef.current = false;
    hadScrubRef.current = false;
    dragValRef.current = nextVal;
    setDragVal(nextVal);
    onVisualChange?.(nextVal);
    if (nextVal !== clampedProp) {
      hasUndoPushedRef.current = true;
      hadScrubRef.current = true;
      onScrub?.(nextVal, true);
    }
  }, [clampedProp, computeFromClientX, onScrub, onVisualChange]);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current || activePointerIdRef.current !== e.pointerId) return;
    e.stopPropagation();
    const rect = dragRectRef.current ?? railRef.current?.getBoundingClientRect() ?? null;
    const nextVal = computeFromClientX(e.clientX, rect);
    if (nextVal !== dragValRef.current) {
      const isFirst = !hasUndoPushedRef.current;
      hasUndoPushedRef.current = true;
      hadScrubRef.current = true;
      dragValRef.current = nextVal;
      setDragVal(nextVal);
      onVisualChange?.(nextVal);
      onScrub?.(nextVal, isFirst);
    }
  }, [computeFromClientX, onScrub, onVisualChange]);

  const finishDrag = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    if (activePointerIdRef.current !== null && e.pointerId !== activePointerIdRef.current) return;
    e.stopPropagation();
    const finalVal = dragValRef.current;
    const hadScrub = hadScrubRef.current;
    isDraggingRef.current = false;
    activePointerIdRef.current = null;
    dragRectRef.current = null;
    try { if (e.currentTarget.hasPointerCapture?.(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId); } catch (_) {}
    onCommit?.(finalVal, hadScrub);
    setDragVal(null);
    onVisualChange?.(null);
  }, [onCommit, onVisualChange]);

  const triggerReset = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (resetValue === undefined) return;
    const target = snapSliderValue(resetValue, min, max, step);
    isDraggingRef.current = false;
    activePointerIdRef.current = null;
    dragRectRef.current = null;
    dragValRef.current = target;
    setDragVal(null);
    onVisualChange?.(null);
    onReset?.(target);
  }, [resetValue, min, max, step, onReset, onVisualChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    let next: number | null = null;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') next = snapSliderValue(displayVal - step, min, max, step);
    else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') next = snapSliderValue(displayVal + step, min, max, step);
    else if (e.key === 'Home') next = min;
    else if (e.key === 'End') next = max;
    if (next === null || next === displayVal) return;
    e.preventDefault();
    e.stopPropagation();
    onScrub?.(next, true);
    onCommit?.(next, true);
  }, [displayVal, step, min, max, onScrub, onCommit]);

  return {
    railRef, displayVal, pct,
    handlePointerDown, handlePointerMove, finishDrag, triggerReset, handleKeyDown,
  };
}
