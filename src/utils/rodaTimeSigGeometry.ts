import { FULL_CIRCLE, START_ANGLE_12H, getRodaMeasureGeometry } from './rodaTimeSigCore';

export type { RodaMeasureGeometry } from './rodaTimeSigCore';
export { getRodaMeasureGeometry, normalizeTimeSig, resolveActiveBeatResolutions } from './rodaTimeSigCore';
export {
  computeMeasurePatternStepOffset,
  getNominalPatternBarSteps,
  getRodaStepDurationTicks,
} from './multiMeasureStepOffsetHelper';

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
