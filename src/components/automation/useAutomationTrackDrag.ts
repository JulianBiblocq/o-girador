import { useRef, useEffect } from 'react';
import { getValueFromY } from './AutomationSvgPathBuilder';

export interface UseAutomationTrackDragParams {
  svgRef: React.RefObject<SVGSVGElement | null>;
  containerRef: React.RefObject<HTMLDivElement | null>;
  localValuesRef: React.MutableRefObject<number[]>;
  isExpanded: boolean;
  min: number;
  max: number;
  transitions: ('immediate' | 'ramp' | 'bezier')[];
  onChangeTransition: (idx: number, trans: 'immediate' | 'ramp' | 'bezier') => void;
  autoGroup: {
    onPointerDown: (idx: number, isShift: boolean) => void;
    onPointerMove: (draggedIdx: number, val: number) => void;
    onPointerUp: (draggedIdx: number) => void;
  };
  onOpenPrompt: (idx: number, currentVal: number) => void;
}

export function useAutomationTrackDrag({
  svgRef, containerRef, localValuesRef, isExpanded, min, max,
  transitions, onChangeTransition, autoGroup, onOpenPrompt,
}: UseAutomationTrackDragParams) {
  const draggingIdxRef = useRef<number | null>(null);
  const svgRectRef = useRef<DOMRect | null>(null);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    let lastClickTime = 0, lastClickIdx = -1, hasMoved = false, startY = 0;

    const handlePointerDown = (e: PointerEvent) => {
      const target = e.target as SVGElement;
      if (target.tagName === 'circle' && target.dataset.idx) {
        e.stopPropagation();
        const idx = parseInt(target.dataset.idx, 10);
        const now = Date.now();
        hasMoved = false;
        startY = e.clientY;

        if (now - lastClickTime < 350 && lastClickIdx === idx) {
          lastClickTime = 0;
          lastClickIdx = -1;
          draggingIdxRef.current = null;
          onOpenPrompt(idx, localValuesRef.current[idx]);
          return;
        }

        lastClickTime = now;
        lastClickIdx = idx;
        draggingIdxRef.current = idx;
        svgRectRef.current = svg.getBoundingClientRect();
        try { svg.setPointerCapture(e.pointerId); } catch (_) {}
        autoGroup.onPointerDown(idx, e.shiftKey);
      } else if (target.tagName === 'rect' || target.tagName === 'text') {
        const parent = target.parentNode as SVGElement;
        if (parent?.dataset?.transIdx) {
          e.stopPropagation();
          const idx = parseInt(parent.dataset.transIdx, 10);
          const cur = transitions[idx] || 'immediate';
          const next = cur === 'immediate' ? 'ramp' : cur === 'ramp' ? 'bezier' : 'immediate';
          onChangeTransition(idx, next);
        }
      }
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (draggingIdxRef.current === null || !isExpanded) return;
      const draggedIdx = draggingIdxRef.current;
      const rect = svgRectRef.current || svg.getBoundingClientRect();
      const y = Math.max(0, Math.min(rect.height, e.clientY - rect.top));
      const val = getValueFromY(y, rect.height, min, max);
      if (Math.abs(e.clientY - startY) > 2) hasMoved = true;
      autoGroup.onPointerMove(draggedIdx, val);
    };

    const handlePointerUp = (e: PointerEvent) => {
      if (draggingIdxRef.current === null) return;
      const draggedIdx = draggingIdxRef.current;
      draggingIdxRef.current = null;
      try {
        if (svg.hasPointerCapture(e.pointerId)) svg.releasePointerCapture(e.pointerId);
      } catch (_) {}
      if (hasMoved) {
        hasMoved = false;
        autoGroup.onPointerUp(draggedIdx);
      }
      svgRectRef.current = null;
    };

    const handleDoubleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | SVGElement;
      if (!target) return;
      const idxStr = target.getAttribute?.('data-idx') ?? target.dataset?.idx ?? target.getAttribute?.('data-measure-idx') ?? target.dataset?.measureIdx;
      if (idxStr !== null && idxStr !== undefined) {
        e.preventDefault(); e.stopPropagation();
        const idx = parseInt(idxStr, 10);
        if (!isNaN(idx)) onOpenPrompt(idx, localValuesRef.current[idx]);
      }
    };

    const container = containerRef.current;
    if (container) container.addEventListener('dblclick', handleDoubleClick);
    svg.addEventListener('dblclick', handleDoubleClick);
    svg.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);

    return () => {
      if (container) container.removeEventListener('dblclick', handleDoubleClick);
      svg.removeEventListener('dblclick', handleDoubleClick);
      svg.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [isExpanded, max, min, onChangeTransition, autoGroup, transitions, onOpenPrompt, svgRef, containerRef, localValuesRef]);

  return { draggingIdxRef };
}
