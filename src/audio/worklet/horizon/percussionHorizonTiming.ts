/**
 * O Girador - SSOT Temporel & Soudure Sample-Accurate pour l'Horizon AudioWorklet (< 95 lignes)
 * - Gère `measureBpms`, `measureBpmTransitions` (`immediate`, `ramp`, `bezier`), `SpeedTrainer`
 *   et signatures binaires / ternaires (`2/4`, `3/4`, `4/4`, `6/8`, `9/8`, `12/8`).
 * - Garantit `startFrame(seq + 1) === endFrame(seq)` (zéro dérive, zéro trou, zéro chevauchement).
 */

import { getMaxTicks } from '../../../data';

export interface MeasureTimingTable {
  measureIdx: number;
  maxTicks: number;
  startFrame: number;
  endFrame: number;
  startTimeSec: number;
  durationSec: number;
  tickOffsetsSec: Float64Array;
  instantTickDurSec: Float64Array;
}

export function resolveMeasureStepTickDurSec(
  measureIdx: number,
  stepIdx: number,
  maxTicks: number,
  totalMeasures: number,
  measureBpms: number[] | Record<number, number> | undefined,
  measureBpmTransitions: Record<number, string> | undefined,
  fallbackBpm: number,
  speedTrainerBpm?: number
): number {
  if (speedTrainerBpm !== undefined && speedTrainerBpm > 0) {
    return 2.5 / Math.max(1, speedTrainerBpm);
  }
  const totalM = Math.max(1, totalMeasures || 1);
  const mIdx = ((measureIdx % totalM) + totalM) % totalM;
  const rawCurr = measureBpms?.[mIdx];
  const currentBpm = rawCurr && !isNaN(rawCurr) && rawCurr > 0 ? rawCurr : (fallbackBpm || 100);
  const transition = measureBpmTransitions?.[mIdx] || 'immediate';

  if (transition === 'immediate' || mIdx >= totalM - 1) {
    return 2.5 / Math.max(1, currentBpm);
  }

  const nextMIdx = (mIdx + 1) % totalM;
  const rawNext = measureBpms?.[nextMIdx];
  const nextBpm = rawNext && !isNaN(rawNext) && rawNext > 0 ? rawNext : currentBpm;
  if (Math.abs(nextBpm - currentBpm) < 1e-4) {
    return 2.5 / Math.max(1, currentBpm);
  }

  const safeMaxTicks = Math.max(1, maxTicks || 96);
  const ratio = Math.min(1, Math.max(0, stepIdx / safeMaxTicks));
  const shapedRatio =
    transition === 'bezier' ? ratio * ratio * (3 - 2 * ratio) : ratio;
  const interpolatedBpm = currentBpm + (nextBpm - currentBpm) * shapedRatio;
  return 2.5 / Math.max(1, interpolatedBpm);
}

export function buildMeasureTimingTable(params: {
  measureIdx: number; startFrame: number; sampleRate: number; totalMeasures: number;
  measureTimeSigs: Record<number, string> | string[];
  measureBpms: number[] | Record<number, number> | undefined;
  measureBpmTransitions?: Record<number, string>;
  fallbackBpm: number; speedTrainerBpm?: number;
}): MeasureTimingTable {
  const { measureIdx, startFrame, sampleRate, totalMeasures, measureTimeSigs, measureBpms, measureBpmTransitions, fallbackBpm, speedTrainerBpm } = params;
  const sr = sampleRate > 0 ? sampleRate : 48000;
  const timeSig = measureTimeSigs?.[measureIdx] || '4/4';
  const maxTicks = Math.max(1, getMaxTicks(timeSig as any));
  const tickOffsetsSec = new Float64Array(maxTicks + 1);
  const instantTickDurSec = new Float64Array(maxTicks);

  let accumSec = 0;
  tickOffsetsSec[0] = 0;
  for (let s = 0; s < maxTicks; s++) {
    const d = resolveMeasureStepTickDurSec(
      measureIdx, s, maxTicks, totalMeasures, measureBpms, measureBpmTransitions, fallbackBpm, speedTrainerBpm
    );
    instantTickDurSec[s] = d;
    accumSec += d;
    tickOffsetsSec[s + 1] = accumSec;
  }

  const startTimeSec = startFrame / sr;
  const endFrame = startFrame + Math.round(accumSec * sr);
  return { measureIdx, maxTicks, startFrame, endFrame, startTimeSec, durationSec: accumSec, tickOffsetsSec, instantTickDurSec };
}
