/**
 * Compensation synchrone de l'offset temporel d'ancrage à la reprise (< 45 lignes).
 */

import * as Tone from 'tone';
import { tickSubscribers } from './audioSyncTypes';

export function applyResumeAnchorCompensation(
  anchoredMeasureStartSecRef: { current: number },
  tickEventDetailRef: { current: any }
): void {
  if (anchoredMeasureStartSecRef.current === -1) {
    const detail = tickEventDetailRef.current;
    const ratioVal = detail.ratio || 0;
    const targetStartTime = Tone.context.currentTime + Tone.context.lookAhead;
    const measureDurationSec = Tone.Time('1m').toSeconds();

    const newAnchor = targetStartTime - ratioVal * measureDurationSec;
    anchoredMeasureStartSecRef.current = newAnchor;

    detail.measureStartTime = newAnchor;
    detail.measureDuration = measureDurationSec;
    detail.targetStartTime = targetStartTime;
    detail.time = targetStartTime;
    detail.isPaused = false;

    tickSubscribers.forEach((cb) => {
      try {
        cb(detail);
      } catch (err) {
        console.error(err);
      }
    });
  }
}
