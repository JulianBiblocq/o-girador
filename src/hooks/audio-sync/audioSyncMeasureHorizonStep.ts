/**
 * audioSyncMeasureHorizonStep.ts — Orchestration du Temps 1 (bascule `O(1)` d'horizon + rampes)
 * et de l'extension d'horizon déportée à `midPushTick = Math.floor(maxTicks * 0.375)` (< 80 lignes).
 */
import { AudioEngine } from '../../AudioEngine';
import {
  computeHorizonMidPushTick,
  extendWorkletHorizonMidMeasure,
  pushWorkletHorizonAtMeasureBoundary,
} from '../../audio/worklet/horizon/percussionHorizonPusher';
import { getMeasureStartTick } from './audioParamsCache';
import { scheduleMeasureAutomationRamps } from './audioSyncAutomationRamp';
import { TickStepContext } from './audioSyncTickStepContext';
import { advanceLiveVariationLookahead } from './liveVariationLookaheadEngine';

export function executeMeasureHorizonAndAutomationStep(params: {
  time: number;
  stepIdx: number;
  currentTicks: number;
  currentMeasureIdx: number;
  currentBpm: number;
  activeEngine: AudioEngine | null;
  ctx: TickStepContext;
}): void {
  const { time, stepIdx, currentTicks, currentMeasureIdx, currentBpm, activeEngine, ctx } = params;
  const shouldScheduleBoundary =
    stepIdx === 0 || (ctx.lastScheduledMeasureRef && ctx.lastScheduledMeasureRef.current !== currentMeasureIdx);

  if (shouldScheduleBoundary) {
    if (ctx.lastScheduledMeasureRef) ctx.lastScheduledMeasureRef.current = currentMeasureIdx;
    const totalM = ctx.totalMeasuresRef.current || 1;
    const isSoloActive = ctx.soloPatternPlayIdRef.current !== null && ctx.soloPatternPlayIdRef.current !== undefined;
    const isAtLoopEnd = ctx.isLoopRegionActiveRef.current && ctx.loopEndRef.current !== null && currentMeasureIdx === ctx.loopEndRef.current && !ctx.isLoopExitRequestedRef?.current;
    const predictedNextMeasure = isSoloActive
      ? currentMeasureIdx
      : (ctx.pendingMeasureRef?.current !== null && ctx.pendingMeasureRef?.current !== undefined)
        ? ctx.pendingMeasureRef.current
        : (isAtLoopEnd ? (ctx.loopStartRef.current ?? 0) : (currentMeasureIdx + 1) % totalM);

    const measureDurationSec = (currentTicks / 24) * (60 / currentBpm);
    const virtualMeasureStartSec = stepIdx > 0 ? time - (stepIdx / currentTicks) * measureDurationSec : time;
    const minStartFrame = stepIdx > 0 && activeEngine ? Math.round(time * activeEngine.getSampleRate()) : 0;
    const currentMeasureSeqId = pushWorkletHorizonAtMeasureBoundary(
      virtualMeasureStartSec, currentMeasureIdx, { ...ctx, engine: activeEngine }, minStartFrame, predictedNextMeasure
    );

    advanceLiveVariationLookahead({
      currentMeasureIdx, nextMeasureIdx: predictedNextMeasure,
      currentMeasureStartTick: ctx.currentMeasureStartTickRef.current,
      nextMeasureStartTick: getMeasureStartTick(predictedNextMeasure, ctx.measureTimeSigsRef.current),
      tracks: ctx.tracksRef.current, measureTimeSigs: ctx.measureTimeSigsRef.current,
      soloPatternPlayId: ctx.soloPatternPlayIdRef.current, soloPatternVariationId: ctx.soloPatternVariationIdRef.current,
      activeVariationsRef: ctx.activeVariationsRef, currentMeasureSeqId,
    });

    scheduleMeasureAutomationRamps({
      tracks: ctx.tracksRef.current, currentMeasureIdx,
      prevMeasureIdx: currentMeasureIdx === 0 ? totalM - 1 : currentMeasureIdx - 1,
      measureDurationSec, time: virtualMeasureStartSec,
    });
    return;
  }

  if (stepIdx === computeHorizonMidPushTick(currentTicks)) {
    extendWorkletHorizonMidMeasure({ ...ctx, engine: activeEngine });
  }
}
