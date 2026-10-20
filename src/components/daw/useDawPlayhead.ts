import { useRef, useEffect } from 'react';
import { subscribeToTick, unsubscribeFromTick } from '../../hooks/useAudioSync';

export function useDawPlayhead(isActive: boolean, visibleTrackIds: string) {
  const cellRefs = useRef<Record<string, Record<number, HTMLElement>>>({});
  const lastActiveStepsRef = useRef<Record<string, number>>({});
  const trackResolutionsRef = useRef<Record<string, { beats: number; resArray: number[]; totalSteps: number }>>({});

  const clearAllActiveHighlights = () => {
    Object.keys(cellRefs.current).forEach((tId) => {
      const lastIdx = lastActiveStepsRef.current[tId];
      if (lastIdx !== undefined && lastIdx !== -1) {
        const steps = cellRefs.current[tId];
        if (steps?.[lastIdx]) {
          const el = steps[lastIdx];
          el.classList.remove('playhead-active');
          el.classList.remove('!border-[#b23b25]', '!bg-[#b23b25]/20', 'shadow-[0_0_8px_#b23b25]');
        }
      }
    });
    lastActiveStepsRef.current = {};
  };

  const registerStepRef = (trackId: number | string, stepIdx: number, el: HTMLButtonElement | null) => {
    const tKey = String(trackId);
    if (el) {
      if (!cellRefs.current[tKey]) cellRefs.current[tKey] = {};
      cellRefs.current[tKey][stepIdx] = el;
    } else if (cellRefs.current[tKey]) {
      delete cellRefs.current[tKey][stepIdx];
      if (Object.keys(cellRefs.current[tKey]).length === 0) delete cellRefs.current[tKey];
    }
  };

  useEffect(() => {
    if (!isActive) {
      clearAllActiveHighlights();
      return;
    }

    const handleTick = (detail: { step: number; ratio?: number; time?: number }) => {
      const { step, ratio = 0 } = detail;
      if (step < 0 || (detail as any).isPreRoll) {
        clearAllActiveHighlights();
        return;
      }

      Object.keys(cellRefs.current).forEach((tId) => {
        const steps = cellRefs.current[tId];
        if (!steps) return;

        const trackRes = trackResolutionsRef.current[tId];
        let targetStep = 0;
        if (trackRes && trackRes.beats > 0) {
          const { beats, resArray, totalSteps } = trackRes;
          const currentBeat = Math.min(beats - 1, Math.max(0, Math.floor(ratio * beats)));
          const beatProgress = Math.min(0.9999, Math.max(0, (ratio * beats) - currentBeat));
          const res = resArray[currentBeat] || 4;
          const stepInBeat = Math.min(res - 1, Math.max(0, Math.floor(beatProgress * res)));

          let accumulated = 0;
          for (let b = 0; b < currentBeat; b++) accumulated += (resArray[b] || 4);
          targetStep = Math.min(totalSteps - 1, accumulated + stepInBeat);
        } else {
          targetStep = Math.floor(ratio * 16);
        }

        const lastStep = lastActiveStepsRef.current[tId] ?? -1;
        if (targetStep === lastStep) return;

        if (lastStep !== -1 && steps[lastStep]) {
          const prevEl = steps[lastStep];
          prevEl.classList.remove('playhead-active');
          prevEl.classList.remove('!border-[#b23b25]', '!bg-[#b23b25]/20', 'shadow-[0_0_8px_#b23b25]');
        }

        if (steps[targetStep]) {
          const newEl = steps[targetStep];
          newEl.classList.add('playhead-active');
          newEl.classList.add('!border-[#b23b25]', '!bg-[#b23b25]/20', 'shadow-[0_0_8px_#b23b25]');
        }
        lastActiveStepsRef.current[tId] = targetStep;
      });
    };

    subscribeToTick(handleTick);
    return () => {
      unsubscribeFromTick(handleTick);
      clearAllActiveHighlights();
    };
  }, [isActive, visibleTrackIds]);

  return {
    registerStepRef,
    trackResolutionsRef,
  };
}
