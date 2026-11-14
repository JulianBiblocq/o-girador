/**
 * O Girador - Empaquetage des Événements de Mesure vers AudioWorklet (< 140 lignes)
 * - Convertit la grille compilée + variations en tuples `Float64Array` (stride 9).
 * - Supporte Barulho continu (`B`, `b`, `/`, `.`) avec coordonnées `(measureIdx, stepIdx)` et rampes multi-pas.
 */
import { instrumentsConfig } from '../../../data';
import { InstrumentAudioConfig, StrokeMapping } from '../../../data/audioConfig';
import { computePercussionNoteSwing, resolveActivePatternForMeasure } from '../../../hooks/audio-sync/percussionSwingHelper';
import { GlobalSwing, Track } from '../../../types';
import {
  BarulhoLookaheadPoint, DEFAULT_BARULHO_DOT_STOP_SEC, findBarulhoLookaheadIndex,
  packBarulhoOriginCoord, resolveSlashFadeOutRampSec, resolveSoftBarulhoRampSpec,
} from '../../barulho/barulhoRampPlanner';
import { ALFAIA_INSTRUMENTS } from '../../engine/engineTypes';
import { EngineVirtualStrokes } from '../../engine/engineVirtualStrokes';
import { WORKLET_EVENT_STRIDE } from '../percussionWorkletTypes';
import {
  BARULHO_OP_ATTACK_B, BARULHO_OP_NONE, BARULHO_OP_SOFT_B,
  packWorkletEventFlags, resolveAlfaiaPhysicsSpec, resolveBarulhoOpForSymbol,
} from '../processor/workletSkinPhysics';
import { MeasureTimingTable } from './percussionHorizonTiming';

export interface HorizonPackerEngineDeps {
  isTrackRoutedToWorklet(trackId: number | string, instrumentId: string): boolean;
  getTrackSlot(trackId: number | string): number; getTrackUnisonDelaySec(trackId: number | string): number;
  getTrackPitchRatio(trackId: number | string): number; getSampleId(filePath: string): number;
  selectRoundRobinFile(instId: string, stroke: StrokeMapping, timeSec: number, trackId: number): string;
  strokesMaps: Map<string, Map<string, StrokeMapping>>; configMap: Map<string, InstrumentAudioConfig>;
}

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

  const processNoteTuple = (absTick: number, packedData: number, velocity: number, microPct: number, skipSet?: Set<number>) => {
    const tickInMeasure = absTick - measureStartTick;
    if (tickInMeasure < 0 || tickInMeasure >= timing.maxTicks) return;
    const liveTrack = tracks[(packedData >> 22) & 0x3FF];
    if (!liveTrack || (skipSet && skipSet.has(liveTrack.id)) || !coveredTrackIds.has(liveTrack.id)) return;
    const inst = instrumentsConfig[liveTrack.instrumentIdx];
    if (!inst) return;

    const circleStepIdx = (packedData >> 16) & 0x3F, strokeSymbol = String.fromCharCode((packedData >> 9) & 0x7F);
    const decayPct = (packedData >> 2) & 0x7F, isTuplet = ((packedData >> 1) & 1) === 1, isSecondStroke = (packedData & 1) === 1;
    const tickDurSec = timing.instantTickDurSec[tickInMeasure], stepDurationSec = tickDurSec * 6;
    const activePattern = resolveActivePatternForMeasure(liveTrack, tracks, timing.measureIdx, soloPatternPlayId);
    const swingJitter = (((((seqId * 31 + tickInMeasure) * 17 + liveTrack.id) & 0xFF) / 255) * 0.06 - 0.03) * stepDurationSec;
    const swingSec = computePercussionNoteSwing({ activePattern, liveTrack, circleStepIdx, isTuplet, swingJitter, globalMode: globalSwing.mode, globalSwing, stepDurationSec });
    const microSec = (microPct / 100) * (tickDurSec * (timing.maxTicks / (activePattern ? activePattern.steps : 16))) * 0.5;
    const baseTimeSec = timing.startTimeSec + timing.tickOffsetsSec[tickInMeasure] + microSec + engineDeps.getTrackUnisonDelaySec(liveTrack.id);
    const rawFrame = Math.round((baseTimeSec + swingSec) * sampleRate);

    const noteUid = ((tickInMeasure & 0xFF) << 22) | (packedData >>> 9);
    const oldFrame = previousEmittedNoteFrames?.get(noteUid);
    if (minRebuildFrame > 0 && oldFrame !== undefined && oldFrame < minRebuildFrame) { emittedNoteFrames.set(noteUid, oldFrame); return; }
    let triggerFrame = rawFrame;
    if (minRebuildFrame > 0) {
      if (rawFrame >= currentFrame && rawFrame < minRebuildFrame) triggerFrame = minRebuildFrame;
      else if (rawFrame < minRebuildFrame) return;
    } else if (rawFrame < currentFrame - Math.round(0.015 * sampleRate)) return;
    else if (rawFrame < currentFrame) triggerFrame = currentFrame;

    const isAlfaia = ALFAIA_INSTRUMENTS.has(inst.id), isCalibrated = Boolean(engineDeps.configMap.get(inst.id)?.calibratedStudioBank);
    if (strokeSymbol === '/' || strokeSymbol === '.') {
      const barOp = resolveBarulhoOpForSymbol(strokeSymbol, false);
      const ptIdx = strokeSymbol === '/' ? findBarulhoLookaheadIndex(lookaheadPoints, liveTrack.id, baseTimeSec, '/') : -1;
      const rampSec = strokeSymbol === '/' ? (ptIdx >= 0 && lookaheadPoints ? resolveSlashFadeOutRampSec(lookaheadPoints, ptIdx) : 0.450) : DEFAULT_BARULHO_DOT_STOP_SEC;
      const { chokeMode, voiceClass } = resolveAlfaiaPhysicsSpec(isAlfaia, strokeSymbol, true);
      emittedNoteFrames.set(noteUid, triggerFrame);
      stagedEvents.push(triggerFrame, liveTrack.id, engineDeps.getTrackSlot(liveTrack.id), 0, 0, 1.0, rampSec, 1.0, packWorkletEventFlags(seqId, chokeMode, voiceClass, isCalibrated, false, barOp));
      return;
    }

    let stroke = EngineVirtualStrokes.resolveStroke(engineDeps.strokesMaps, inst.id, strokeSymbol);
    if (!stroke) return;
    const trigTimeSec = triggerFrame / sampleRate;
    let filePath = engineDeps.selectRoundRobinFile(inst.id, stroke, trigTimeSec, liveTrack.id);
    let sampleId = engineDeps.getSampleId(filePath), isFallback80ms = false;
    if (sampleId < 0 && isAlfaia && (strokeSymbol === 'A' || strokeSymbol === 'a')) {
      const fbE = EngineVirtualStrokes.resolveStroke(engineDeps.strokesMaps, inst.id, 'e');
      if (fbE) { stroke = fbE; isFallback80ms = true; filePath = engineDeps.selectRoundRobinFile(inst.id, fbE, trigTimeSec, liveTrack.id); sampleId = engineDeps.getSampleId(filePath); }
    }
    if (sampleId < 0) { uncoveredTrackIds.add(liveTrack.id); return; }

    emittedNoteFrames.set(noteUid, triggerFrame);
    const barOp = resolveBarulhoOpForSymbol(strokeSymbol, Boolean(stroke.isBarulho));
    let finalVel = strokeSymbol === 'r' ? velocity * 0.88 : velocity, metaOrDecay = decayPct / 100;
    if (barOp === BARULHO_OP_ATTACK_B) metaOrDecay = packBarulhoOriginCoord(timing.measureIdx, circleStepIdx, isSecondStroke);
    else if (barOp === BARULHO_OP_SOFT_B) {
      const ptIdx = findBarulhoLookaheadIndex(lookaheadPoints, liveTrack.id, baseTimeSec, 'b');
      const spec = ptIdx >= 0 && lookaheadPoints ? resolveSoftBarulhoRampSpec(lookaheadPoints, ptIdx) : { rampSec: 0.140, targetVelocity: finalVel };
      metaOrDecay = spec.rampSec; finalVel = spec.targetVelocity;
    }

    const pitchNuance = stroke.isBarulho ? (1.0 / (engineDeps.getTrackPitchRatio(liveTrack.id) || 1.0)) : (strokeSymbol === 'r' ? 0.985 : 1.0);
    const { chokeMode, voiceClass } = resolveAlfaiaPhysicsSpec(isAlfaia, strokeSymbol, barOp !== BARULHO_OP_NONE);
    stagedEvents.push(triggerFrame, liveTrack.id, engineDeps.getTrackSlot(liveTrack.id), sampleId, finalVel, stroke.baseGain ?? 1.0, metaOrDecay, pitchNuance, packWorkletEventFlags(seqId, chokeMode, voiceClass, isCalibrated, isFallback80ms, barOp));
  };

  const endTick = measureStartTick + timing.maxTicks;
  if (flatCompiledSchedule && flatCompiledSchedule.length > 0) {
    let lo = 0, hi = (flatCompiledSchedule.length >>> 2) - 1;
    while (lo < hi) { const mid = (lo + hi) >>> 1; if (flatCompiledSchedule[mid << 2] < measureStartTick) lo = mid + 1; else hi = mid; }
    for (let ptr = lo << 2; ptr < flatCompiledSchedule.length; ptr += 4) {
      if (flatCompiledSchedule[ptr] >= endTick) break;
      if (flatCompiledSchedule[ptr] >= measureStartTick) processNoteTuple(flatCompiledSchedule[ptr], flatCompiledSchedule[ptr + 1], flatCompiledSchedule[ptr + 2], flatCompiledSchedule[ptr + 3], variedTrackIds);
    }
  }
  for (let vPtr = 0; vPtr < variationNotes.length; vPtr += 4) {
    if (variationNotes[vPtr] >= measureStartTick && variationNotes[vPtr] < endTick) processNoteTuple(variationNotes[vPtr], variationNotes[vPtr + 1], variationNotes[vPtr + 2], variationNotes[vPtr + 3]);
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
