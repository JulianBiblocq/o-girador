import { TrackGroup } from '../../types';
import { instrumentsConfig } from '../../data';
import { isToadaBus } from '../../stores/helpers/trackVisibilityHelpers';
import {
  computeRodaStepAngles,
  getRodaMeasureGeometry,
  getStepAngularSpan,
  resolveActiveBeatResolutions,
} from '../../utils/rodaTimeSigGeometry';
import { INNER_SKIN_RADIUS, CENTER_MEDALLION_RADIUS } from './circleSequencerConstants';

export {
  computeRodaStepAngles,
  getRodaMeasureGeometry,
  getStepAngularSpan,
  resolveActiveBeatResolutions,
};

const OUTER_SKIN_MARGIN = 14;
const INNER_MEDALLION_MARGIN = 10;
const RADIAL_STAMP_GAP = 7;
const ANGULAR_STAMP_GAP = 4.5;

export const isRodaDrawableTrack = (track: TrackGroup | null | undefined): boolean => {
  if (!track || track.isHidden || track.instrumentIdx === undefined) return false;
  if (track.isLinkFolder) return false;
  if (track.isBusFolder && !isToadaBus(track)) return false;
  const inst = instrumentsConfig[track.instrumentIdx];
  if (!inst) return false;
  const idLower = (inst.id || '').toLowerCase();
  const nameLower = (track.customName || inst.name || '').toLowerCase();
  if (idLower === 'apito' || nameLower.includes('apito')) return false;
  return true;
};

export const computeBaseStampRadius = (totalTracks: number): number => {
  const n = Math.max(1, totalTracks);
  const usableSkinSpan = (INNER_SKIN_RADIUS - OUTER_SKIN_MARGIN) - (CENTER_MEDALLION_RADIUS + INNER_MEDALLION_MARGIN);
  const rMaxRadial = n === 1
    ? usableSkinSpan * 0.5
    : (usableSkinSpan - (n - 1) * RADIAL_STAMP_GAP) / (2 * n);
  const rCap = n === 1 ? 32 : n === 2 ? 27 : 22.5;
  return Math.max(8, Math.min(rMaxRadial, rCap));
};

export const computeStepStampRadius = (
  totalTracks: number,
  ringRadius: number,
  effectiveStepCount: number,
  isAccent: boolean
): number => {
  const rBase = computeBaseStampRadius(totalTracks);
  const steps = Math.max(1, effectiveStepCount);
  const dChord = 2 * ringRadius * Math.sin(Math.PI / steps);
  const rMaxAngular = Math.max(6, (dChord - ANGULAR_STAMP_GAP) * 0.5);
  const clamped = Math.min(rBase, rMaxAngular);
  return isAccent ? clamped : clamped * 0.86;
};

export const getTrackRadius = (visibleIdx: number, totalTracks: number): number => {
  if (totalTracks <= 0) return 0;
  const rStamp = computeBaseStampRadius(totalTracks);
  const rInnerBound = CENTER_MEDALLION_RADIUS + rStamp + INNER_MEDALLION_MARGIN;
  const rOuterBound = INNER_SKIN_RADIUS - rStamp - OUTER_SKIN_MARGIN;

  if (totalTracks === 1) return (rInnerBound + rOuterBound) * 0.5;
  if (totalTracks === 2) {
    const radialRatio = visibleIdx === 0 ? 0.66 : 0.36;
    return rInnerBound + radialRatio * (rOuterBound - rInnerBound);
  }
  const deltaRing = (rOuterBound - rInnerBound) / (totalTracks - 1);
  return rOuterBound - visibleIdx * deltaRing;
};

export const resolveBeatsFromTimeSig = (sigStr: string, _patSteps?: number): number => {
  return getRodaMeasureGeometry(sigStr).beatsCount;
};

export const computeStepAngles = (
  resolvedBeatsOrTimeSig: number | string,
  beatResolutions?: number[]
): number[] => {
  if (typeof resolvedBeatsOrTimeSig === 'string') {
    return computeRodaStepAngles(resolvedBeatsOrTimeSig, beatResolutions);
  }
  const beats = Math.max(1, resolvedBeatsOrTimeSig || 4);
  const anglePerBeat = (Math.PI * 2) / beats;
  const stepAngles: number[] = [];
  for (let b = 0; b < beats; b++) {
    const res = Math.max(1, beatResolutions?.[b] || 4);
    const anglePerStep = anglePerBeat / res;
    const beatStartAngle = -Math.PI / 2 + b * anglePerBeat;
    for (let s = 0; s < res; s++) stepAngles.push(beatStartAngle + s * anglePerStep);
  }
  return stepAngles;
};
