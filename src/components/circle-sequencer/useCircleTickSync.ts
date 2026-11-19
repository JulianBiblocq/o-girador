import { useEffect, useRef } from 'react';
import { subscribeToTick, unsubscribeFromTick } from '../../hooks/useAudioSync';
import { frozenPlaybackState } from '../../hooks/audio-sync/frozenPlaybackState';
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

    const applyRestAtMeasure = (restM: number, iter = 1) => {
      const clampedM = Math.max(0, Math.min(Math.max(0, (totalMeasures || 1) - 1), restM));
      const gRest = resolveMeasureGeom(clampedM);
      livePlaybackRef.current = { step: -1, measure: clampedM, maxTicks: gRest.maxTicks, ratio: 0, iteration: iter, time: 0, measureStartTime: 0, measureDuration: 0, isPreRoll: false };
      frozenStickAngleRef.current = -Math.PI / 2;
      const { displayMeasure, displayTotal } = computeDisplayMeasure(expandedRef.current, totalMeasures, clampedM, iter);
      if (measureDisplayRef.current) measureDisplayRef.current.innerText = `${displayMeasure} / ${displayTotal}`;
      updateOverlayRef.current(displayMeasure - 1, clampedM, 0, false);
    };

    const handleTick = (detail: any) => {
      const { step, measure = 0, time = 0, iteration = 1, measureStartTime, measureDuration, isPaused } = detail;
      const geom = resolveMeasureGeom(measure);
      const effectiveMaxTicks = detail.maxTicks && detail.maxTicks > 0 ? detail.maxTicks : geom.maxTicks;
      const ratio = detail.ratio !== undefined ? detail.ratio : (step >= 0 ? step / effectiveMaxTicks : 0);

      if (step < 0) {
        applyRestAtMeasure(measure, iteration);
        return;
      }

      if (isPaused) {
        const fRatio = frozenPlaybackState.active ? frozenPlaybackState.progress : ratio;
        const fMeasure = frozenPlaybackState.active ? frozenPlaybackState.measure : measure;
        const fGeom = resolveMeasureGeom(fMeasure);
        const fStep = frozenPlaybackState.active ? frozenPlaybackState.tick : Math.max(0, step);
        livePlaybackRef.current = { step: fStep, measure: fMeasure, maxTicks: fGeom.maxTicks, ratio: fRatio, iteration, time: 0, measureStartTime: 0, measureDuration: 0, isPreRoll: false };
        frozenStickAngleRef.current = -Math.PI / 2 + fRatio * Math.PI * 2;
        const { displayMeasure, displayTotal } = computeDisplayMeasure(expandedRef.current, totalMeasures, fMeasure, iteration);
        if (measureDisplayRef.current) measureDisplayRef.current.innerText = `${displayMeasure} / ${displayTotal}`;
        const beat = Math.min(fGeom.beatsCount - 1, Math.max(0, Math.floor(fRatio * fGeom.beatsCount)));
        updateOverlayRef.current(displayMeasure - 1, fMeasure, beat, false);
        return;
      }

      const currentLive = livePlaybackRef.current;
      const isNewMeasure = currentLive.measure !== measure || currentLive.step < 0 || !currentLive.measureStartTime;
      const updatedStartTime = isNewMeasure ? (measureStartTime || currentLive.measureStartTime) : (currentLive.measureStartTime || measureStartTime);

      livePlaybackRef.current = {
        step, measure, maxTicks: effectiveMaxTicks, ratio, iteration, time,
        measureStartTime: updatedStartTime, measureDuration: measureDuration ?? currentLive.measureDuration,
        isPreRoll: Boolean(detail.isPreRoll), preRollBeat: detail.preRollBeat,
      };

      const { displayMeasure, displayTotal } = computeDisplayMeasure(
        expandedRef.current, totalMeasures, measure, iteration, pendingTargetExpandedIndexRef.current
      );
      const currentBeat = Math.min(geom.beatsCount - 1, Math.max(0, Math.floor(ratio * geom.beatsCount)));

      if (detail.isPreRoll) {
        if (measureDisplayRef.current) measureDisplayRef.current.innerText = lang === 'fr' ? 'PRÉCOMPTE' : 'PRÉ-ROLL';
        updateOverlayRef.current(displayMeasure - 1, measure, detail.preRollBeat ?? currentBeat, true, detail.preRollMeasureIndex ?? 0, detail.preRollTotalMeasures ?? 1);
      } else {
        if (measureDisplayRef.current) measureDisplayRef.current.innerText = `${displayMeasure} / ${displayTotal}`;
        updateOverlayRef.current(displayMeasure - 1, measure, currentBeat, false);
      }
    };

    const handleMeasureQueued = (e: Event) => {
      const { measure, iteration = 1 } = (e as CustomEvent<{ measure: number; iteration?: number }>).detail;
      if (measureDisplayRef.current) {
        const { displayMeasure, displayTotal } = computeDisplayMeasure(expandedRef.current, totalMeasures, measure, iteration, pendingTargetExpandedIndexRef.current);
        measureDisplayRef.current.innerText = `${displayMeasure} / ${displayTotal}`;
      }
    };

    subscribeToTick(handleTick);
    window.addEventListener('o-girador-measure-queued', handleMeasureQueued);

    const lastTick = getLastAudibleTick();
    if (lastTick && lastTick.drawTime > 0 && useSequencerStore.getState().isPlaying) {
      handleTick(lastTick);
    } else if (frozenPlaybackState.active) {
      handleTick({
        step: frozenPlaybackState.tick, measure: frozenPlaybackState.measure,
        maxTicks: frozenPlaybackState.maxTicks, ratio: frozenPlaybackState.progress,
        iteration: frozenPlaybackState.iteration, isPaused: true,
      });
    } else {
      applyRestAtMeasure(useSequencerStore.getState().currentMeasure ?? 0, 1);
    }

    return () => {
      unsubscribeFromTick(handleTick);
      window.removeEventListener('o-girador-measure-queued', handleMeasureQueued);
    };
  }, [totalMeasures, songSections, isActive, timeSig, lang]);
}
