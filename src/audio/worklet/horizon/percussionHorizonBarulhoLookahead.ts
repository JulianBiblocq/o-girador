/**
 * percussionHorizonBarulhoLookahead.ts — Extraction chronologique multi-mesures `[M, M+1, M+2]`
 * des points d'intérêt Barulho/frappes par piste pour calcul exact des rampes `b -> b` et `/ -> .` (< 90 lignes).
 */

import { instrumentsConfig } from '../../../data';
import { Track } from '../../../types';
import { BarulhoLookaheadPoint } from '../../barulho/barulhoRampPlanner';
import { ProjectedHorizonMeasure } from './percussionHorizonProjection';

export interface MeasureVariationSnapshotLike {
  variedTrackIds: Set<number>;
  variationNotes: ArrayLike<number>;
}

export function buildHorizonBarulhoLookaheadPoints(
  projected: readonly ProjectedHorizonMeasure[],
  snaps: readonly MeasureVariationSnapshotLike[],
  tracks: readonly Track[],
  flatCompiledSchedule: Float64Array | null,
  getTrackUnisonDelaySec: (trackId: number) => number
): BarulhoLookaheadPoint[] {
  const points: BarulhoLookaheadPoint[] = [];

  for (let m = 0; m < projected.length; m++) {
    const pm = projected[m];
    const snap = snaps[m];
    const { timing, measureStartTick } = pm;
    const endTick = measureStartTick + timing.maxTicks;

    const pushTuple = (absTick: number, packedData: number, velocity: number, microPct: number, skipSet?: Set<number>) => {
      const tickInMeasure = absTick - measureStartTick;
      if (tickInMeasure < 0 || tickInMeasure >= timing.maxTicks) return;
      const track = tracks[(packedData >> 22) & 0x3FF];
      if (!track || track.isBusFolder || track.isLinkFolder || (skipSet && skipSet.has(track.id))) return;
      const inst = instrumentsConfig[track.instrumentIdx];
      if (!inst || inst.type === 'voice') return;

      const symbol = String.fromCharCode((packedData >> 9) & 0x7F);
      const tickDurSec = timing.instantTickDurSec[tickInMeasure];
      const microSec = (microPct / 100) * (tickDurSec * 6) * 0.5;
      const timeSec =
        timing.startTimeSec +
        timing.tickOffsetsSec[tickInMeasure] +
        microSec +
        getTrackUnisonDelaySec(track.id);

      points.push({ trackId: track.id, timeSec, symbol, velocity });
    };

    if (flatCompiledSchedule && flatCompiledSchedule.length > 0) {
      let lo = 0, hi = (flatCompiledSchedule.length >>> 2) - 1;
      while (lo < hi) {
        const mid = (lo + hi) >>> 1;
        if (flatCompiledSchedule[mid << 2] < measureStartTick) lo = mid + 1;
        else hi = mid;
      }
      for (let ptr = lo << 2; ptr < flatCompiledSchedule.length; ptr += 4) {
        const absTick = flatCompiledSchedule[ptr];
        if (absTick >= endTick) break;
        if (absTick >= measureStartTick) {
          pushTuple(absTick, flatCompiledSchedule[ptr + 1], flatCompiledSchedule[ptr + 2], flatCompiledSchedule[ptr + 3], snap.variedTrackIds);
        }
      }
    }

    const vNotes = snap.variationNotes;
    for (let vPtr = 0; vPtr < vNotes.length; vPtr += 4) {
      const absTick = vNotes[vPtr];
      if (absTick >= measureStartTick && absTick < endTick) {
        pushTuple(absTick, vNotes[vPtr + 1], vNotes[vPtr + 2], vNotes[vPtr + 3]);
      }
    }
  }

  points.sort((a, b) => a.timeSec - b.timeSec);
  return points;
}
