/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect } from 'react';
import { subscribeToTick, unsubscribeFromTick } from '../../hooks/useAudioSync';
import { getBeatsPerMeasure } from '../../utils/measureHelpers';
import { LivePlaybackState } from './circleSequencerTypes';
import { computeDisplayMeasure } from './computeDisplayMeasure';

export function useCircleTickSync(
  isActive: boolean,
  totalMeasures: number,
  songSections: any[],
  expandedRef: React.MutableRefObject<any[]>,
  livePlaybackRef: React.MutableRefObject<LivePlaybackState>,
  frozenStickAngleRef: React.MutableRefObject<number>,
  measureDisplayRef: React.RefObject<HTMLSpanElement | null>,
  pendingTargetExpandedIndexRef: React.MutableRefObject<number | null>,
  measureTimeSigs: Record<number, string> | undefined,
  timeSig: string,
  lang: string,
  updateOverlay: (expandedMeasureIdx: number, baseMeasureIdx: number, currentBeat?: number, isPreRoll?: boolean, preRollMeasureIndex?: number, preRollTotalMeasures?: number) => void
): void {
  useEffect(() => {
    if (!isActive) return;

    const handleTick = (detail: any) => {
      const { step, measure, maxTicks, ratio = step / maxTicks, time = 0, iteration = 1, measureStartTime, measureDuration, isPaused, isNavigation } = detail;

      if (isPaused) {
        if (isNavigation) {
          livePlaybackRef.current = { step: 0, measure, maxTicks, ratio: 0, iteration, time: 0, measureStartTime: 0, measureDuration: 0, isPreRoll: false };
          frozenStickAngleRef.current = -Math.PI / 2;
          const { displayMeasure, displayTotal } = computeDisplayMeasure(expandedRef.current, totalMeasures, measure, iteration);
          if (measureDisplayRef.current) measureDisplayRef.current.innerText = `${displayMeasure} / ${displayTotal}`;
          updateOverlay(displayMeasure - 1, measure, 0, false);
        }
        return;
      }

      if (step < 0) {
        livePlaybackRef.current = { step: -1, measure: 0, maxTicks, ratio: 0, iteration: 1, time: 0, measureStartTime: 0, measureDuration: 0, isPreRoll: false };
        frozenStickAngleRef.current = -Math.PI / 2;
        const displayTotal = expandedRef.current.length > 0 ? expandedRef.current.length : totalMeasures;
        if (measureDisplayRef.current) measureDisplayRef.current.innerText = `1 / ${displayTotal}`;
        updateOverlay(0, 0);
        return;
      }

      const currentLive = livePlaybackRef.current;
      const isNewMeasure = currentLive.measure !== measure || currentLive.step < 0 || !currentLive.measureStartTime;
      const updatedStartTime = isNewMeasure ? (measureStartTime || currentLive.measureStartTime) : (currentLive.measureStartTime || measureStartTime);

      livePlaybackRef.current = {
        step, measure, maxTicks, ratio, iteration, time,
        measureStartTime: updatedStartTime,
        measureDuration: measureDuration ?? currentLive.measureDuration,
        isPreRoll: Boolean(detail.isPreRoll),
      };

      const { displayMeasure, displayTotal } = computeDisplayMeasure(
        expandedRef.current, totalMeasures, measure, iteration, pendingTargetExpandedIndexRef.current
      );

      const localTimeSig = (measureTimeSigs && measureTimeSigs[measure]) || timeSig || '4/4';
      const beatsPerMeasure = getBeatsPerMeasure(localTimeSig);
      const currentBeat = Math.min(beatsPerMeasure - 1, Math.max(0, Math.floor(ratio * beatsPerMeasure)));

      if (detail.isPreRoll) {
        if (measureDisplayRef.current) measureDisplayRef.current.innerText = lang === 'fr' ? 'PRÉCOMPTE' : 'PRÉ-ROLL';
        updateOverlay(
          displayMeasure - 1, measure,
          detail.preRollBeat !== undefined ? detail.preRollBeat : currentBeat,
          true, detail.preRollMeasureIndex ?? 0, detail.preRollTotalMeasures ?? 1
        );
      } else {
        if (measureDisplayRef.current) measureDisplayRef.current.innerText = `${displayMeasure} / ${displayTotal}`;
        updateOverlay(displayMeasure - 1, measure, currentBeat, false);
      }
    };

    const handleMeasureQueued = (e: Event) => {
      const { measure, iteration = 1 } = (e as CustomEvent<{ measure: number; iteration?: number }>).detail;
      if (measureDisplayRef.current) {
        const { displayMeasure, displayTotal } = computeDisplayMeasure(
          expandedRef.current, totalMeasures, measure, iteration, pendingTargetExpandedIndexRef.current
        );
        measureDisplayRef.current.innerText = `${displayMeasure} / ${displayTotal}`;
      }
    };

    subscribeToTick(handleTick);
    window.addEventListener('o-girador-measure-queued', handleMeasureQueued);
    return () => {
      unsubscribeFromTick(handleTick);
      window.removeEventListener('o-girador-measure-queued', handleMeasureQueued);
    };
  }, [totalMeasures, songSections, isActive]);
}
