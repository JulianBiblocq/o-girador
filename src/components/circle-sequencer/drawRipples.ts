
import { Ripple } from './circleSequencerTypes';
import { TrackGroup, HitTriggerPool } from '../../types';

/**
 * Purge le tampon circulaire des déclenchements visuels sans dessiner de cercles géométriques (`ctx.arc`) :
 * l'impact visuel sur la Roda est désormais assuré directement par le rebond physique facetté des tampons.
 */
export const processHitTriggers = (
  pool: HitTriggerPool,
  _localRawTracks: TrackGroup[],
  _activeVisibleTracks: TrackGroup[],
  _getLiveActivePatternId: (track: TrackGroup) => number | null,
  _themeText: string,
  ripples: Ripple[]
): void => {
  pool.readIndex = pool.writeIndex;
  if (ripples.length > 0) ripples.length = 0;
};

export const drawAndUpdateRipples = (
  _ctx: CanvasRenderingContext2D,
  ripples: Ripple[]
): void => {
  if (ripples.length > 0) ripples.length = 0;
};
