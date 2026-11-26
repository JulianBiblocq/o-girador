import React from 'react';
import { LivePlaybackState } from './circleSequencerTypes';
import { frozenPlaybackState } from '../../hooks/audio-sync/frozenPlaybackState';

export interface MonotonicProgressTracker {
  seqKey: string;
  lastProgress: number;
}

export function createMonotonicProgressTracker(): MonotonicProgressTracker {
  return { seqKey: '', lastProgress: 0 };
}

/**
 * Progression monotone `[0, 1[` de la mesure courante, verrouillée sur `measureStartTime` / `measureDuration`
 * (zéro ré-ancrage bruité par tick `96n`, zéro enroulement `% 1` prématuré avant `M+1`).
 */
export function computeMonotonicMeasureProgress(
  live: LivePlaybackState | null | undefined,
  isCurrentlyPlaying: boolean,
  ctxTime: number,
  tracker?: MonotonicProgressTracker
): number {
  if (!live || live.isPreRoll) {
    if (tracker) { tracker.seqKey = ''; tracker.lastProgress = 0; }
    return 0;
  }

  if (isCurrentlyPlaying && live.step >= 0 && live.measureDuration && live.measureDuration > 0) {
    let rawProgress: number;
    if (typeof live.measureStartTime === 'number' && live.measureStartTime > 0 && ctxTime > 0) {
      rawProgress = (ctxTime - live.measureStartTime) / live.measureDuration;
    } else {
      const elapsed = live.time !== undefined && ctxTime > 0 ? Math.max(0, ctxTime - live.time) : 0;
      rawProgress = (live.ratio ?? 0) + elapsed / live.measureDuration;
    }
    let clamped = Math.max(0, Math.min(0.999999, rawProgress));
    if (tracker) {
      const seqKey = `${live.measureSeqId ?? 0}:${live.measure}:${live.iteration ?? 1}`;
      if (tracker.seqKey === seqKey && !live.isNavigation) {
        clamped = Math.max(tracker.lastProgress, clamped);
        tracker.lastProgress = clamped;
      } else {
        tracker.seqKey = seqKey;
        tracker.lastProgress = clamped;
      }
    }
    return clamped;
  }

  if (!isCurrentlyPlaying && frozenPlaybackState.active) {
    return Math.max(0, Math.min(0.999999, frozenPlaybackState.progress));
  }

  if (live.step >= 0 && typeof live.ratio === 'number' && live.ratio >= 0) {
    return Math.max(0, Math.min(0.999999, live.ratio));
  }

  if (tracker) { tracker.seqKey = ''; tracker.lastProgress = 0; }
  return 0;
}

export function computeStickAngle(
  live: LivePlaybackState,
  isCurrentlyPlaying: boolean,
  ctxTime: number,
  frozenStickAngleRef: React.MutableRefObject<number>,
  tracker?: MonotonicProgressTracker
): number {
  if (!live || live.isPreRoll) {
    frozenStickAngleRef.current = -Math.PI / 2;
    return -Math.PI / 2;
  }
  if (!isCurrentlyPlaying && !frozenPlaybackState.active && live.step >= 0 && frozenStickAngleRef.current !== undefined && !live.isNavigation) {
    return frozenStickAngleRef.current;
  }
  const progress = computeMonotonicMeasureProgress(live, isCurrentlyPlaying, ctxTime, tracker);
  const stickAngle = -Math.PI / 2 + progress * Math.PI * 2;
  frozenStickAngleRef.current = stickAngle;
  return stickAngle;
}
