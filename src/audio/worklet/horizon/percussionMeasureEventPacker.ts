/**
 * O Girador - Empaquetage des Événements de Mesure vers AudioWorklet (< 140 lignes)
 * - Convertit la grille compilée + variations en tuples `Float64Array` (stride 8).
 * - Preuve de couverture `(seqId, trackId)`, anti-flam `minRebuildFrame` et parité d'accordage.
 */

import { instrumentsConfig } from '../../../data';
import { InstrumentAudioConfig, StrokeMapping } from '../../../data/audioConfig';
import { computePercussionNoteSwing, resolveActivePatternForMeasure } from '../../../hooks/audio-sync/percussionSwingHelper';
import { GlobalSwing, Track } from '../../../types';
import { EngineVirtualStrokes } from '../../engine/engineVirtualStrokes';
import { WORKLET_EVENT_STRIDE } from '../percussionWorkletTypes';
import { MeasureTimingTable } from './percussionHorizonTiming';

export interface HorizonPackerEngineDeps {
  isTrackRoutedToWorklet(trackId: number | string, instrumentId: string): boolean;
  getTrackSlot(trackId: number | string): number;
  getTrackUnisonDelaySec(trackId: number | string): number;
  getTrackPitchRatio(trackId: number | string): number;
  selectRoundRobinFile(instId: string, stroke: StrokeMapping, timeSec: number, trackId: number): string;
  getSampleId(filePath: string): number;
  strokesMaps: Map<string, Map<string, StrokeMapping>>; configMap: Map<string, InstrumentAudioConfig>;
}

export interface PackMeasureEventsParams {
  seqId: number; timing: MeasureTimingTable; measureStartTick: number; tracks: Track[];
  soloPatternPlayId: number | null; globalSwing: GlobalSwing;
  flatCompiledSchedule: Float64Array | null; variedTrackIds: Set<number>;
  variationNotes: ArrayLike<number>; engineDeps: HorizonPackerEngineDeps;
  sampleRate: number; currentFrame: number; minRebuildFrame: number;
  previousEmittedNoteFrames?: Map<number, number>; activeBarulhoTracks: Set<number>;
}

export interface PackedMeasureHorizonResult {
  eventsData: Float64Array; eventCount: number; coveredTrackIds: Set<number>; emittedNoteFrames: Map<number, number>;
}

export function packMeasureHorizonEvents(p: PackMeasureEventsParams): PackedMeasureHorizonResult {
  const { seqId, timing, measureStartTick, tracks, soloPatternPlayId, globalSwing, flatCompiledSchedule, variedTrackIds, variationNotes, engineDeps, sampleRate, currentFrame, minRebuildFrame, previousEmittedNoteFrames, activeBarulhoTracks } = p;
  const coveredTrackIds = new Set<number>(), uncoveredTrackIds = new Set<number>();
  const emittedNoteFrames = new Map<number, number>(), stagedEvents: number[] = [];

  for (let i = 0; i < tracks.length; i++) {
    const t = tracks[i], inst = t ? instrumentsConfig[t.instrumentIdx] : undefined;
    if (t && inst && !t.isBusFolder && !t.isLinkFolder && engineDeps.isTrackRoutedToWorklet(t.id, inst.id)) coveredTrackIds.add(t.id);
  }

  const processNoteTuple = (absTick: number, packedData: number, velocity: number, microPct: number, skipSet?: Set<number>) => {
    const tickInMeasure = absTick - measureStartTick;
    if (tickInMeasure < 0 || tickInMeasure >= timing.maxTicks) return;
    const trackIdx = (packedData >> 22) & 0x3FF;
    const liveTrack = tracks[trackIdx];
    if (!liveTrack || (skipSet && skipSet.has(liveTrack.id)) || !coveredTrackIds.has(liveTrack.id)) return;
    const inst = instrumentsConfig[liveTrack.instrumentIdx];
    if (!inst) return;

    const circleStepIdx = (packedData >> 16) & 0x3F;
    const strokeCharCode = (packedData >> 9) & 0x7F;
    const decayPct = (packedData >> 2) & 0x7F;
    const isTuplet = ((packedData >> 1) & 1) === 1;
    const strokeSymbol = String.fromCharCode(strokeCharCode);
    const stroke = EngineVirtualStrokes.resolveStroke(engineDeps.strokesMaps, inst.id, strokeSymbol);
    if (!stroke) return;

    const tickDurSec = timing.instantTickDurSec[tickInMeasure];
    const stepDurationSec = tickDurSec * 6;
    const activePattern = resolveActivePatternForMeasure(liveTrack, tracks, timing.measureIdx, soloPatternPlayId);
    const swingJitter = (((((seqId * 31 + tickInMeasure) * 17 + liveTrack.id) & 0xFF) / 255) * 0.06 - 0.03) * stepDurationSec;
    const swingSec = computePercussionNoteSwing({
      activePattern, liveTrack, circleStepIdx, isTuplet, swingJitter, globalMode: globalSwing.mode, globalSwing, stepDurationSec,
    });
    const stepCount = activePattern ? activePattern.steps : 16;
    const microSec = (microPct / 100) * (tickDurSec * (timing.maxTicks / stepCount)) * 0.5;
    const unisonSec = engineDeps.getTrackUnisonDelaySec(liveTrack.id);
    const rawFrame = Math.round((timing.startTimeSec + timing.tickOffsetsSec[tickInMeasure] + swingSec + microSec + unisonSec) * sampleRate);

    const noteUid = ((tickInMeasure & 0xFF) << 22) | (packedData >>> 9);
    const oldFrame = previousEmittedNoteFrames?.get(noteUid);
    if (minRebuildFrame > 0 && oldFrame !== undefined && oldFrame < minRebuildFrame) {
      emittedNoteFrames.set(noteUid, oldFrame); return;
    }
    let triggerFrame = rawFrame;
    if (minRebuildFrame > 0) {
      if (rawFrame >= currentFrame && rawFrame < minRebuildFrame) triggerFrame = minRebuildFrame;
      else if (rawFrame < minRebuildFrame) return;
    } else if (rawFrame < currentFrame - Math.round(0.015 * sampleRate)) return;
    else if (rawFrame < currentFrame) triggerFrame = currentFrame;

    const filePath = engineDeps.selectRoundRobinFile(inst.id, stroke, triggerFrame / sampleRate, liveTrack.id);
    const sampleId = engineDeps.getSampleId(filePath);
    if (sampleId < 0) { uncoveredTrackIds.add(liveTrack.id); return; }

    emittedNoteFrames.set(noteUid, triggerFrame);
    const isLeftRufada = strokeSymbol === 'r';
    const finalVelocity = isLeftRufada ? velocity * 0.88 : velocity;
    const strokeBaseGain = (stroke as any).baseGain ?? 1.0;
    const trackPitch = engineDeps.getTrackPitchRatio(liveTrack.id) || 1.0;
    const pitchNuance = stroke.isBarulho ? (1.0 / trackPitch) : (isLeftRufada ? 0.985 : 1.0);
    const wasBarulho = activeBarulhoTracks.has(liveTrack.id);
    if (stroke.isBarulho) activeBarulhoTracks.add(liveTrack.id);
    else if (wasBarulho) activeBarulhoTracks.delete(liveTrack.id);
    const isChoke = strokeSymbol === 'p' || strokeSymbol === 'P' || stroke.symbol === 'p' || stroke.symbol === 'P' || (!stroke.isBarulho && wasBarulho);
    const flags = ((seqId & 0x7FFFFFFF) << 1) | (isChoke ? 1 : 0);

    stagedEvents.push(
      triggerFrame, liveTrack.id, engineDeps.getTrackSlot(liveTrack.id),
      sampleId, finalVelocity, strokeBaseGain, decayPct / 100, pitchNuance, flags
    );
  };

  const endTick = measureStartTick + timing.maxTicks;
  if (flatCompiledSchedule && flatCompiledSchedule.length > 0) {
    let lo = 0, hi = (flatCompiledSchedule.length >>> 2) - 1;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (flatCompiledSchedule[mid << 2] < measureStartTick) lo = mid + 1; else hi = mid;
    }
    for (let ptr = lo << 2; ptr < flatCompiledSchedule.length; ptr += 4) {
      const absTick = flatCompiledSchedule[ptr];
      if (absTick >= endTick) break;
      if (absTick >= measureStartTick) processNoteTuple(absTick, flatCompiledSchedule[ptr + 1], flatCompiledSchedule[ptr + 2], flatCompiledSchedule[ptr + 3], variedTrackIds);
    }
  }
  for (let vPtr = 0; vPtr < variationNotes.length; vPtr += 4) {
    const absTick = variationNotes[vPtr];
    if (absTick >= measureStartTick && absTick < endTick) processNoteTuple(absTick, variationNotes[vPtr + 1], variationNotes[vPtr + 2], variationNotes[vPtr + 3]);
  }

  if (uncoveredTrackIds.size > 0) {
    uncoveredTrackIds.forEach((id) => coveredTrackIds.delete(id));
    const filtered: number[] = [];
    for (let i = 0; i < stagedEvents.length; i += WORKLET_EVENT_STRIDE) {
      if (!uncoveredTrackIds.has(stagedEvents[i + 1])) {
        for (let k = 0; k < WORKLET_EVENT_STRIDE; k++) filtered.push(stagedEvents[i + k]);
      }
    }
    return { eventsData: new Float64Array(filtered), eventCount: filtered.length / WORKLET_EVENT_STRIDE, coveredTrackIds, emittedNoteFrames };
  }
  return { eventsData: new Float64Array(stagedEvents), eventCount: stagedEvents.length / WORKLET_EVENT_STRIDE, coveredTrackIds, emittedNoteFrames };
}
