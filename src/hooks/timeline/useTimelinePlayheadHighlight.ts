import { useRef, useEffect } from 'react';
import { subscribeToTick, unsubscribeFromTick } from '../useAudioSync';
import { useSequencerStore } from '../../stores/useSequencerStore';

export interface UseTimelinePlayheadHighlightOptions {
  containerRef: React.RefObject<HTMLDivElement | null>;
  isActive?: boolean;
}

export function useTimelinePlayheadHighlight({ containerRef, isActive = true }: UseTimelinePlayheadHighlightOptions) {
  const cacheRef = useRef({
    lastMeasure: null as number | null,
    stepsCount: 16,
    stepElementsMap: new Map<number, HTMLElement[]>(),
    activeElements: [] as HTMLElement[],
  });

  useEffect(() => {
    const cache = cacheRef.current;
    if (!isActive) {
      cache.activeElements.forEach(el => el.classList.remove('live-playhead-highlight'));
      cache.activeElements = [];
      return;
    }

    const handleTick = (detail: { step: number; measure: number; maxTicks: number; ratio?: number; time?: number }) => {
      const { step, measure, maxTicks, ratio = step / maxTicks } = detail;
      const isEco = useSequencerStore.getState().isEcoMode || (window as any).oGiradorVisualEcoMode;
      if (isEco) return;

      if (step < 0) {
        cache.lastMeasure = null;
        cache.stepElementsMap.clear();
        cache.activeElements.forEach(el => el.classList.remove('live-playhead-highlight'));
        cache.activeElements = [];
        return;
      }

      if (measure !== cache.lastMeasure) {
        cache.lastMeasure = measure;
        cache.stepElementsMap.clear();
        cache.stepsCount = 16;
        if (containerRef.current) {
          const cells = containerRef.current.querySelectorAll<HTMLElement>(`.timeline-step[data-measure="${measure}"]`);
          cells.forEach((el) => {
            const stepAttr = el.getAttribute('data-step'), stepsAttr = el.getAttribute('data-steps');
            if (stepAttr !== null) {
              const stepIdx = parseInt(stepAttr, 10);
              if (!cache.stepElementsMap.has(stepIdx)) cache.stepElementsMap.set(stepIdx, []);
              cache.stepElementsMap.get(stepIdx)!.push(el);
            }
            if (stepsAttr !== null) cache.stepsCount = parseInt(stepsAttr, 10);
          });
        }
      }

      cache.activeElements.forEach(el => el.classList.remove('live-playhead-highlight'));
      cache.activeElements = [];

      const activeStepIdx = Math.floor(ratio * cache.stepsCount);
      const elementsToHighlight = cache.stepElementsMap.get(activeStepIdx);
      if (elementsToHighlight) {
        elementsToHighlight.forEach((el) => {
          el.classList.add('live-playhead-highlight');
          cache.activeElements.push(el);
        });
      }
    };

    subscribeToTick(handleTick);
    return () => {
      unsubscribeFromTick(handleTick);
      cache.activeElements.forEach(el => el.classList.remove('live-playhead-highlight'));
      cache.activeElements = [];
      cache.lastMeasure = null;
      cache.stepElementsMap.clear();
    };
  }, [isActive, containerRef]);
}
