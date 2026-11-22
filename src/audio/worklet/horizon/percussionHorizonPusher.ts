/**
 * O Girador - Planificateur d'Horizon AudioWorklet (Fenêtre Glissante 3 Mesures, < 120 lignes)
 * - Pousse `[M, M+1, M+2]` dans `PercussionWorkletManager` avec lookahead Barulho multi-mesures (incluant `swingSec`).
 */

import { getOrRollMeasureVariationForHorizon, invalidateFutureVariationSnapshots, syncCurrentVariationOverrideFromSeq } from '../../../hooks/audio-sync/liveVariationLookaheadEngine';
import { useSequencerStore } from '../../../stores/useSequencerStore';
import { registerLiveBalancoHorizonRebuilder } from '../../groove/liveBalancoMorph';
import { buildHorizonBarulhoLookaheadPoints } from './percussionHorizonBarulhoLookahead';
import { packMeasureHorizonEvents } from './percussionMeasureEventPacker';
import { projectHorizonMeasures } from './percussionHorizonProjection';
import { HorizonEngineLike, HorizonPusherContext } from './percussionHorizonTypes';

export type { HorizonEngineLike, HorizonPusherContext };

interface PushedMeasureEntry {
  seqId: number; measureIdx: number; startTimeSec: number; endTimeSec: number;
  startFrame: number; endFrame: number; coveredTrackIds: Set<number>; emittedNoteFrames: Map<number, number>;
}

let currentMeasureSeqId = 0, activeMeasureIdx = -1, activeMeasureStartFrame = 0;
let lastHorizonCtx: HorizonPusherContext | null = null;
const pushedBySeqId = new Map<number, PushedMeasureEntry>();

export function getCurrentWorkletMeasureSeqId(): number { return currentMeasureSeqId; }
export function resetWorkletHorizonState(): void {
  currentMeasureSeqId = 0; activeMeasureIdx = -1; activeMeasureStartFrame = 0;
  lastHorizonCtx = null; pushedBySeqId.clear();
}
export function isTrackCoveredInWorkletHorizon(measureIdx: number, trackId: number): boolean {
  const entry = pushedBySeqId.get(currentMeasureSeqId);
  return Boolean(entry && entry.measureIdx === measureIdx && entry.coveredTrackIds.has(trackId));
}

function projectAndPushHorizon(ctx: HorizonPusherContext, minRebuildFrame: number): void {
  const engine = ctx.engine;
  if (!engine || !engine.workletReady) return;
  const tracks = ctx.tracksRef.current;
  const seqState = useSequencerStore.getState(), sampleRate = engine.getSampleRate();
  const activeBpm = ctx.speedTrainerCurrentBpmRef?.current || ctx.measureBpmsRef.current?.[activeMeasureIdx] || ctx.defaultBpm || seqState.bpm || 100;
  engine.syncTracksToWorklet(tracks, activeBpm);
  const currentFrame = Math.floor(engine.getCurrentTime() * sampleRate);

  const projected = projectHorizonMeasures({
    baseSeqId: currentMeasureSeqId, startMeasureIdx: activeMeasureIdx,
    startFrame: activeMeasureStartFrame, sampleRate,
    totalMeasures: ctx.totalMeasuresRef.current || 1,
    measureTimeSigs: ctx.measureTimeSigsRef.current, measureBpms: ctx.measureBpmsRef.current,
    measureBpmTransitions: ctx.measureBpmTransitions ?? seqState.measureBpmTransitions ?? {},
    fallbackBpm: ctx.defaultBpm ?? seqState.bpm ?? 100,
    soloPatternPlayId: ctx.soloPatternPlayIdRef.current,
    queuedMeasure: ctx.pendingMeasureRef?.current ?? seqState.queuedMeasure ?? null,
    isLooping: ctx.isLoopingRef.current,
    loopMode: ctx.loopModeRef?.current ?? seqState.loopMode ?? 'infinite',
    currentLoopIteration: ctx.currentLoopIterationRef?.current ?? seqState.currentLoopIteration ?? 1,
    isLoopRegionActive: ctx.isLoopRegionActiveRef.current,
    loopStartMeasure: ctx.loopStartRef.current, loopEndMeasure: ctx.loopEndRef.current,
    isLoopExitRequested: Boolean(ctx.isLoopExitRequestedRef?.current || seqState.isLoopExitRequested),
    isLoopBypassed: Boolean(seqState.isLoopBypassed),
    isSpeedTrainerActive: Boolean(seqState.isSpeedTrainerActive),
    speedTrainerBpm: ctx.speedTrainerCurrentBpmRef?.current || seqState.speedTrainerCurrentBpm,
    speedTrainerTourCount: seqState.speedTrainerTourCount || 0,
    speedTrainerConfig: seqState.speedTrainerConfig,
  });

  const snaps = projected.map((pm) => getOrRollMeasureVariationForHorizon({
    seqId: pm.seqId, measureIdx: pm.measureIdx, measureStartTick: pm.measureStartTick,
    timeSig: ctx.measureTimeSigsRef.current?.[pm.measureIdx] || '4/4',
    tracks, soloPatternPlayId: ctx.soloPatternPlayIdRef.current, soloPatternVariationId: ctx.soloPatternVariationIdRef.current,
  }));
  const lookaheadPoints = buildHorizonBarulhoLookaheadPoints(
    projected, snaps, tracks, ctx.flatCompiledScheduleRef.current, engine,
    ctx.soloPatternPlayIdRef.current, ctx.globalSwingRef.current
  );

  for (let i = 0; i < projected.length; i++) {
    const pm = projected[i], snap = snaps[i], existing = pushedBySeqId.get(pm.seqId);
    if (minRebuildFrame <= 0 && existing && existing.measureIdx === pm.measureIdx) continue;
    if (minRebuildFrame > 0 && existing && pm.timing.endFrame <= minRebuildFrame) continue;

    const packed = packMeasureHorizonEvents({
      seqId: pm.seqId, timing: pm.timing, measureStartTick: pm.measureStartTick, tracks,
      soloPatternPlayId: ctx.soloPatternPlayIdRef.current, globalSwing: ctx.globalSwingRef.current,
      flatCompiledSchedule: ctx.flatCompiledScheduleRef.current,
      variedTrackIds: snap.variedTrackIds, variationNotes: snap.variationNotes,
      variedPatternsByTrackId: snap.variedPatternsByTrackId,
      engineDeps: engine, sampleRate, currentFrame, minRebuildFrame,
      previousEmittedNoteFrames: existing?.emittedNoteFrames, lookaheadPoints,
    });
    if (packed.eventCount > 0) engine.pushWorkletEvents(packed.eventsData, packed.eventCount);
    pushedBySeqId.set(pm.seqId, {
      seqId: pm.seqId, measureIdx: pm.measureIdx,
      startTimeSec: pm.timing.startTimeSec, endTimeSec: pm.timing.startTimeSec + pm.timing.durationSec,
      startFrame: pm.timing.startFrame, endFrame: pm.timing.endFrame,
      coveredTrackIds: packed.coveredTrackIds, emittedNoteFrames: packed.emittedNoteFrames,
    });
  }
}

export function pushWorkletHorizonAtMeasureBoundary(
  measureStartTimeSec: number, currentMeasureIdx: number, ctx: HorizonPusherContext, minStartFrame = 0
): number {
  lastHorizonCtx = ctx;
  const sampleRate = ctx.engine?.getSampleRate() ?? 48000, nextSeqId = currentMeasureSeqId + 1;
  const prePushed = minStartFrame <= 0 ? pushedBySeqId.get(nextSeqId) : undefined;
  currentMeasureSeqId = nextSeqId; activeMeasureIdx = currentMeasureIdx;
  if (prePushed && prePushed.measureIdx === currentMeasureIdx) activeMeasureStartFrame = prePushed.startFrame;
  else { activeMeasureStartFrame = Math.round(measureStartTimeSec * sampleRate); pushedBySeqId.clear(); }
  for (const seq of pushedBySeqId.keys()) if (seq < currentMeasureSeqId - 1) pushedBySeqId.delete(seq);
  projectAndPushHorizon(ctx, minStartFrame);
  return currentMeasureSeqId;
}

export function rebuildWorkletHorizonFromNow(reason: 'edit' | 'bpm' | 'queued' | 'sample' | 'solo' = 'edit'): void {
  if (!lastHorizonCtx || currentMeasureSeqId <= 0) return;
  const engine = lastHorizonCtx.engine;
  if (!engine || !engine.workletReady || !engine.getIsPlaying()) return;
  const sampleRate = engine.getSampleRate(), curEntry = pushedBySeqId.get(currentMeasureSeqId);
  const minSafeFrame = Math.ceil((engine.getCurrentTime() + 0.015) * sampleRate);
  const safeRebuildFrame = reason === 'queued' && curEntry ? Math.max(minSafeFrame, curEntry.endFrame) : minSafeFrame;
  if (reason === 'solo') {
    invalidateFutureVariationSnapshots(currentMeasureSeqId, true);
    for (const seq of pushedBySeqId.keys()) if (seq >= currentMeasureSeqId) pushedBySeqId.delete(seq);
  } else if (reason === 'queued' || reason === 'edit') {
    invalidateFutureVariationSnapshots(currentMeasureSeqId);
  }
  engine.purgeWorkletFromFrame(safeRebuildFrame);
  engine.purgeRoundRobinFromTime(safeRebuildFrame / sampleRate);
  projectAndPushHorizon(lastHorizonCtx, safeRebuildFrame);
  if (reason === 'solo') syncCurrentVariationOverrideFromSeq(currentMeasureSeqId, lastHorizonCtx.activeVariationsRef);
}

registerLiveBalancoHorizonRebuilder(() => rebuildWorkletHorizonFromNow('bpm'));
