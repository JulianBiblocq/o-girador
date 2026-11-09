import { getMaxTicks } from '../../data';
import { nextRandom, getMeasureStartTick } from './audioParamsCache';
import { advanceMeasureOnTickBoundary } from './measureAdvanceHelper';
import { scheduleMetronomeClick } from './audioSyncMetronomeScheduler';
import { scheduleMeasureAutomationRamps } from './audioSyncAutomationRamp';
import { schedulePercussionNotes } from './audioSyncPercussionScheduler';
import { evaluateVocalTracks } from './audioSyncVocalEvaluator';
import { dispatchVisualTick } from './audioSyncVisualTickDispatcher';
import { advanceLiveVariationLookahead } from './liveVariationLookaheadEngine';
import { getAudioEngine } from './audioEngineNodes';
import { TickStepContext } from './audioSyncTickStepContext';
export type { TickStepContext };

export function executeTickStep(time: number, ctx: TickStepContext): boolean {
  let currentMeasureIdx = ctx.measureCountRef.current % (ctx.totalMeasuresRef.current || 1);
  let currentTimeSig = ctx.measureTimeSigsRef.current[currentMeasureIdx] || '4/4';
  let currentTicks = getMaxTicks(currentTimeSig as any);
  const isDocHidden = typeof document !== 'undefined' && document.hidden;

  if (ctx.currentStepIndexRef.current === -1) {
    ctx.isPlaybackEndingRef.current = false;
    ctx.flatArrayPointerRef.current = 0;
    ctx.lastAbsoluteTickRef.current = -1;
    if (ctx.lastScheduledMeasureRef) ctx.lastScheduledMeasureRef.current = -1;
    ctx.absoluteTickCountRef.current = getMeasureStartTick(currentMeasureIdx, ctx.measureTimeSigsRef.current);
    ctx.currentMeasureStartTickRef.current = ctx.absoluteTickCountRef.current;
  }

  ctx.currentStepIndexRef.current++;
  let stepIdx = ctx.currentStepIndexRef.current;

  if (stepIdx >= currentTicks) {
    stepIdx = 0;
    ctx.currentStepIndexRef.current = 0;
    advanceMeasureOnTickBoundary(currentMeasureIdx, ctx);
    if (ctx.isPlayingRef && !ctx.isPlayingRef.current) return true;
    currentMeasureIdx = ctx.measureCountRef.current % (ctx.totalMeasuresRef.current || 1);
    currentTimeSig = ctx.measureTimeSigsRef.current[currentMeasureIdx] || '4/4';
    currentTicks = ctx.maxTicksRef.current;
  }

  const activeEngine = ctx.audioEngine || getAudioEngine();
  if (activeEngine) {
    activeEngine.schedulingStep = stepIdx;
    activeEngine.schedulingMeasure = currentMeasureIdx;
  }

  dispatchVisualTick({
    time, stepIdx, currentTicks, currentMeasureIdx, totalMeasures: ctx.totalMeasuresRef.current,
    soloPatternPlayId: ctx.soloPatternPlayIdRef.current, measureTimeSigs: ctx.measureTimeSigsRef.current,
    measureBpms: ctx.measureBpmsRef.current, anchoredMeasureStartSecRef: ctx.anchoredMeasureStartSecRef,
    anchoredMeasureIdxRef: ctx.anchoredMeasureIdxRef, sectionIteration: ctx.sectionIterationRef.current, isDocHidden,
  });

  const currentBpm = ctx.measureBpmsRef.current?.[currentMeasureIdx] || ctx.measureBpmsRef.current?.[0] || 100;
  const tick96nSec = (60 / currentBpm) / 24;

  scheduleMetronomeClick({
    time, stepIdx, currentMeasureSig: currentTimeSig, currentTicks,
    isMetroOn: ctx.isMetroOnRef.current, metroVolume: ctx.metroVolumeRef.current, metroSound: ctx.metroSoundRef.current,
  });

  const shouldScheduleAutomation =
    stepIdx === 0 || (ctx.lastScheduledMeasureRef && ctx.lastScheduledMeasureRef.current !== currentMeasureIdx);
  if (shouldScheduleAutomation) {
    if (ctx.lastScheduledMeasureRef) ctx.lastScheduledMeasureRef.current = currentMeasureIdx;
    const totalM = ctx.totalMeasuresRef.current || 1;
    const isAtLoopEnd = ctx.isLoopRegionActiveRef.current && ctx.loopEndRef.current !== null && currentMeasureIdx === ctx.loopEndRef.current && !ctx.isLoopExitRequestedRef?.current;
    const predictedNextMeasure = (ctx.pendingMeasureRef?.current !== null && ctx.pendingMeasureRef?.current !== undefined)
      ? ctx.pendingMeasureRef.current
      : (isAtLoopEnd ? (ctx.loopStartRef.current ?? 0) : (currentMeasureIdx + 1) % totalM);

    advanceLiveVariationLookahead({
      currentMeasureIdx, nextMeasureIdx: predictedNextMeasure,
      currentMeasureStartTick: ctx.currentMeasureStartTickRef.current, tracks: ctx.tracksRef.current,
      measureTimeSigs: ctx.measureTimeSigsRef.current, soloPatternPlayId: ctx.soloPatternPlayIdRef.current,
      soloPatternVariationId: ctx.soloPatternVariationIdRef.current, activeVariationsRef: ctx.activeVariationsRef,
    });

    const measureDurationSec = (currentTicks / 24) * (60 / currentBpm);
    scheduleMeasureAutomationRamps({
      tracks: ctx.tracksRef.current, currentMeasureIdx,
      prevMeasureIdx: currentMeasureIdx === 0 ? totalM - 1 : currentMeasureIdx - 1, measureDurationSec, time,
    });
  }

  const stepDurationSec = tick96nSec * 6;
  const globalMode = ctx.globalSwingRef.current.mode;
  const swingJitter = (nextRandom() * 0.06 - 0.03) * stepDurationSec;

  schedulePercussionNotes({
    time, stepIdx, currentTicks, currentMeasureIdx, tick96nSec, swingJitter, globalMode, stepDurationSec, isDocHidden,
    tracks: ctx.tracksRef.current, soloPatternPlayId: ctx.soloPatternPlayIdRef.current,
    globalSwing: ctx.globalSwingRef.current, familyMuteSet: ctx.familyMuteSetRef.current,
    flatCompiledSchedule: ctx.flatCompiledScheduleRef.current, flatArrayPointerRef: ctx.flatArrayPointerRef,
    lastCompiledScheduleRef: ctx.lastCompiledScheduleRef, lastAbsoluteTickRef: ctx.lastAbsoluteTickRef,
    currentMeasureStartTick: ctx.currentMeasureStartTickRef.current, audioEngine: activeEngine, busChannels: ctx.busChannels,
  });

  evaluateVocalTracks({
    tracks: ctx.tracksRef.current, stepIdx, currentTicks, time, currentMeasureLocal: currentMeasureIdx,
    totalMeasures: ctx.totalMeasuresRef.current, soloPatternPlayId: ctx.soloPatternPlayIdRef.current,
    soloPatternVariationId: ctx.soloPatternVariationIdRef.current, soloLoopCycle: ctx.soloLoopCycleRef.current,
    soloPhraseMeasure: ctx.soloPhraseMeasureRef.current, isLoopRegionActive: ctx.isLoopRegionActiveRef.current,
    loopStart: ctx.loopStartRef.current, loopEnd: ctx.loopEndRef.current, measureTimeSigs: ctx.measureTimeSigsRef.current,
    globalSwing: ctx.globalSwingRef.current, isDocHidden, mutedVoiceTracks: ctx.mutedVoiceTracksRef.current,
    anticipatedMeasures: ctx.anticipatedMeasuresRef.current, activeSequencerVocals: ctx.activeSequencerVocalsRef.current,
    trackInputs: ctx.trackInputs, channels: ctx.channels, busChannels: ctx.busChannels, masterVolumeNode: ctx.masterVolumeNode,
  });

  const effectiveLoopEnd = (ctx.isLoopRegionActiveRef.current && ctx.loopEndRef.current !== null)
    ? ctx.loopEndRef.current : ((ctx.totalMeasuresRef.current || 1) - 1);
  const isLastStepOfLoop = (stepIdx === currentTicks - 1) &&
    ((ctx.soloPatternPlayIdRef.current !== null) || (currentMeasureIdx === effectiveLoopEnd && ctx.isLoopingRef.current));

  return isLastStepOfLoop || ctx.isPlaybackEndingRef.current;
}
