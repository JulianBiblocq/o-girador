/**
 * measureStepGridHelper.ts — Grille rythmique de mesure (ticks, nuplets et offset multi-mesures) (< 55 lignes).
 */

export interface MeasureStepGrid {
  stepTickMap: number[];
  stepIsTupletMap: boolean[];
  effectiveStepCount: number;
  stepOffset: number;
}

export function buildMeasureStepGrid(
  beats: number,
  maxTicks: number,
  activePattern: any,
  measureIdx: number
): MeasureStepGrid {
  const ticksPerBeat = maxTicks / beats;
  const resArray = activePattern.beatResolutions || Array(beats).fill(4);
  let stepTickAccum = 0;
  const stepTickMap: number[] = [];
  const stepIsTupletMap: boolean[] = [];

  for (let b = 0; b < beats; b++) {
    const res = resArray[b] || 4;
    const ticksPerStep = ticksPerBeat / res;
    for (let r = 0; r < res; r++) {
      stepTickMap.push(Math.round(stepTickAccum + r * ticksPerStep));
      stepIsTupletMap.push(res === 3 || res === 6);
    }
    stepTickAccum += ticksPerBeat;
  }

  const effectiveStepCount = stepTickMap.length;
  const stepsPerMeasure = beats * 4;
  const patternSpan = Math.max(1, Math.round((activePattern.steps || stepsPerMeasure) / stepsPerMeasure));
  let stepOffset = 0;
  if (patternSpan > 1) {
    let startM = measureIdx;
    while (startM > 0 && activePattern.measureAssignments?.[startM - 1] === true) startM--;
    stepOffset = ((measureIdx - startM) % patternSpan) * stepsPerMeasure;
  }

  return { stepTickMap, stepIsTupletMap, effectiveStepCount, stepOffset };
}
