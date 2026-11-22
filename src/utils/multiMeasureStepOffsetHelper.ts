import type { Pattern } from '../types';
import { getRodaMeasureGeometry, resolveActiveBeatResolutions } from './rodaTimeSigCore';

export function getNominalPatternBarSteps(
  pattern: (Pick<Pattern, 'steps'> & { beatResolutions?: number[]; timeSignature?: string }) | null | undefined,
  activeMeasureStepCount: number
): { nominalBarSteps: number; spanMeasures: number; patSteps: number } {
  if (!pattern || activeMeasureStepCount <= 0) {
    const safe = Math.max(1, activeMeasureStepCount || 16);
    return { nominalBarSteps: safe, spanMeasures: 1, patSteps: safe };
  }
  const patSteps = pattern.steps || activeMeasureStepCount;
  const patGeom = getRodaMeasureGeometry(pattern.timeSignature || '4/4');
  const rawRes = pattern.beatResolutions;
  let nominalBarSteps = patGeom.defaultSteps;
  if (Array.isArray(rawRes) && rawRes.length > 0) {
    let sum = 0;
    for (let b = 0; b < patGeom.beatsCount; b++) {
      sum += typeof rawRes[b] === 'number' && rawRes[b] > 0 ? rawRes[b] : patGeom.defaultSubdivisions;
    }
    nominalBarSteps = Math.max(1, sum);
  } else if (patSteps === patGeom.beatsCount * 6) {
    nominalBarSteps = patSteps;
  }
  const spanMeasures = patSteps >= nominalBarSteps * 2 ? Math.max(1, Math.round(patSteps / nominalBarSteps)) : 1;
  return { nominalBarSteps, spanMeasures, patSteps };
}

export function computeMeasurePatternStepOffset(
  pattern: (Pick<Pattern, 'steps' | 'measureAssignments'> & { beatResolutions?: number[]; timeSignature?: string }) | null | undefined,
  activeMeasureStepCount: number,
  measureIdx: number,
  isSamePatternAtMeasure?: (m: number) => boolean
): number {
  const { nominalBarSteps, spanMeasures } = getNominalPatternBarSteps(pattern, activeMeasureStepCount);
  if (spanMeasures <= 1) return 0;
  let startM = measureIdx;
  const checkPrev = isSamePatternAtMeasure ?? ((m: number) => pattern?.measureAssignments?.[m] === true);
  while (startM > 0 && checkPrev(startM - 1)) startM--;
  return ((measureIdx - startM) % spanMeasures) * nominalBarSteps;
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
