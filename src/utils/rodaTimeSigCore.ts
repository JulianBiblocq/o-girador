import type { Pattern, TimeSignature } from '../types';

export interface RodaMeasureGeometry {
  timeSig: TimeSignature;
  beatsCount: number;
  defaultSubdivisions: number;
  defaultSteps: number;
  maxTicks: number;
  ticksPerBeat: number;
  isCompound: boolean;
  beatAngles: number[];
}

export const START_ANGLE_12H = -Math.PI / 2;
export const FULL_CIRCLE = Math.PI * 2;

export function normalizeTimeSig(raw?: string | null): TimeSignature {
  if (raw === '2/4' || raw === '3/4' || raw === '4/4' || raw === '6/8' || raw === '9/8' || raw === '12/8') return raw;
  return '4/4';
}

export function getRodaMeasureGeometry(rawSig?: string | null): RodaMeasureGeometry {
  const timeSig = normalizeTimeSig(rawSig);
  const isCompound = timeSig === '6/8' || timeSig === '9/8' || timeSig === '12/8';
  let beatsCount = 4;
  if (timeSig === '2/4' || timeSig === '6/8') beatsCount = 2;
  else if (timeSig === '3/4' || timeSig === '9/8') beatsCount = 3;

  const defaultSubdivisions = isCompound ? 3 : 4;
  const ticksPerBeat = isCompound ? 36 : 24;
  const maxTicks = beatsCount * ticksPerBeat;
  const defaultSteps = beatsCount * defaultSubdivisions;
  const anglePerBeat = FULL_CIRCLE / beatsCount;
  const beatAngles = Array.from({ length: beatsCount }, (_, b) => START_ANGLE_12H + b * anglePerBeat);

  return { timeSig, beatsCount, defaultSubdivisions, defaultSteps, maxTicks, ticksPerBeat, isCompound, beatAngles };
}

export function resolveActiveBeatResolutions(
  rawSig?: string | null,
  pattern?: (Pick<Pattern, 'steps' | 'beatResolutions'> & { timeSignature?: string }) | null
): number[] {
  const geom = getRodaMeasureGeometry(rawSig);
  const { beatsCount, defaultSubdivisions, isCompound } = geom;
  const rawRes = pattern?.beatResolutions;

  if (Array.isArray(rawRes) && rawRes.length > 0) {
    const isUnadapted44OnCompound =
      isCompound && rawRes.length === 4 && rawRes.every((r) => r === 4) && pattern?.timeSignature !== geom.timeSig;
    if (!isUnadapted44OnCompound) {
      return Array.from({ length: beatsCount }, (_, b) => {
        const val = rawRes[b];
        return typeof val === 'number' && val > 0 ? val : defaultSubdivisions;
      });
    }
  }

  const steps = pattern?.steps || 0;
  if (steps === beatsCount * 6) return Array(beatsCount).fill(6);
  return Array(beatsCount).fill(defaultSubdivisions);
}
