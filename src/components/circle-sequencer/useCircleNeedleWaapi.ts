/**
 * useCircleNeedleWaapi.ts — Rotation WAAPI GPU `iterations: Infinity` continue à travers 12h (< 130 lignes).
 * - Zéro `.cancel()` / `el.animate()` à la frontière de mesure tant que `measureDuration` est constante.
 * - Vérification discrète de phase en milieu de mesure (`[0.25, 0.75]`) : recale `anim.startTime` uniquement si dérive > 12 ms.
 */
import React, { useEffect, useRef } from 'react';
import { audioEngine, subscribeToTick, unsubscribeFromTick } from '../../hooks/useAudioSync';
import { frozenPlaybackState } from '../../hooks/audio-sync/frozenPlaybackState';
import { subscribeToVisualFrame, unsubscribeFromVisualFrame } from '../../audio/visualTickBuffer';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { getMeasureDurationSec } from '../../utils/meterTiming';
import { getAudioTime } from './circleAudioTime';
import { computeMonotonicMeasureProgress, createMonotonicProgressTracker } from './computeStickAngle';
import { LivePlaybackState } from './circleSequencerTypes';

export function computeNeedlePhaseDriftMs(
  curAnimTimeMs: number,
  durMs: number,
  progress: number,
  thresholdMs = 12
): number {
  if (!Number.isFinite(curAnimTimeMs) || durMs <= 0) return 0;
  const targetPhaseMs = ((progress % 1) + 1) % 1 * durMs;
  const animCycleMs = ((curAnimTimeMs % durMs) + durMs) % durMs;
  let diffMs = targetPhaseMs - animCycleMs;
  if (diffMs > durMs * 0.5) diffMs -= durMs;
  if (diffMs < -durMs * 0.5) diffMs += durMs;
  return Math.abs(diffMs) > thresholdMs ? diffMs : 0;
}

export function useCircleNeedleWaapi(
  needleGroupRef: React.RefObject<SVGGElement | null>,
  isActive: boolean,
  stateRef: React.MutableRefObject<any>,
  livePlaybackRef: React.MutableRefObject<LivePlaybackState>,
  frozenStickAngleRef: React.MutableRefObject<number>
): void {
  const animRef = useRef<Animation | null>(null);
  const trackerRef = useRef(createMonotonicProgressTracker());
  const runningDurSecRef = useRef(0);

  useEffect(() => {
    const cancelNeedle = () => {
      if (animRef.current) {
        try { animRef.current.cancel(); } catch (_) {}
        animRef.current = null;
      }
      runningDurSecRef.current = 0;
    };

    const setStaticProgress = (progress: number) => {
      cancelNeedle();
      const clamped = Math.max(0, Math.min(0.999999, progress));
      frozenStickAngleRef.current = -Math.PI / 2 + clamped * Math.PI * 2;
      const el = needleGroupRef.current;
      if (el) {
        el.style.transition = 'none';
        el.style.transform = `rotate(${(-90 + clamped * 360).toFixed(3)}deg)`;
      }
    };

    if (!isActive) { cancelNeedle(); return; }

    const syncNeedle = (ctxNow: number, forceRestart = false) => {
      const el = needleGroupRef.current;
      if (!el) return;
      const live = livePlaybackRef.current;
      const isPlaying = Boolean(stateRef.current.isPlaying || audioEngine?.getIsPlaying());

      if (!isPlaying || live.isPreRoll || live.step < 0 || !live.measureDuration || live.measureDuration <= 0) {
        if (!isPlaying && frozenPlaybackState.active) setStaticProgress(frozenPlaybackState.progress);
        else if (live.isPreRoll || live.step < 0) { trackerRef.current.seqKey = ''; setStaticProgress(0); }
        else setStaticProgress(live.ratio ?? 0);
        return;
      }

      const progress = computeMonotonicMeasureProgress(live, true, ctxNow, trackerRef.current);
      frozenStickAngleRef.current = -Math.PI / 2 + progress * Math.PI * 2;
      const durSec = live.measureDuration;
      const durMs = Math.max(50, durSec * 1000);
      const curAnim = animRef.current;

      if (!forceRestart && curAnim?.playState === 'running' && Math.abs(runningDurSecRef.current - durSec) <= 1e-4) {
        if (progress >= 0.25 && progress <= 0.75 && typeof curAnim.currentTime === 'number') {
          const driftMs = computeNeedlePhaseDriftMs(curAnim.currentTime, durMs, progress, 12);
          if (driftMs !== 0) {
            try {
              if (typeof curAnim.startTime === 'number') curAnim.startTime -= driftMs;
              else curAnim.currentTime = curAnim.currentTime + driftMs;
            } catch (_) {}
          }
        }
        return;
      }

      cancelNeedle();
      el.style.transition = 'none';
      if (typeof el.animate === 'function') {
        const anim = el.animate(
          [{ transform: 'rotate(-90deg)' }, { transform: 'rotate(270deg)' }],
          { duration: durMs, iterations: Infinity, easing: 'linear' }
        );
        try { anim.currentTime = progress * durMs; } catch (_) {}
        animRef.current = anim;
        runningDurSecRef.current = durSec;
      } else {
        el.style.transform = `rotate(${(-90 + progress * 360).toFixed(3)}deg)`;
      }
    };

    const onTick = (d: any) => {
      if (d?.isNavigation || d?.isPaused || d?.isStepPreview || d?.step < 0) syncNeedle(getAudioTime(), true);
    };
    const onVisualFrame = (ctxTime: number) => syncNeedle(ctxTime, false);
    const unsubStore = useSequencerStore.subscribe((st, prev) => {
      if (st.bpm === prev.bpm && st.measureBpms === prev.measureBpms && st.isPlaying === prev.isPlaying) return;
      const live = livePlaybackRef.current;
      const isPlaying = Boolean(st.isPlaying || audioEngine?.getIsPlaying());
      if (isPlaying && live.step >= 0 && !live.isPreRoll && live.measureDuration && live.measureDuration > 0) {
        const nowCtx = getAudioTime();
        const curProgress = computeMonotonicMeasureProgress(live, true, nowCtx, trackerRef.current);
        const mIdx = live.measure % Math.max(1, st.totalMeasures || 1);
        const effBpm = st.measureBpms?.[mIdx] && st.measureBpms[mIdx] > 0 ? st.measureBpms[mIdx] : (st.bpm || 100);
        const nextDur = getMeasureDurationSec(st.measureTimeSigs?.[mIdx] || st.timeSig || '4/4', effBpm);
        live.measureDuration = nextDur;
        live.measureStartTime = nowCtx - curProgress * nextDur;
        syncNeedle(nowCtx, true);
      } else {
        syncNeedle(getAudioTime(), true);
      }
    });

    subscribeToTick(onTick);
    subscribeToVisualFrame(onVisualFrame);
    syncNeedle(getAudioTime(), true);
    return () => { unsubscribeFromTick(onTick); unsubscribeFromVisualFrame(onVisualFrame); unsubStore(); cancelNeedle(); };
  }, [isActive, needleGroupRef, stateRef, livePlaybackRef, frozenStickAngleRef]);
}
