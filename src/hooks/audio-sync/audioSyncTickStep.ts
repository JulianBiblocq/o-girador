/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import * as Tone from 'tone';
import { getMaxTicks } from '../../data';
import { getBeatsPerMeasure } from '../../utils/measureHelpers';
import { nextRandom, getMeasureStartTick } from './audioParamsCache';
import { advanceMeasureOnTickBoundary } from './measureAdvanceHelper';
import { scheduleMetronomeClick } from './audioSyncMetronomeScheduler';
import { scheduleMeasureAutomationRamps } from './audioSyncAutomationRamp';
import { computeTickSwingOffset } from './audioSyncSwingCalculator';
import { schedulePercussionNotes } from './audioSyncPercussionScheduler';
import { evaluateVocalTracks } from './audioSyncVocalEvaluator';
import { dispatchVisualTick } from './audioSyncVisualTickDispatcher';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { AudioEngine } from '../../AudioEngine';
import { getAudioEngine } from './audioEngineNodes';

export interface TickStepContext {
  currentStepIndexRef: { current: number }; measureCountRef: { current: number }; totalMeasuresRef: { current: number };
  measureTimeSigsRef: { current: Record<number, string> }; measureBpmsRef: { current: number[] }; maxTicksRef: { current: number };
  currentMeasureStartTickRef: { current: number }; absoluteTickCountRef: { current: number }; isLoopRegionActiveRef: { current: boolean };
  loopStartRef: { current: number | null }; loopEndRef: { current: number | null }; isLoopingRef: { current: boolean };
  isPlaybackEndingRef: { current: boolean }; lastPlayedSignalIdRef: { current: string | null }; isMetroOnRef: { current: boolean };
  metroVolumeRef: { current: number }; metroSoundRef: { current: 'synth' | 'clave' | 'cowbell' }; metroChannelRef: { current: Tone.Channel | null };
  globalSwingRef: { current: any }; tracksRef: { current: any[] }; soloPatternPlayIdRef: { current: number | null };
  soloPatternVariationIdRef: { current: string | null }; soloLoopCycleRef: { current: number }; soloPhraseMeasureRef: { current: number };
  familyMuteSetRef: { current: Set<string> }; flatCompiledScheduleRef: { current: Float64Array | null }; flatArrayPointerRef: { current: number };
  lastCompiledScheduleRef: { current: Float64Array | null }; lastAbsoluteTickRef: { current: number }; mutedVoiceTracksRef: { current: Set<string | number> };
  anticipatedMeasuresRef: { current: Set<string> }; activeSequencerVocalsRef: { current: Map<string, any> }; speedTrainerCurrentBpmRef: { current: number };
  speedTrainerConsolidationLapsDoneRef: { current: number }; anchoredMeasureStartSecRef: React.MutableRefObject<number>;
  anchoredMeasureIdxRef: React.MutableRefObject<number>; sectionIterationRef: { current: number };
  trackInputs: Record<string | number, Tone.Gain>; channels: Record<string | number, Tone.Channel>; busChannels: Record<string | number, Tone.Channel>;
  masterVolumeNode: Tone.Volume | null; audioEngine: AudioEngine | null; handleStop: () => void; setCurrentMeasure: (m: number) => void;
}

export function executeTickStep(time: number, ctx: TickStepContext): boolean {
  let currentMeasureIdx = ctx.measureCountRef.current % (ctx.totalMeasuresRef.current || 1);
  let currentTimeSig = ctx.measureTimeSigsRef.current[currentMeasureIdx] || '4/4';
  let currentTicks = getMaxTicks(currentTimeSig as any);
  const isDocHidden = typeof document !== 'undefined' && document.hidden;

  if (ctx.currentStepIndexRef.current === -1) {
    ctx.isPlaybackEndingRef.current = false;
    ctx.flatArrayPointerRef.current = 0;
    ctx.lastAbsoluteTickRef.current = -1;
    ctx.absoluteTickCountRef.current = getMeasureStartTick(currentMeasureIdx, ctx.measureTimeSigsRef.current);
    ctx.currentMeasureStartTickRef.current = ctx.absoluteTickCountRef.current;
  }

  ctx.currentStepIndexRef.current++;
  let stepIdx = ctx.currentStepIndexRef.current;

  if (stepIdx >= currentTicks) {
    stepIdx = 0;
    ctx.currentStepIndexRef.current = 0;
    advanceMeasureOnTickBoundary(currentMeasureIdx, ctx);
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
    time, stepIdx, currentTicks, currentMeasureIdx,
    totalMeasures: ctx.totalMeasuresRef.current,
    soloPatternPlayId: ctx.soloPatternPlayIdRef.current,
    measureTimeSigs: ctx.measureTimeSigsRef.current,
    measureBpms: ctx.measureBpmsRef.current,
    anchoredMeasureStartSecRef: ctx.anchoredMeasureStartSecRef,
    anchoredMeasureIdxRef: ctx.anchoredMeasureIdxRef,
    sectionIteration: ctx.sectionIterationRef.current,
    isDocHidden,
  });

  const tick96nSec = (60 / (useSequencerStore.getState().measureBpms[currentMeasureIdx] || useSequencerStore.getState().bpm || 100)) / 24;

  scheduleMetronomeClick({
    time, stepIdx, currentMeasureSig: currentTimeSig, currentTicks,
    isMetroOn: ctx.isMetroOnRef.current, metroVolume: ctx.metroVolumeRef.current,
    metroSound: ctx.metroSoundRef.current,
  });

  const beats = getBeatsPerMeasure(currentTimeSig as any);
  scheduleMeasureAutomationRamps({
    tracks: ctx.tracksRef.current, currentMeasureIdx,
    prevMeasureIdx: currentMeasureIdx === 0 ? (ctx.totalMeasuresRef.current || 1) - 1 : currentMeasureIdx - 1,
    measureDurationSec: tick96nSec * 24 * beats, time,
  });

  const stepDurationSec = tick96nSec * 6;
  const globalMode = ctx.globalSwingRef.current.mode;
  const swingJitter = (nextRandom() * 0.06 - 0.03) * stepDurationSec;

  schedulePercussionNotes({
    time, stepIdx, currentTicks, currentMeasureIdx, tick96nSec,
    swingJitter, globalMode, stepDurationSec, isDocHidden,
    tracks: ctx.tracksRef.current, soloPatternPlayId: ctx.soloPatternPlayIdRef.current,
    globalSwing: ctx.globalSwingRef.current, familyMuteSet: ctx.familyMuteSetRef.current,
    flatCompiledSchedule: ctx.flatCompiledScheduleRef.current,
    flatArrayPointerRef: ctx.flatArrayPointerRef,
    lastCompiledScheduleRef: ctx.lastCompiledScheduleRef,
    lastAbsoluteTickRef: ctx.lastAbsoluteTickRef,
    currentMeasureStartTick: ctx.currentMeasureStartTickRef.current,
    audioEngine: activeEngine, busChannels: ctx.busChannels,
  });

  evaluateVocalTracks({
    tracks: ctx.tracksRef.current, stepIdx, currentTicks, time,
    currentMeasureLocal: currentMeasureIdx, totalMeasures: ctx.totalMeasuresRef.current,
    soloPatternPlayId: ctx.soloPatternPlayIdRef.current,
    soloPatternVariationId: ctx.soloPatternVariationIdRef.current,
    soloLoopCycle: ctx.soloLoopCycleRef.current,
    soloPhraseMeasure: ctx.soloPhraseMeasureRef.current,
    isLoopRegionActive: ctx.isLoopRegionActiveRef.current,
    loopStart: ctx.loopStartRef.current, loopEnd: ctx.loopEndRef.current,
    measureTimeSigs: ctx.measureTimeSigsRef.current,
    globalSwing: ctx.globalSwingRef.current, isDocHidden,
    mutedVoiceTracks: ctx.mutedVoiceTracksRef.current,
    anticipatedMeasures: ctx.anticipatedMeasuresRef.current,
    activeSequencerVocals: ctx.activeSequencerVocalsRef.current,
    trackInputs: ctx.trackInputs, channels: ctx.channels,
    busChannels: ctx.busChannels, masterVolumeNode: ctx.masterVolumeNode,
  });

  const effectiveLoopEnd = (ctx.isLoopRegionActiveRef.current && ctx.loopEndRef.current !== null)
    ? ctx.loopEndRef.current : ((ctx.totalMeasuresRef.current || 1) - 1);
  const isLastStepOfLoop = (stepIdx === currentTicks - 1) &&
    ((ctx.soloPatternPlayIdRef.current !== null) || (currentMeasureIdx === effectiveLoopEnd && ctx.isLoopingRef.current));

  return isLastStepOfLoop || ctx.isPlaybackEndingRef.current;
}
