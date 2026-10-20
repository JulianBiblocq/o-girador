/**
 * O Girador - Vocal Beat Grouping & Step-Tick Mapping
 */

export interface VocalBeatGroup {
  beatIndex: number;
  steps: number[];
  resolution: number;
}

export interface VocalMeasureGroups {
  measureIndex: number;
  groups: VocalBeatGroup[];
}

export interface VocalStepTickMatch {
  step: number;
  beatIndex: number;
  stepInBeat: number;
  stepsInBeat: number;
  singleStepSec: number;
  triggerTick: number;
}

export function getVocalMeasureGroups(
  totalSteps: number,
  beatResolutions?: number[] | null,
  beatsPerMeasure: number = 4
): VocalMeasureGroups[] {
  const beats = Math.max(1, Math.round(beatsPerMeasure) || 4);
  const resArray = Array.isArray(beatResolutions) && beatResolutions.length >= beats
    ? beatResolutions.slice(0, beats)
    : Array(beats).fill(4);

  const stepsPerMeasure = resArray.reduce((sum, r) => sum + (r > 0 ? r : 4), 0);
  const numMeasures = Math.max(1, Math.round((totalSteps || stepsPerMeasure) / stepsPerMeasure));

  const measures: VocalMeasureGroups[] = [];
  let accumulatedStep = 0;

  for (let m = 0; m < numMeasures; m++) {
    const groups: VocalBeatGroup[] = [];
    for (let b = 0; b < beats; b++) {
      const res = resArray[b] > 0 ? resArray[b] : 4;
      const stepIndices: number[] = [];
      for (let s = 0; s < res; s++) {
        if (accumulatedStep < totalSteps) {
          stepIndices.push(accumulatedStep);
          accumulatedStep++;
        }
      }
      groups.push({ beatIndex: b, steps: stepIndices, resolution: res });
    }
    measures.push({ measureIndex: m, groups });
  }

  return measures;
}

export function getVocalStepTickMap(
  beatResolutions: number[] | undefined | null,
  beatsPerMeasure: number,
  totalTicks: number,
  bpm: number
): Map<number, VocalStepTickMatch> {
  const map = new Map<number, VocalStepTickMatch>();
  const beats = Math.max(1, Math.round(beatsPerMeasure) || 4);
  const resArray = Array.isArray(beatResolutions) && beatResolutions.length >= beats
    ? beatResolutions.slice(0, beats)
    : Array(beats).fill(4);

  const ticksPerBeat = totalTicks / beats;
  const safeBpm = isNaN(bpm) || bpm <= 0 ? 100 : bpm;
  const beatDurationSec = 60 / safeBpm;
  let accumulatedStep = 0;

  for (let b = 0; b < beats; b++) {
    const res = resArray[b] > 0 ? resArray[b] : 4;
    const ticksPerStep = ticksPerBeat / res;
    const singleStepSec = beatDurationSec / res;

    for (let r = 0; r < res; r++) {
      const triggerTick = Math.round(b * ticksPerBeat + r * ticksPerStep);
      map.set(triggerTick, {
        step: accumulatedStep,
        beatIndex: b,
        stepInBeat: r,
        stepsInBeat: res,
        singleStepSec,
        triggerTick,
      });
      accumulatedStep++;
    }
  }

  return map;
}

export function clampStepIndex(stepIdx: number | null | undefined, totalSteps: number): number | null {
  if (stepIdx === null || stepIdx === undefined) return null;
  if (totalSteps <= 0) return 0;
  return Math.max(0, Math.min(stepIdx, totalSteps - 1));
}
