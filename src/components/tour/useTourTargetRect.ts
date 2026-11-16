import { useState, useEffect } from 'react';
import { TourStepDef } from '../../data/tour/tourTypes';
import { useTourStore } from '../../stores/useTourStore';

export interface SpotlightRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

function findVisibleTourElement(step: TourStepDef): HTMLElement | null {
  if (typeof document === 'undefined') return null;
  const candidates = [step.targetTourId, ...(step.fallbackTourIds || [])];
  for (const id of candidates) {
    const nodes = document.querySelectorAll<HTMLElement>(`[data-tour-id="${id}"]`);
    for (let i = 0; i < nodes.length; i++) {
      const el = nodes[i];
      const r = el.getBoundingClientRect();
      if (r.width > 4 && r.height > 4) return el;
    }
  }
  return null;
}

export function useTourTargetRect(step: TourStepDef | undefined, isOpen: boolean) {
  const [rect, setRect] = useState<SpotlightRect | null>(null);
  const [viewport, setViewport] = useState<{ w: number; h: number }>(() => ({
    w: typeof window !== 'undefined' ? window.innerWidth : 1280,
    h: typeof window !== 'undefined' ? window.innerHeight : 800,
  }));

  useEffect(() => {
    if (!isOpen || !step || typeof window === 'undefined') {
      setRect(null);
      return;
    }

    const tourSt = useTourStore.getState();
    step.prepare?.({ markEditorOpened: tourSt.markEditorOpenedByTour, markOficinaOpened: tourSt.markOficinaOpenedByTour });

    let observedEl: HTMLElement | null = null;
    let ro: ResizeObserver | null = null;
    let t1: number | null = null;
    let t2: number | null = null;

    const measure = () => {
      setViewport({ w: window.innerWidth, h: window.innerHeight });
      const el = findVisibleTourElement(step);
      if (!el) {
        setRect(null);
        return;
      }
      if (el !== observedEl && ro) {
        if (observedEl) ro.unobserve(observedEl);
        observedEl = el;
        ro.observe(el);
      }
      const b = el.getBoundingClientRect();
      setRect({
        x: Math.round(b.left),
        y: Math.round(b.top),
        width: Math.round(b.width),
        height: Math.round(b.height),
      });
    };

    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => measure());
      ro.observe(document.documentElement);
    }

    const raf = window.requestAnimationFrame(measure);
    t1 = window.setTimeout(measure, 140);
    t2 = window.setTimeout(measure, 360);
    window.addEventListener('resize', measure);

    return () => {
      window.cancelAnimationFrame(raf);
      if (t1) window.clearTimeout(t1);
      if (t2) window.clearTimeout(t2);
      window.removeEventListener('resize', measure);
      ro?.disconnect();
    };
  }, [step, isOpen]);

  return { rect, viewport };
}
