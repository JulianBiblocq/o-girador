
import { LivePlaybackState } from './circleSequencerTypes';

/**
 * Angle de l'aiguille Roda. L'interpolation temporelle sur l'horloge audio est TOUJOURS active
 * (60 FPS sanctuarises quel que soit le palier Eco) : l'aiguille ne saute jamais par crans.
 */
export function computeStickAngle(
  live: LivePlaybackState,
  isCurrentlyPlaying: boolean,
  ctxTime: number,
  frozenStickAngleRef: React.MutableRefObject<number>
): number {
  let stickAngle = -Math.PI / 2;

  if (live.isPreRoll) {
    frozenStickAngleRef.current = -Math.PI / 2;
  } else if (
    isCurrentlyPlaying &&
    live.step >= 0 &&
    live.ratio !== undefined &&
    live.time !== undefined &&
    live.measureDuration &&
    live.measureDuration > 0
  ) {
    const elapsedSinceTick = Math.max(0, ctxTime - live.time);
    if (elapsedSinceTick > 0.1) {
      stickAngle = -Math.PI / 2 + (live.ratio * Math.PI * 2);
    } else {
      const currentRatio = (live.ratio + elapsedSinceTick / live.measureDuration) % 1;
      stickAngle = -Math.PI / 2 + (currentRatio * Math.PI * 2);
    }
    frozenStickAngleRef.current = stickAngle;
  } else if (!isCurrentlyPlaying && live.step >= 0 && frozenStickAngleRef.current !== undefined) {
    stickAngle = frozenStickAngleRef.current;
  } else if (live.step >= 0 && live.ratio !== undefined && live.ratio >= 0) {
    stickAngle = -Math.PI / 2 + (live.ratio * Math.PI * 2);
  }

  return stickAngle;
}
