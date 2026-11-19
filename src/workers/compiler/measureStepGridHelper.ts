/**
 * measureStepGridHelper.ts — Grille rythmique de mesure (ticks, nuplets et offset multi-mesures) (< 55 lignes).
 */

import {
  computeMeasurePatternStepOffset,
  getRodaMeasureGeometry,
  resolveActiveBeatResolutions,
} from '../../utils/rodaTimeSigGeometry';

export interface MeasureStepGrid {
  stepTickMap: number[];
  stepIsTupletMap: boolean[];
  effectiveStepCount: number;
  stepOffset: number;
  maxTicks: number;
}

export function buildMeasureStepGrid(
  timeSig: string,
  activePattern: any,
  measureIdx: number
): MeasureStepGrid {
  const geom = getRodaMeasureGeometry(timeSig);
  const { beatsCount, ticksPerBeat, maxTicks } = geom;
  const resArray = resolveActiveBeatResolutions(timeSig, activePattern);
  let stepTickAccum = 0;
  const stepTickMap: number[] = [];
  const stepIsTupletMap: boolean[] = [];

  for (let b = 0; b < beatsCount; b++) {
    const res = Math.max(1, resArray[b] || geom.defaultSubdivisions);
    const ticksPerStep = ticksPerBeat / res;
    for (let r = 0; r < res; r++) {
      stepTickMap.push(Math.round(stepTickAccum + r * ticksPerStep));
      stepIsTupletMap.push(res === 3 || res === 6);
    }
    stepTickAccum += ticksPerBeat;
  }

  const effectiveStepCount = stepTickMap.length;
  const stepOffset = computeMeasurePatternStepOffset(activePattern, effectiveStepCount, measureIdx);
  return { stepTickMap, stepIsTupletMap, effectiveStepCount, stepOffset, maxTicks };
}
