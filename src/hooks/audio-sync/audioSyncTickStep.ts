import { getMaxTicks } from '../../data';
import { getCurrentWorkletMeasureSeqId } from '../../audio/worklet/horizon/percussionHorizonPusher';
import { areAllStudioWindowsHidden } from '../../audio/visualTickBuffer';
import { nextRandom, getMeasureStartTick } from './audioParamsCache';
import { advanceMeasureOnTickBoundary } from './measureAdvanceHelper';
import { scheduleMetronomeClick } from './audioSyncMetronomeScheduler';
import { executeMeasureHorizonAndAutomationStep } from './audioSyncMeasureHorizonStep';
import { schedulePercussionNotes } from './audioSyncPercussionScheduler';
import { evaluateVocalTracks } from './audioSyncVocalEvaluator';
import { dispatchVisualTick } from './audioSyncVisualTickDispatcher';
import { getAudioEngine } from './audioEngineNodes';
import { TickStepContext } from './audioSyncTickStepContext';
export type { TickStepContext };

export function executeTickStep(time: number, ctx: TickStepContext): boolean {
  let currentMeasureIdx = ctx.measureCountRef.current % (ctx.totalMeasuresRef.current || 1);
  let currentTimeSig = ctx.measureTimeSigsRef.current[currentMeasureIdx] || '4/4';
  let currentTicks = getMaxTicks(currentTimeSig as any);
  ctx.maxTicksRef.current = currentTicks;
  const isDocHidden = areAllStudioWindowsHidden();

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
    currentTicks = getMaxTicks(currentTimeSig as any);
    ctx.maxTicksRef.current = currentTicks;
  }

  const activeEngine = ctx.audioEngine || getAudioEngine();
  if (activeEngine) {
    activeEngine.schedulingStep = stepIdx;
    activeEngine.schedulingMeasure = currentMeasureIdx;
  }
  const isCatchupPastTick = Boolean(activeEngine && time < activeEngine.getCurrentTime() - 0.015);
  const currentBpm = ctx.measureBpmsRef.current?.[currentMeasureIdx] || ctx.measureBpmsRef.current?.[0] || 100;
  const tick96nSec = (60 / currentBpm) / 24;

  if (!isCatchupPastTick) {
    scheduleMetronomeClick({
      time, stepIdx, currentMeasureSig: currentTimeSig, currentTicks,
      isMetroOn: ctx.isMetroOnRef.current, metroVolume: ctx.metroVolumeRef.current, metroSound: ctx.metroSoundRef.current,
    });
  }

  executeMeasureHorizonAndAutomationStep({
    time, stepIdx, currentTicks, currentMeasureIdx, currentBpm, activeEngine, ctx,
  });

  if (!isCatchupPastTick || stepIdx === 0) {
    dispatchVisualTick({
      time, stepIdx, currentTicks, currentMeasureIdx, totalMeasures: ctx.totalMeasuresRef.current,
      soloPatternPlayId: ctx.soloPatternPlayIdRef.current, measureTimeSigs: ctx.measureTimeSigsRef.current,
      measureBpms: ctx.measureBpmsRef.current, anchoredMeasureStartSecRef: ctx.anchoredMeasureStartSecRef,
      anchoredMeasureIdxRef: ctx.anchoredMeasureIdxRef, sectionIteration: ctx.sectionIterationRef.current,
      loopIteration: ctx.currentLoopIterationRef?.current ?? 1, measureSeqId: getCurrentWorkletMeasureSeqId(), isDocHidden,
    });
  }

  const stepDurationSec = tick96nSec * 6;
  const globalMode = ctx.globalSwingRef.current.mode;
  const swingJitter = (nextRandom() * 0.06 - 0.03) * stepDurationSec;

  schedulePercussionNotes({
    time, stepIdx, currentTicks, currentMeasureIdx, currentTimeSig, tick96nSec, swingJitter, globalMode, stepDurationSec, isDocHidden,
    tracks: ctx.tracksRef.current, soloPatternPlayId: ctx.soloPatternPlayIdRef.current,
    globalSwing: ctx.globalSwingRef.current, familyMuteSet: ctx.familyMuteSetRef.current,
    flatCompiledSchedule: ctx.flatCompiledScheduleRef.current, flatArrayPointerRef: ctx.flatArrayPointerRef,
    lastCompiledScheduleRef: ctx.lastCompiledScheduleRef, lastAbsoluteTickRef: ctx.lastAbsoluteTickRef,
    currentMeasureStartTick: ctx.currentMeasureStartTickRef.current, audioEngine: activeEngine, busChannels: ctx.busChannels,
  });

  if (!isCatchupPastTick || stepIdx === 0) {
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
  }

  const effectiveLoopEnd = (ctx.isLoopRegionActiveRef.current && ctx.loopEndRef.current !== null)
    ? ctx.loopEndRef.current : ((ctx.totalMeasuresRef.current || 1) - 1);
  const isLastStepOfLoop = (stepIdx === currentTicks - 1) &&
    ((ctx.soloPatternPlayIdRef.current !== null) || (currentMeasureIdx === effectiveLoopEnd && ctx.isLoopingRef.current));

  return isLastStepOfLoop || ctx.isPlaybackEndingRef.current;
}
