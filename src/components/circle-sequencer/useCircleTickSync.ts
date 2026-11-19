import { useEffect, useRef } from 'react';
import { subscribeToTick, unsubscribeFromTick } from '../../hooks/useAudioSync';
import { getLastAudibleTick } from '../../audio/visualTickBuffer';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { getRodaMeasureGeometry } from '../../utils/rodaTimeSigGeometry';
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
  const updateOverlayRef = useRef(updateOverlay);
  updateOverlayRef.current = updateOverlay;

  const measureTimeSigsRef = useRef(measureTimeSigs);
  measureTimeSigsRef.current = measureTimeSigs;

  useEffect(() => {
    if (!isActive) return;

    const resolveMeasureGeom = (mIdx: number) => {
      const sig = (measureTimeSigsRef.current && measureTimeSigsRef.current[mIdx]) || timeSig || '4/4';
      return getRodaMeasureGeometry(sig);
    };

    const handleTick = (detail: any) => {
      const { step, measure, time = 0, iteration = 1, measureStartTime, measureDuration, isPaused, isNavigation } = detail;
      const geom = resolveMeasureGeom(measure ?? 0);
      const effectiveMaxTicks = detail.maxTicks && detail.maxTicks > 0 ? detail.maxTicks : geom.maxTicks;
      const ratio = detail.ratio !== undefined ? detail.ratio : step / effectiveMaxTicks;

      if (isPaused) {
        if (isNavigation) {
          livePlaybackRef.current = { step: 0, measure, maxTicks: geom.maxTicks, ratio: 0, iteration, time: 0, measureStartTime: 0, measureDuration: 0, isPreRoll: false };
          frozenStickAngleRef.current = -Math.PI / 2;
          const { displayMeasure, displayTotal } = computeDisplayMeasure(expandedRef.current, totalMeasures, measure, iteration);
          if (measureDisplayRef.current) measureDisplayRef.current.innerText = `${displayMeasure} / ${displayTotal}`;
          updateOverlayRef.current(displayMeasure - 1, measure, 0, false);
        }
        return;
      }

      if (step < 0) {
        const g0 = resolveMeasureGeom(0);
        livePlaybackRef.current = { step: -1, measure: 0, maxTicks: g0.maxTicks, ratio: 0, iteration: 1, time: 0, measureStartTime: 0, measureDuration: 0, isPreRoll: false };
        frozenStickAngleRef.current = -Math.PI / 2;
        const displayTotal = expandedRef.current.length > 0 ? expandedRef.current.length : totalMeasures;
        if (measureDisplayRef.current) measureDisplayRef.current.innerText = `1 / ${displayTotal}`;
        updateOverlayRef.current(0, 0);
        return;
      }

      const currentLive = livePlaybackRef.current;
      const isNewMeasure = currentLive.measure !== measure || currentLive.step < 0 || !currentLive.measureStartTime;
      const updatedStartTime = isNewMeasure ? (measureStartTime || currentLive.measureStartTime) : (currentLive.measureStartTime || measureStartTime);

      livePlaybackRef.current = {
        step, measure, maxTicks: effectiveMaxTicks, ratio, iteration, time,
        measureStartTime: updatedStartTime,
        measureDuration: measureDuration ?? currentLive.measureDuration,
        isPreRoll: Boolean(detail.isPreRoll),
        preRollBeat: detail.preRollBeat,
      };

      const { displayMeasure, displayTotal } = computeDisplayMeasure(
        expandedRef.current, totalMeasures, measure, iteration, pendingTargetExpandedIndexRef.current
      );

      const beatsPerMeasure = geom.beatsCount;
      const currentBeat = Math.min(beatsPerMeasure - 1, Math.max(0, Math.floor(ratio * beatsPerMeasure)));

      if (detail.isPreRoll) {
        if (measureDisplayRef.current) measureDisplayRef.current.innerText = lang === 'fr' ? 'PRÉCOMPTE' : 'PRÉ-ROLL';
        updateOverlayRef.current(
          displayMeasure - 1, measure,
          detail.preRollBeat !== undefined ? detail.preRollBeat : currentBeat,
          true, detail.preRollMeasureIndex ?? 0, detail.preRollTotalMeasures ?? 1
        );
      } else {
        if (measureDisplayRef.current) measureDisplayRef.current.innerText = `${displayMeasure} / ${displayTotal}`;
        updateOverlayRef.current(displayMeasure - 1, measure, currentBeat, false);
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

    const lastTick = getLastAudibleTick();
    if (lastTick && lastTick.drawTime > 0) {
      handleTick(lastTick);
    } else {
      const curMeasure = useSequencerStore.getState().currentMeasure;
      const curGeom = resolveMeasureGeom(curMeasure);
      const { displayMeasure, displayTotal } = computeDisplayMeasure(expandedRef.current, totalMeasures, curMeasure, 1);
      if (measureDisplayRef.current) measureDisplayRef.current.innerText = `${displayMeasure} / ${displayTotal}`;
      livePlaybackRef.current = {
        step: 0, measure: curMeasure, maxTicks: curGeom.maxTicks, ratio: 0, iteration: 1, time: 0,
        measureStartTime: 0, measureDuration: 0, isPreRoll: false,
      };
      frozenStickAngleRef.current = -Math.PI / 2;
      updateOverlayRef.current(displayMeasure - 1, curMeasure, 0, false);
    }

    return () => {
      unsubscribeFromTick(handleTick);
      window.removeEventListener('o-girador-measure-queued', handleMeasureQueued);
    };
  }, [totalMeasures, songSections, isActive, timeSig, lang]);
}
