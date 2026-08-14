/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useRef, useCallback, useEffect } from 'react';

export interface UseSliderDragOptions {
  direction?: 'horizontal' | 'vertical';
  min?: number;
  max?: number;
  step?: number;
  invertVertical?: boolean; // In vertical mode, bottom = min, top = max (default: true)
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

  const calculateValueFromCoords = useCallback(
    (clientX: number, clientY: number) => {
      const rect = rectRef.current;
      if (!rect) return min;

      let ratio = 0;
      if (direction === 'horizontal') {
        const relativeX = clientX - rect.left;
        ratio = rect.width > 0 ? relativeX / rect.width : 0;
      } else {
        const relativeY = clientY - rect.top;
        ratio = rect.height > 0 ? relativeY / rect.height : 0;
        if (invertVertical) {
          ratio = 1 - ratio;
        }
      }

      ratio = Math.min(1, Math.max(0, ratio));

      let val = min + ratio * (max - min);

      // Snap to step
      if (step > 0) {
        const steps = Math.round((val - min) / step);
        val = min + steps * step;
      }

      return Math.min(max, Math.max(min, val));
    },
    [direction, min, max, step, invertVertical]
  );

  const startDrag = useCallback(
    (clientX: number, clientY: number) => {
      isDraggingRef.current = true;
      if (containerRef.current) {
        rectRef.current = containerRef.current.getBoundingClientRect();
      }
      const val = calculateValueFromCoords(clientX, clientY);
      if (onDragRef.current) {
        onDragRef.current(val);
      }
    },
    [calculateValueFromCoords, containerRef]
  );

  const updateDrag = useCallback(
    (clientX: number, clientY: number) => {
      if (!isDraggingRef.current) return;
      const val = calculateValueFromCoords(clientX, clientY);
      if (onDragRef.current) {
        onDragRef.current(val);
      }
    },
    [calculateValueFromCoords]
  );

  const stopDrag = useCallback(
    (clientX: number, clientY: number) => {
      if (!isDraggingRef.current) return;
      isDraggingRef.current = false;
      const val = calculateValueFromCoords(clientX, clientY);
      if (onCommitRef.current) {
        onCommitRef.current(val);
      } else if (onDragRef.current) {
        onDragRef.current(val);
      }
    },
    [calculateValueFromCoords]
  );

  // Pointer event handlers (mouse + touch)
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

  // Native non-passive Touch listener fallback for strict mobile browser gesture blocking
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        e.preventDefault();
        const touch = e.touches[0];
        startDrag(touch.clientX, touch.clientY);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (isDraggingRef.current && e.touches.length > 0) {
        e.preventDefault();
        const touch = e.touches[0];
        updateDrag(touch.clientX, touch.clientY);
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (isDraggingRef.current) {
        e.preventDefault();
        const touch = e.changedTouches[0] || e.touches[0];
        if (touch) {
          stopDrag(touch.clientX, touch.clientY);
        } else {
          isDraggingRef.current = false;
        }
      }
    };

    // Attach non-passive touch listeners
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
  }, [containerRef, startDrag, updateDrag, stopDrag]);

  return {
    isDraggingRef,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePointerCancel: handlePointerUp,
  };
}
