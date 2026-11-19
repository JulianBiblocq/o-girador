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

const START_ANGLE_12H = -Math.PI / 2;
const FULL_CIRCLE = Math.PI * 2;

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

export function computeRodaStepAngles(
  rawSig?: string | null,
  beatResolutions?: readonly number[] | null,
  stepOffsetsPct?: readonly number[] | null
): number[] {
  const { beatsCount, defaultSubdivisions } = getRodaMeasureGeometry(rawSig);
  const anglePerBeat = FULL_CIRCLE / beatsCount;
  const stepAngles: number[] = [];
  let globalIdx = 0;

  for (let b = 0; b < beatsCount; b++) {
    const subCount = Math.max(1, beatResolutions?.[b] || defaultSubdivisions);
    const anglePerStep = anglePerBeat / subCount;
    const beatStart = START_ANGLE_12H + b * anglePerBeat;
    for (let s = 0; s < subCount; s++) {
      const offsetPct = stepOffsetsPct?.[globalIdx] || 0;
      stepAngles.push(beatStart + s * anglePerStep + (offsetPct / 100) * 0.5 * anglePerStep);
      globalIdx++;
    }
  }
  return stepAngles;
}

export function getStepAngularSpan(stepAngles: readonly number[], stepIdx: number): number {
  const len = stepAngles.length;
  if (len <= 0) return FULL_CIRCLE / 16;
  const idx = ((stepIdx % len) + len) % len;
  if (idx < len - 1) return Math.max(0.01, stepAngles[idx + 1] - stepAngles[idx]);
  return Math.max(0.01, START_ANGLE_12H + FULL_CIRCLE - stepAngles[idx]);
}

export function angleToNormalizedRodaRatio(angle: number): number {
  return ((((angle - START_ANGLE_12H) % FULL_CIRCLE) + FULL_CIRCLE) % FULL_CIRCLE) / FULL_CIRCLE;
}

export function findStepIndexAtNormalizedP(stepAngles: readonly number[], p: number, tol = 1e-4): number {
  for (let i = 0; i < stepAngles.length; i++) {
    const diff = Math.abs(angleToNormalizedRodaRatio(stepAngles[i]) - p);
    if (diff < tol || Math.abs(diff - 1) < tol) return i;
  }
  return -1;
}

export function computeMeasurePatternStepOffset(
  pattern: (Pick<Pattern, 'steps' | 'measureAssignments'> & { beatResolutions?: number[] }) | null | undefined,
  activeMeasureStepCount: number,
  measureIdx: number
): number {
  if (!pattern || activeMeasureStepCount <= 0) return 0;
  const patSteps = pattern.steps || activeMeasureStepCount;
  if (patSteps <= 16 || patSteps < activeMeasureStepCount * 2) return 0;
  const spanMeasures = Math.max(1, Math.round(patSteps / activeMeasureStepCount));
  if (spanMeasures <= 1) return 0;
  let startM = measureIdx;
  while (startM > 0 && pattern.measureAssignments?.[startM - 1] === true) startM--;
  return ((measureIdx - startM) % spanMeasures) * activeMeasureStepCount;
}

export function getRodaStepDurationTicks(
  rawSig: string | null | undefined,
  pattern: (Pick<Pattern, 'steps' | 'beatResolutions'> & { timeSignature?: string }) | null | undefined,
  circleStepIdx: number
): number {
  const geom = getRodaMeasureGeometry(rawSig);
  const beatRes = resolveActiveBeatResolutions(rawSig, pattern);
  let cursor = 0;
  for (let b = 0; b < beatRes.length; b++) {
    const res = Math.max(1, beatRes[b]);
    if (circleStepIdx < cursor + res) return geom.ticksPerBeat / res;
    cursor += res;
  }
  return geom.ticksPerBeat / Math.max(1, geom.defaultSubdivisions);
}
