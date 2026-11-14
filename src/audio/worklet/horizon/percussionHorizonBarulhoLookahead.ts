/**
 * percussionHorizonBarulhoLookahead.ts — Extraction chronologique multi-mesures `[M, M+1, M+2]`
 * des points d'intérêt Barulho/frappes par piste (avec `swingSec` exact du pas cible) (< 95 lignes).
 */

import { instrumentsConfig } from '../../../data';
import { computePercussionNoteSwing, resolveActivePatternForMeasure } from '../../../hooks/audio-sync/percussionSwingHelper';
import { GlobalSwing, Track } from '../../../types';
import { BarulhoLookaheadPoint } from '../../barulho/barulhoRampPlanner';
import { ProjectedHorizonMeasure } from './percussionHorizonProjection';
import { HorizonPackerEngineDeps } from './percussionHorizonTypes';
import { resolveTrackFromPackedData } from '../../../workers/compiler/compiledTrackIdResolver';

export interface MeasureVariationSnapshotLike {
  variedTrackIds: Set<number>;
  variationNotes: ArrayLike<number>;
}

export function buildHorizonBarulhoLookaheadPoints(
  projected: readonly ProjectedHorizonMeasure[],
  snaps: readonly MeasureVariationSnapshotLike[],
  tracks: readonly Track[],
  flatCompiledSchedule: Float64Array | null,
  engineDeps: Pick<HorizonPackerEngineDeps, 'getTrackUnisonDelaySec' | 'getTrackBalancoAdherence'>,
  soloPatternPlayId: number | null,
  globalSwing: GlobalSwing
): BarulhoLookaheadPoint[] {
  const points: BarulhoLookaheadPoint[] = [];
  const mutTracks = tracks as Track[];

  for (let m = 0; m < projected.length; m++) {
    const pm = projected[m];
    const snap = snaps[m];
    const { timing, measureStartTick } = pm;
    const endTick = measureStartTick + timing.maxTicks;

    const pushTuple = (absTick: number, packedData: number, velocity: number, microPct: number, sourceSchedule: object | null, skipSet?: Set<number>) => {
      const tickInMeasure = absTick - measureStartTick;
      if (tickInMeasure < 0 || tickInMeasure >= timing.maxTicks) return;
      const track = resolveTrackFromPackedData(packedData, tracks, sourceSchedule);
      if (!track || track.isBusFolder || track.isLinkFolder || (skipSet && skipSet.has(track.id))) return;
      const inst = instrumentsConfig[track.instrumentIdx];
      if (!inst || inst.type === 'voice') return;

      const circleStepIdx = (packedData >> 16) & 0x3F;
      const symbol = String.fromCharCode((packedData >> 9) & 0x7F);
      const isTuplet = ((packedData >> 1) & 1) === 1;
      const tickDurSec = timing.instantTickDurSec[tickInMeasure];
      const stepDurationSec = tickDurSec * 6;
      const activePattern = resolveActivePatternForMeasure(track, mutTracks, timing.measureIdx, soloPatternPlayId);
      const swingJitter = (((((pm.seqId * 31 + tickInMeasure) * 17 + track.id) & 0xFF) / 255) * 0.06 - 0.03) * stepDurationSec;
      const swingSec = computePercussionNoteSwing({
        activePattern, liveTrack: track, circleStepIdx, isTuplet, swingJitter,
        globalMode: globalSwing.mode, globalSwing, stepDurationSec,
        balancoAdherence: engineDeps.getTrackBalancoAdherence(track.id),
      });
      const microSec = (microPct / 100) * (tickDurSec * (timing.maxTicks / (activePattern ? activePattern.steps : 16))) * 0.5;
      const timeSec =
        timing.startTimeSec +
        timing.tickOffsetsSec[tickInMeasure] +
        microSec +
        engineDeps.getTrackUnisonDelaySec(track.id) +
        swingSec;

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
          pushTuple(absTick, flatCompiledSchedule[ptr + 1], flatCompiledSchedule[ptr + 2], flatCompiledSchedule[ptr + 3], flatCompiledSchedule, snap.variedTrackIds);
        }
      }
    }

    const vNotes = snap.variationNotes;
    for (let vPtr = 0; vPtr < vNotes.length; vPtr += 4) {
      const absTick = vNotes[vPtr];
      if (absTick >= measureStartTick && absTick < endTick) {
        pushTuple(absTick, vNotes[vPtr + 1], vNotes[vPtr + 2], vNotes[vPtr + 3], vNotes as any);
      }
    }
  }

  points.sort((a, b) => a.timeSec - b.timeSec);
  return points;
}
