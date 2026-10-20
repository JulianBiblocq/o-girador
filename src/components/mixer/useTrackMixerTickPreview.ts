import { useRef, useEffect } from 'react';
import type { Pattern } from '../../types';
import { subscribeToTick, unsubscribeFromTick } from '../../hooks/useAudioSync';

export function useTrackMixerTickPreview(
  isTracksCollapsed: boolean,
  isMobile: boolean,
  activePattern: Pattern | null
) {
  const cellRefs = useRef<Record<number, HTMLInputElement>>({});
  const lastActiveStepRef = useRef<number>(-1);

  const clearHighlight = (stepIdx: number) => {
    const el = cellRefs.current[stepIdx];
    if (el) {
      el.style.boxShadow = '';
      el.style.borderColor = '';
    }
  };

  const registerStepRef = (stepIdx: number, el: HTMLInputElement | null) => {
    if (el) {
      cellRefs.current[stepIdx] = el;
    } else {
      delete cellRefs.current[stepIdx];
    }
  };

  useEffect(() => {
    if (isTracksCollapsed || !isMobile) {
      if (lastActiveStepRef.current !== -1) {
        clearHighlight(lastActiveStepRef.current);
        lastActiveStepRef.current = -1;
      }
      return;
    }

    const handleTick = (detail: { step: number; ratio?: number }) => {
      const ratio = detail.ratio ?? 0;
      if (!activePattern) return;
      const targetStep = Math.floor(ratio * activePattern.steps);
      const lastStep = lastActiveStepRef.current;
      if (targetStep === lastStep) return;

      if (lastStep !== -1) {
        clearHighlight(lastStep);
      }
      if (cellRefs.current[targetStep]) {
        const newEl = cellRefs.current[targetStep];
        newEl.style.boxShadow = '0 0 10px #b23b25';
        newEl.style.borderColor = '#b23b25';
      }
      lastActiveStepRef.current = targetStep;
    };

    subscribeToTick(handleTick);
    return () => {
      unsubscribeFromTick(handleTick);
      if (lastActiveStepRef.current !== -1) {
        clearHighlight(lastActiveStepRef.current);
      }
    };
  }, [isTracksCollapsed, isMobile, activePattern]);

  return { registerStepRef };
}
