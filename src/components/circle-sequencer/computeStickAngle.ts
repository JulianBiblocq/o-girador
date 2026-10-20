/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { LivePlaybackState } from './circleSequencerTypes';

export function computeStickAngle(
  live: LivePlaybackState,
  isCurrentlyPlaying: boolean,
  ctxTime: number,
  isEco: boolean,
  isUltraEco: boolean,
  frozenStickAngleRef: React.MutableRefObject<number>
): number {
  let stickAngle = -Math.PI / 2;

  if (live.isPreRoll) {
    stickAngle = -Math.PI / 2;
    frozenStickAngleRef.current = -Math.PI / 2;
  } else if (
    isCurrentlyPlaying &&
    live.step >= 0 &&
    live.ratio !== undefined &&
    live.time !== undefined &&
    live.measureDuration &&
    live.measureDuration > 0
  ) {
    if (isUltraEco || isEco) {
      stickAngle = -Math.PI / 2 + (live.ratio * Math.PI * 2);
    } else {
      const elapsedSinceTick = Math.max(0, ctxTime - live.time);
      if (elapsedSinceTick > 0.1) {
        stickAngle = -Math.PI / 2 + (live.ratio * Math.PI * 2);
      } else {
        const ratioProgression = elapsedSinceTick / live.measureDuration;
        const currentRatio = (live.ratio + ratioProgression) % 1;
        stickAngle = -Math.PI / 2 + (currentRatio * Math.PI * 2);
      }
    }
    frozenStickAngleRef.current = stickAngle;
  } else if (!isCurrentlyPlaying && live.step >= 0 && frozenStickAngleRef.current !== undefined) {
    stickAngle = frozenStickAngleRef.current;
  } else if (live.step >= 0 && live.ratio !== undefined && live.ratio >= 0) {
    stickAngle = -Math.PI / 2 + (live.ratio * Math.PI * 2);
  } else {
    stickAngle = -Math.PI / 2;
  }

  return stickAngle;
}
