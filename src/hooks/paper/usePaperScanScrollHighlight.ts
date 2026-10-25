/**
 * Hook d'auto-scroll et de mise en valeur visuelle temporaire (Flash 2,5s) (< 70 lignes).
 */
import { useState, useCallback, useRef } from 'react';

export function usePaperScanScrollHighlight() {
  const [highlightedTarget, setHighlightedTarget] = useState<string | null>(null);
  const timerRef = useRef<any>(null);

  const scrollToTarget = useCallback((targetKey: string) => {
    try {
      let el: Element | null = null;
      if (targetKey === '__sequence__') {
        el = document.querySelector('[data-paper-sequence-builder="true"]');
      } else {
        const escaped = CSS.escape(targetKey);
        el = document.querySelector(`[data-paper-section-name="${escaped}"], [data-paper-section-id="${escaped}"]`);
      }
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    } catch (e) {
      console.warn('Scroll highlight error:', e);
    }
  }, []);

  const triggerScrollHighlight = useCallback((targetKey: string, delayMs = 60) => {
    if (!targetKey) return;
    setHighlightedTarget(targetKey);

    if (timerRef.current) clearTimeout(timerRef.current);

    setTimeout(() => {
      scrollToTarget(targetKey);
    }, delayMs);

    timerRef.current = setTimeout(() => {
      setHighlightedTarget((curr) => (curr === targetKey ? null : curr));
    }, 2500);
  }, [scrollToTarget]);

  const isHighlighted = useCallback((secId?: string, secName?: string) => {
    if (!highlightedTarget) return false;
    const lower = highlightedTarget.toLowerCase();
    return (
      (Boolean(secName) && secName!.toLowerCase() === lower) ||
      (Boolean(secId) && secId!.toLowerCase() === lower) ||
      highlightedTarget === secName ||
      highlightedTarget === secId
    );
  }, [highlightedTarget]);

  return {
    highlightedTarget,
    triggerScrollHighlight,
    isHighlighted,
    scrollToTarget,
  };
}
