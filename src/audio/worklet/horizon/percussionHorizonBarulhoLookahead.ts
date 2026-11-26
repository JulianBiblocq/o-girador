/**
 * percussionHorizonBarulhoLookahead.ts — Extraction chronologique multi-mesures `[M..M+3]`
 * avec mise en cache par `(seqId, measureIdx, startFrame, endFrame)` (< 120 lignes).
 */
import { instrumentsConfig } from '../../../data';
import { computePercussionNoteSwing, resolveActivePatternForMeasure } from '../../../hooks/audio-sync/percussionSwingHelper';
import { GlobalSwing, Track } from '../../../types';
import { getRodaStepDurationTicks } from '../../../utils/rodaTimeSigGeometry';
import { BarulhoLookaheadPoint, packBarulhoOriginCoord } from '../../barulho/barulhoRampPlanner';
import { ProjectedHorizonMeasure } from './percussionHorizonProjection';
import { HorizonPackerEngineDeps } from './percussionHorizonTypes';
import { resolveTrackFromPackedData } from '../../../workers/compiler/compiledTrackIdResolver';

export interface MeasureVariationSnapshotLike {
  variedTrackIds: Set<number>;
  variationNotes: ArrayLike<number>;
}

interface CachedMeasureBarulho {
  key: string;
  scheduleRef: Float64Array | null;
  tracksRef: readonly Track[];
  snapRef: MeasureVariationSnapshotLike;
  points: BarulhoLookaheadPoint[];
}

const barulhoCacheBySeq = new Map<number, CachedMeasureBarulho>();

export function clearBarulhoLookaheadCache(): void {
  barulhoCacheBySeq.clear();
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
  const allPoints: BarulhoLookaheadPoint[] = [];
  const mutTracks = tracks as Track[];
  const swingSig = `${globalSwing.mode}:${globalSwing.swingIntensity ?? 100}:${(globalSwing.customOffsets || []).join(',')}:${soloPatternPlayId ?? ''}`;

  if (projected.length > 0) {
    const minSeq = projected[0].seqId - 2;
    for (const k of barulhoCacheBySeq.keys()) if (k < minSeq) barulhoCacheBySeq.delete(k);
  }

  for (let m = 0; m < projected.length; m++) {
    const pm = projected[m], snap = snaps[m];
    const { timing, measureStartTick } = pm;
    const cacheKey = `${pm.measureIdx}|${measureStartTick}|${timing.startFrame}|${timing.endFrame}|${swingSig}`;
    const hit = pm.seqId > 0 ? barulhoCacheBySeq.get(pm.seqId) : undefined;
    if (hit && hit.key === cacheKey && hit.scheduleRef === flatCompiledSchedule && hit.tracksRef === tracks && hit.snapRef === snap) {
      for (let i = 0; i < hit.points.length; i++) allPoints.push(hit.points[i]);
      continue;
    }

    const measurePts: BarulhoLookaheadPoint[] = [];
    const endTick = measureStartTick + timing.maxTicks;
    const apitoTracksWithHits = new Set<number>();

    const pushTuple = (absTick: number, packedData: number, velocity: number, microPct: number, sourceSchedule: object | null, skipSet?: Set<number>) => {
      const tickInMeasure = absTick - measureStartTick;
      if (tickInMeasure < 0 || tickInMeasure >= timing.maxTicks) return;
      const track = resolveTrackFromPackedData(packedData, tracks, sourceSchedule);
      if (!track || track.isBusFolder || track.isLinkFolder || (skipSet && skipSet.has(track.id))) return;
      const inst = instrumentsConfig[track.instrumentIdx];
      if (!inst || inst.type === 'voice') return;

      const circleStepIdx = (packedData >> 16) & 0x3F, symbol = String.fromCharCode((packedData >> 9) & 0x7F);
      const isTuplet = ((packedData >> 1) & 1) === 1, isSecondStroke = (packedData & 1) === 1;
      const tickDurSec = timing.instantTickDurSec[tickInMeasure];
      const baseStepAudioSec = timing.startTimeSec + timing.tickOffsetsSec[tickInMeasure];
      const activePattern = resolveActivePatternForMeasure(track, mutTracks, timing.measureIdx, soloPatternPlayId);
      const stepDurationSec = tickDurSec * getRodaStepDurationTicks(timing.timeSig, activePattern, circleStepIdx);
      const swingJitter = (((((pm.seqId * 31 + tickInMeasure) * 17 + track.id) & 0xFF) / 255) * 0.06 - 0.03) * stepDurationSec;
      const swingSec = computePercussionNoteSwing({
        activePattern, liveTrack: track, circleStepIdx, isTuplet, swingJitter,
        globalMode: globalSwing.mode, globalSwing, stepDurationSec,
        balancoAdherence: engineDeps.getTrackBalancoAdherence(track.id), baseStepAudioSec, timeSig: timing.timeSig,
      });
      const timeSec = baseStepAudioSec + (microPct / 100) * stepDurationSec * 0.5 + engineDeps.getTrackUnisonDelaySec(track.id) + swingSec;
      measurePts.push({ trackId: track.id, instId: inst.id, timeSec, symbol, velocity, stepDurationSec, originCoord: packBarulhoOriginCoord(timing.measureIdx, circleStepIdx, isSecondStroke), seqId: pm.seqId });
      apitoTracksWithHits.add(track.id);
    };

    if (flatCompiledSchedule && flatCompiledSchedule.length > 0) {
      let lo = 0, hi = (flatCompiledSchedule.length >>> 2) - 1;
      while (lo < hi) { const mid = (lo + hi) >>> 1; if (flatCompiledSchedule[mid << 2] < measureStartTick) lo = mid + 1; else hi = mid; }
      for (let ptr = lo << 2; ptr < flatCompiledSchedule.length; ptr += 4) {
        const absTick = flatCompiledSchedule[ptr];
        if (absTick >= endTick) break;
        if (absTick >= measureStartTick) pushTuple(absTick, flatCompiledSchedule[ptr + 1], flatCompiledSchedule[ptr + 2], flatCompiledSchedule[ptr + 3], flatCompiledSchedule, snap.variedTrackIds);
      }
    }
    const vNotes = snap.variationNotes;
    for (let vPtr = 0; vPtr < vNotes.length; vPtr += 4) {
      const absTick = vNotes[vPtr];
      if (absTick >= measureStartTick && absTick < endTick) pushTuple(absTick, vNotes[vPtr + 1], vNotes[vPtr + 2], vNotes[vPtr + 3], vNotes as any);
    }
    for (let ti = 0; ti < tracks.length; ti++) {
      const tr = tracks[ti], inst = tr ? instrumentsConfig[tr.instrumentIdx] : undefined;
      if (!tr || tr.isBusFolder || tr.isLinkFolder || inst?.id !== 'apito' || apitoTracksWithHits.has(tr.id)) continue;
      const actPtn = resolveActivePatternForMeasure(tr, mutTracks, timing.measureIdx, soloPatternPlayId);
      const hasAny = Boolean(actPtn?.activeSteps?.some((s: any) => Array.isArray(s) ? s.some((x: any) => x && x !== '0') : Boolean(s && s !== '0' && s !== 0)));
      if (!hasAny) measurePts.push({ trackId: tr.id, instId: 'apito', timeSec: timing.startTimeSec, symbol: '/', velocity: 0, stepDurationSec: 0.15, seqId: pm.seqId });
    }
    if (pm.seqId > 0) barulhoCacheBySeq.set(pm.seqId, { key: cacheKey, scheduleRef: flatCompiledSchedule, tracksRef: tracks, snapRef: snap, points: measurePts });
    for (let i = 0; i < measurePts.length; i++) allPoints.push(measurePts[i]);
  }

  allPoints.sort((a, b) => a.timeSec - b.timeSec);
  return allPoints;
}
