import React, { useEffect, useRef } from 'react';
import { audioEngine, subscribeToTick, unsubscribeFromTick } from '../../hooks/useAudioSync';
import { frozenPlaybackState } from '../../hooks/audio-sync/frozenPlaybackState';
import { subscribeToVisualFrame, unsubscribeFromVisualFrame } from '../../audio/visualTickBuffer';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { getMeasureDurationSec } from '../../utils/meterTiming';
import { getAudioTime } from './circleAudioTime';
import { computeMonotonicMeasureProgress, createMonotonicProgressTracker } from './computeStickAngle';
import { LivePlaybackState } from './circleSequencerTypes';

/**
 * Pilotage WAAPI linéaire sur le compositeur GPU de l'aiguille `<svg>` de la Roda (< 125 lignes).
 * Couvre sans saut : 1) BPM live mi-mesure, 2) Hard Freeze Pause, 3) Stop 12h, 4) Seek / Exploration.
 */
export function useCircleNeedleWaapi(
  needleGroupRef: React.RefObject<SVGGElement | null>,
  isActive: boolean,
  stateRef: React.MutableRefObject<any>,
  livePlaybackRef: React.MutableRefObject<LivePlaybackState>,
  frozenStickAngleRef: React.MutableRefObject<number>
): void {
  const animRef = useRef<Animation | null>(null);
  const trackerRef = useRef(createMonotonicProgressTracker());
  const specRef = useRef({ seqKey: '', startSec: 0, durSec: 0, startProgress: 0 });

  useEffect(() => {
    const cancelNeedle = () => {
      if (animRef.current) {
        try { animRef.current.cancel(); } catch (_) {}
        animRef.current = null;
      }
      specRef.current.seqKey = '';
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
      const seqKey = `${live.measureSeqId ?? 0}:${live.measure}:${live.iteration ?? 1}`;
      const sp = specRef.current;
      const sameSpec = sp.seqKey === seqKey && Math.abs(sp.durSec - live.measureDuration) <= 1e-4 && Math.abs(sp.startSec - (live.measureStartTime ?? 0)) <= 0.008;

      if (!forceRestart && animRef.current?.playState === 'running' && sameSpec) {
        const curMs = typeof animRef.current.currentTime === 'number' ? animRef.current.currentTime : 0;
        const animProg = sp.startProgress + (curMs / 1000) / Math.max(0.05, sp.durSec);
        if (Math.abs(animProg - progress) <= 0.008) return;
      }

      cancelNeedle();
      const startDeg = -90 + progress * 360;
      const remainingMs = Math.max(8, (1 - progress) * live.measureDuration * 1000);
      el.style.transition = 'none';
      el.style.transform = `rotate(${startDeg.toFixed(3)}deg)`;

      if (typeof el.animate === 'function') {
        const anim = el.animate(
          [{ transform: `rotate(${startDeg.toFixed(3)}deg)` }, { transform: 'rotate(270deg)' }],
          { duration: remainingMs, easing: 'linear', fill: 'forwards' }
        );
        anim.onfinish = () => {
          if (animRef.current === anim) {
            el.style.transform = 'rotate(270deg)';
            try { anim.cancel(); } catch (_) {}
            animRef.current = null;
          }
        };
        animRef.current = anim;
      }
      specRef.current = { seqKey, startSec: live.measureStartTime ?? 0, durSec: live.measureDuration, startProgress: progress };
    };

    const onTick = (d: any) => syncNeedle(getAudioTime(), Boolean(d?.isNavigation || d?.isPaused || d?.isStepPreview || d?.step <= 0));
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
