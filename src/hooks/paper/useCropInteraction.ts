/**
 * Hook de manipulation tactile et pointeur du cadre de rognage (< 110 lignes).
 * Utilise PointerEvents unifiés et setPointerCapture pour verrouiller le scroll.
 */
import { useState, useRef, useCallback } from 'react';
import { NormalizedCropRect } from '../../utils/paper/paperImagePreprocessor';

export type HandleType = 'nw' | 'ne' | 'se' | 'sw' | 'n' | 's' | 'e' | 'w' | 'move';

export function useCropInteraction(initialCrop?: NormalizedCropRect) {
  const [crop, setCrop] = useState<NormalizedCropRect>(
    initialCrop || { x: 0.05, y: 0.05, width: 0.9, height: 0.9 }
  );

  const containerRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{
    handle: HandleType;
    startX: number;
    startY: number;
    startCrop: NormalizedCropRect;
  } | null>(null);

  const onPointerDown = useCallback((e: React.PointerEvent, handle: HandleType) => {
    e.preventDefault();
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = {
      handle,
      startX: e.clientX,
      startY: e.clientY,
      startCrop: { ...crop },
    };
  }, [crop]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragRef.current || !containerRef.current) return;
    e.preventDefault();
    const rect = containerRef.current.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    const dx = (e.clientX - dragRef.current.startX) / rect.width;
    const dy = (e.clientY - dragRef.current.startY) / rect.height;
    const { handle, startCrop } = dragRef.current;
    const minSize = 0.08;

    let { x, y, width, height } = startCrop;

    if (handle === 'move') {
      x = Math.max(0, Math.min(1 - width, startCrop.x + dx));
      y = Math.max(0, Math.min(1 - height, startCrop.y + dy));
    } else {
      if (handle.includes('w')) {
        const right = startCrop.x + startCrop.width;
        x = Math.max(0, Math.min(right - minSize, startCrop.x + dx));
        width = right - x;
      }
      if (handle.includes('e')) {
        width = Math.max(minSize, Math.min(1 - startCrop.x, startCrop.width + dx));
      }
      if (handle.includes('n')) {
        const bottom = startCrop.y + startCrop.height;
        y = Math.max(0, Math.min(bottom - minSize, startCrop.y + dy));
        height = bottom - y;
      }
      if (handle.includes('s')) {
        height = Math.max(minSize, Math.min(1 - startCrop.y, startCrop.height + dy));
      }
    }

    setCrop({ x, y, width, height });
  }, []);

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    if (dragRef.current) {
      try { (e.target as HTMLElement).releasePointerCapture(e.pointerId); } catch {}
      dragRef.current = null;
    }
  }, []);

  const resetCrop = useCallback(() => {
    setCrop({ x: 0.05, y: 0.05, width: 0.9, height: 0.9 });
  }, []);

  return {
    crop,
    setCrop,
    containerRef,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    resetCrop,
  };
}
