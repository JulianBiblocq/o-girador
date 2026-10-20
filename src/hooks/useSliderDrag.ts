/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useRef, useCallback } from 'react';
import { calculateSliderValueFromCoords, SliderMathOptions } from './sliderDragMath';
import { useNonPassiveTouchFallback } from './useNonPassiveTouchFallback';

export interface UseSliderDragOptions extends SliderMathOptions {
  onDrag?: (value: number) => void;
  onCommit?: (value: number) => void;
}

export function useSliderDrag(
  containerRef: React.RefObject<HTMLElement | null>,
  options: UseSliderDragOptions
) {
  const {
    direction = 'horizontal',
    min = 0,
    max = 100,
    step = 1,
    invertVertical = true,
    onDrag,
    onCommit,
  } = options;

  const isDraggingRef = useRef(false);
  const rectRef = useRef<DOMRect | null>(null);

  const onDragRef = useRef(onDrag);
  onDragRef.current = onDrag;
  const onCommitRef = useRef(onCommit);
  onCommitRef.current = onCommit;

  const calculateValue = useCallback(
    (clientX: number, clientY: number) => {
      return calculateSliderValueFromCoords(clientX, clientY, rectRef.current, {
        direction, min, max, step, invertVertical
      });
    },
    [direction, min, max, step, invertVertical]
  );

  const startDrag = useCallback(
    (clientX: number, clientY: number) => {
      isDraggingRef.current = true;
      if (containerRef.current) {
        rectRef.current = containerRef.current.getBoundingClientRect();
      }
      const val = calculateValue(clientX, clientY);
      if (onDragRef.current) onDragRef.current(val);
    },
    [calculateValue, containerRef]
  );

  const updateDrag = useCallback(
    (clientX: number, clientY: number) => {
      if (!isDraggingRef.current) return;
      const val = calculateValue(clientX, clientY);
      if (onDragRef.current) onDragRef.current(val);
    },
    [calculateValue]
  );

  const stopDrag = useCallback(
    (clientX: number, clientY: number) => {
      if (!isDraggingRef.current) return;
      isDraggingRef.current = false;
      const val = calculateValue(clientX, clientY);
      if (onCommitRef.current) {
        onCommitRef.current(val);
      } else if (onDragRef.current) {
        onDragRef.current(val);
      }
    },
    [calculateValue]
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      try {
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      } catch (_) {}
      startDrag(e.clientX, e.clientY);
    },
    [startDrag]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDraggingRef.current) return;
      e.preventDefault();
      updateDrag(e.clientX, e.clientY);
    },
    [updateDrag]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!isDraggingRef.current) return;
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch (_) {}
      stopDrag(e.clientX, e.clientY);
    },
    [stopDrag]
  );

  useNonPassiveTouchFallback({
    containerRef,
    isDraggingRef,
    startDrag,
    updateDrag,
    stopDrag,
  });

  return {
    isDraggingRef,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePointerCancel: handlePointerUp,
  };
}
