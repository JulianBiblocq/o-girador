/**
 * O Girador - Empaquetage des Événements de Mesure vers AudioWorklet (< 115 lignes)
 * - Convertit la grille compilée + variations en tuples `Float64Array` (stride 9) avec tempérament de section.
 */
import { instrumentsConfig } from '../../../data';
import { computePercussionNoteSwing, resolveActivePatternForMeasure } from '../../../hooks/audio-sync/percussionSwingHelper';
import { GlobalSwing, Track } from '../../../types';
import { BarulhoLookaheadPoint } from '../../barulho/barulhoRampPlanner';
import { WORKLET_EVENT_STRIDE } from '../percussionWorkletTypes';
import { MeasureTimingTable } from './percussionHorizonTiming';
import { HorizonPackerEngineDeps } from './percussionHorizonTypes';
import { stageMeasureStrokeEvent } from './workletStrokeEventStager';
import { resolveTrackFromPackedData } from '../../../workers/compiler/compiledTrackIdResolver';

export type { HorizonPackerEngineDeps };

export interface PackMeasureEventsParams {
  seqId: number; timing: MeasureTimingTable; measureStartTick: number; tracks: Track[];
  soloPatternPlayId: number | null; globalSwing: GlobalSwing; flatCompiledSchedule: Float64Array | null;
  variedTrackIds: Set<number>; variationNotes: ArrayLike<number>; engineDeps: HorizonPackerEngineDeps;
  sampleRate: number; currentFrame: number; minRebuildFrame: number;
  previousEmittedNoteFrames?: Map<number, number>; lookaheadPoints?: readonly BarulhoLookaheadPoint[];
}

export interface PackedMeasureHorizonResult {
  eventsData: Float64Array; eventCount: number; coveredTrackIds: Set<number>; emittedNoteFrames: Map<number, number>;
}

export function packMeasureHorizonEvents(p: PackMeasureEventsParams): PackedMeasureHorizonResult {
  const { seqId, timing, measureStartTick, tracks, soloPatternPlayId, globalSwing, flatCompiledSchedule, variedTrackIds, variationNotes, engineDeps, sampleRate, currentFrame, minRebuildFrame, previousEmittedNoteFrames, lookaheadPoints } = p;
  const coveredTrackIds = new Set<number>(), uncoveredTrackIds = new Set<number>();
  const emittedNoteFrames = new Map<number, number>(), stagedEvents: number[] = [];

  for (let i = 0; i < tracks.length; i++) {
    const t = tracks[i], inst = t ? instrumentsConfig[t.instrumentIdx] : undefined;
    if (t && inst && !t.isBusFolder && !t.isLinkFolder && engineDeps.isTrackRoutedToWorklet(t.id, inst.id)) coveredTrackIds.add(t.id);
  }

  const processNoteTuple = (absTick: number, packedData: number, velocity: number, microPct: number, sourceSchedule: object | null, skipSet?: Set<number>) => {
    const tickInMeasure = absTick - measureStartTick;
    if (tickInMeasure < 0 || tickInMeasure >= timing.maxTicks) return;
    const liveTrack = resolveTrackFromPackedData(packedData, tracks, sourceSchedule);
    if (!liveTrack || (skipSet && skipSet.has(liveTrack.id)) || !coveredTrackIds.has(liveTrack.id)) return;
    const inst = instrumentsConfig[liveTrack.instrumentIdx];
    if (!inst) return;

    const circleStepIdx = (packedData >> 16) & 0x3F, strokeSymbol = String.fromCharCode((packedData >> 9) & 0x7F);
    const decayPct = (packedData >> 2) & 0x7F, isTuplet = ((packedData >> 1) & 1) === 1, isSecondStroke = (packedData & 1) === 1;
    const tickDurSec = timing.instantTickDurSec[tickInMeasure], stepDurationSec = tickDurSec * 6;
    const activePattern = resolveActivePatternForMeasure(liveTrack, tracks, timing.measureIdx, soloPatternPlayId);
    const swingJitter = (((((seqId * 31 + tickInMeasure) * 17 + liveTrack.id) & 0xFF) / 255) * 0.06 - 0.03) * stepDurationSec;
    const swingSec = computePercussionNoteSwing({
      activePattern, liveTrack, circleStepIdx, isTuplet, swingJitter,
      globalMode: globalSwing.mode, globalSwing, stepDurationSec,
      balancoAdherence: engineDeps.getTrackBalancoAdherence(liveTrack.id),
    });
    const microSec = (microPct / 100) * (tickDurSec * (timing.maxTicks / (activePattern ? activePattern.steps : 16))) * 0.5;
    const swungTimeSec = timing.startTimeSec + timing.tickOffsetsSec[tickInMeasure] + microSec + engineDeps.getTrackUnisonDelaySec(liveTrack.id) + swingSec;
    const rawFrame = Math.round(swungTimeSec * sampleRate);

    const noteUid = ((tickInMeasure & 0xFF) << 22) | (packedData >>> 9);
    const oldFrame = previousEmittedNoteFrames?.get(noteUid);
    if (minRebuildFrame > 0 && oldFrame !== undefined && oldFrame < minRebuildFrame) { emittedNoteFrames.set(noteUid, oldFrame); return; }
    let triggerFrame = rawFrame;
    if (minRebuildFrame > 0) {
      if (rawFrame >= currentFrame && rawFrame < minRebuildFrame) triggerFrame = minRebuildFrame;
      else if (rawFrame < minRebuildFrame) return;
    } else if (rawFrame < currentFrame - Math.round(0.015 * sampleRate)) return;
    else if (rawFrame < currentFrame) triggerFrame = currentFrame;

    const res = stageMeasureStrokeEvent({
      seqId, measureIdx: timing.measureIdx, trackId: liveTrack.id, instId: inst.id, strokeSymbol,
      circleStepIdx, isSecondStroke, velocity, decayPct, triggerFrame, swungTimeSec, sampleRate,
      engineDeps, lookaheadPoints, stagedEvents,
    });
    if (res === 'uncovered') { uncoveredTrackIds.add(liveTrack.id); return; }
    if (res === 'ok') emittedNoteFrames.set(noteUid, triggerFrame);
  };

  const endTick = measureStartTick + timing.maxTicks;
  if (flatCompiledSchedule && flatCompiledSchedule.length > 0) {
    let lo = 0, hi = (flatCompiledSchedule.length >>> 2) - 1;
    while (lo < hi) { const mid = (lo + hi) >>> 1; if (flatCompiledSchedule[mid << 2] < measureStartTick) lo = mid + 1; else hi = mid; }
    for (let ptr = lo << 2; ptr < flatCompiledSchedule.length; ptr += 4) {
      if (flatCompiledSchedule[ptr] >= endTick) break;
      if (flatCompiledSchedule[ptr] >= measureStartTick) processNoteTuple(flatCompiledSchedule[ptr], flatCompiledSchedule[ptr + 1], flatCompiledSchedule[ptr + 2], flatCompiledSchedule[ptr + 3], flatCompiledSchedule, variedTrackIds);
    }
  }
  for (let vPtr = 0; vPtr < variationNotes.length; vPtr += 4) {
    if (variationNotes[vPtr] >= measureStartTick && variationNotes[vPtr] < endTick) processNoteTuple(variationNotes[vPtr], variationNotes[vPtr + 1], variationNotes[vPtr + 2], variationNotes[vPtr + 3], variationNotes as any);
  }

  if (uncoveredTrackIds.size > 0) {
    uncoveredTrackIds.forEach((id) => coveredTrackIds.delete(id));
    const filtered: number[] = [];
    for (let i = 0; i < stagedEvents.length; i += WORKLET_EVENT_STRIDE) {
      if (!uncoveredTrackIds.has(stagedEvents[i + 1])) { for (let k = 0; k < WORKLET_EVENT_STRIDE; k++) filtered.push(stagedEvents[i + k]); }
    }
    return { eventsData: new Float64Array(filtered), eventCount: filtered.length / WORKLET_EVENT_STRIDE, coveredTrackIds, emittedNoteFrames };
  }
  return { eventsData: new Float64Array(stagedEvents), eventCount: stagedEvents.length / WORKLET_EVENT_STRIDE, coveredTrackIds, emittedNoteFrames };
}
