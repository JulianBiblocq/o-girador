/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef, useEffect, useMemo } from 'react';
import * as Tone from 'tone';
import { UseAudioSyncProps, tickSubscribers, subscribeToTick, unsubscribeFromTick, ScheduledNote } from './audio-sync/audioSyncTypes';
import { getActiveStrokesForTrack } from './audio-sync/strokeNormalization';
import { isVocalSamplePattern, isSamplePlaybackAllowed, getVocalBufferForPattern } from './audio-sync/vocalSampleHelpers';
import { normalizePanForTone, invalidateAudioParamsCache, setGlobalInvalidateAudioParamsCache } from './audio-sync/audioParamsCache';
import {
  audioEngine, getAudioEngine, inputManager, masterVolumeNode, masterEQ, masterEQNode,
  masterCompressor, masterCompressorNode, masterReverbVolumeNode,
  masterDistortionVolumeNode, reverbNode, distortionNode, metroChannel,
  channels, meters, busChannels, busMeters, trackInputs, reverbSends, distortionSends, voiceSynths
} from './audio-sync/audioEngineNodes';
import { useAudioSyncRefs } from './audio-sync/useAudioSyncRefs';
import { useMetroChannelSync } from './audio-sync/useMetroChannelSync';
import { useMasterEffectsSync } from './audio-sync/useMasterEffectsSync';
import { useEcoReverbSendsSync } from './audio-sync/useEcoReverbSendsSync';
import { useCompilerWorkerSync } from './audio-sync/useCompilerWorkerSync';
import { useTracksParamsSync } from './audio-sync/useTracksParamsSync';
import { useAudioInitialization } from './audio-sync/useAudioInitialization';
import { executeTickStep } from './audio-sync/audioSyncTickStep';
import { resolveLiveTickDuration } from './audio-sync/liveTempoResolver';
import { useAudioSyncSubscriptions } from './audio-sync/useAudioSyncSubscriptions';
import { useAudioSyncTransportHandlers } from './audio-sync/useAudioSyncTransportHandlers';
import { useTransportStore } from '../stores/useTransportStore';
import { useSequencerStore } from '../stores/useSequencerStore';
import { safeSuspendAudioContext } from '../audio/audioContextSuspendManager';
import { stopAudioRecording } from '../contexts/audio/audioRecorderService';
import { VocalRecordingService } from '../audio/vocal/vocalRecordingService';

export {
  tickSubscribers, subscribeToTick, unsubscribeFromTick, getActiveStrokesForTrack, isVocalSamplePattern,
  isSamplePlaybackAllowed, getVocalBufferForPattern, normalizePanForTone,
  invalidateAudioParamsCache, audioEngine, inputManager, masterVolumeNode, masterEQ, masterEQNode,
  masterCompressor, masterCompressorNode, masterReverbVolumeNode, masterDistortionVolumeNode, reverbNode,
  distortionNode, metroChannel, channels, meters, busChannels, busMeters, trackInputs, reverbSends,
  distortionSends, voiceSynths
};
export type { ScheduledNote, UseAudioSyncProps };

export function useAudioSync(props: UseAudioSyncProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const refs = useAudioSyncRefs(props);
  const onTickRef = useRef<(time: number) => boolean>(() => false);
  const getTickDurationRef = useRef<() => number>(() => 0.025);
  const setCurrentMeasure = useRef(useSequencerStore.getState().setCurrentMeasure).current;
  const setSoloPatternPlayId = useTransportStore.getState().setSoloPatternPlayId;
  const setSoloPatternVariationId = useTransportStore.getState().setSoloPatternVariationId;

  getTickDurationRef.current = () => resolveLiveTickDuration({
    speedTrainerCurrentBpmRef: refs.speedTrainerCurrentBpmRef, measureCountRef: refs.measureCountRef,
    totalMeasuresRef: refs.totalMeasuresRef, measureBpmsRef: refs.measureBpmsRef,
    currentStepIndexRef: refs.currentStepIndexRef, maxTicksRef: refs.maxTicksRef, fallbackBpm: props.bpm || 100,
  });

  const { isCompiling, triggerCompile } = useCompilerWorkerSync({ flatCompiledScheduleRef: refs.flatCompiledScheduleRef });
  useEffect(() => { setGlobalInvalidateAudioParamsCache(triggerCompile); }, [triggerCompile]);
  useMetroChannelSync(refs as any);
  useMasterEffectsSync({ masterVol: props.masterVol, masterEQ: props.masterEQ, masterCompressor: props.masterCompressor });
  useEcoReverbSendsSync({ isPlayingRef: refs.isPlayingRef, isPlaying });
  useTracksParamsSync({
    isAudioInitializedRef: refs.isAudioInitializedRef,
    lastAppliedTracksParamsRef: refs.lastAppliedTracksParamsRef,
    lastAppliedBussesRef: refs.lastAppliedBussesRef,
  });

  useAudioInitialization({
    tracksRef: refs.tracksRef, measureTimeSigsRef: refs.measureTimeSigsRef,
    totalMeasuresRef: refs.totalMeasuresRef, currentStepIndexRef: refs.currentStepIndexRef,
    measureCountRef: refs.measureCountRef, maxTicksRef: refs.maxTicksRef,
    absoluteTickCountRef: refs.absoluteTickCountRef, currentMeasureStartTickRef: refs.currentMeasureStartTickRef,
    hitTriggersRef: refs.hitTriggersRef, engineTimeoutsRef: refs.engineTimeoutsRef,
    isAudioInitializedRef: refs.isAudioInitializedRef,
    lastAppliedBussesRef: refs.lastAppliedBussesRef, lastAppliedTracksParamsRef: refs.lastAppliedTracksParamsRef,
    onTickRef, getTickDurationRef, setIsLoading,
    masterVol: props.masterVol, masterEQ: props.masterEQ, masterReverbVol: props.masterReverbVol,
    metroVolumeRef: refs.metroVolumeRef, isMetroOnRef: refs.isMetroOnRef,
  });

  const { onStop, onTogglePlay, onStartSolo, onStopSolo, onSeek, onNavigate, onLaunchSpeedTrainer, onStopSpeedTrainer } =
    useAudioSyncTransportHandlers({ refs, setIsPlaying, setIsLoading, setSoloPatternPlayId, setSoloPatternVariationId, setCurrentMeasure });

  onTickRef.current = (time: number) => executeTickStep(time, {
    ...refs, trackInputs, channels, busChannels, masterVolumeNode: masterVolumeNode as any, audioEngine: getAudioEngine(), handleStop: onStop, setCurrentMeasure,
  });

  useAudioSyncSubscriptions({
    isPlaying, setIsPlaying, isPlayingRef: props.isPlayingRef, setIsPlayingRef: props.setIsPlayingRef,
    bpm: props.bpm, refs, onStop, onSeek, onNavigate,
  });

  return useMemo(() => ({
    isPlaying, isLoading, setCurrentMeasure, setIsLoading, isCompiling,
    get isMetroOn() { return useTransportStore.getState().isMetroOn; },
    setIsMetroOn: (on: boolean) => useTransportStore.getState().setIsMetroOn(on),
    get globalSwing() { return useTransportStore.getState().globalSwing; },
    setGlobalSwing: (gs: any) => useTransportStore.getState().setGlobalSwing(gs),
    get metroVolume() { return useTransportStore.getState().metroVolume; },
    setMetroVolume: (vol: number) => useTransportStore.getState().setMetroVolume(vol),
    get metroSound() { return useTransportStore.getState().metroSound; },
    setMetroSound: (snd: any) => useTransportStore.getState().setMetroSound(snd),
    get soloPatternPlayId() { return useTransportStore.getState().soloPatternPlayId; },
    setSoloPatternPlayId: (id: number | null) => useTransportStore.getState().setSoloPatternPlayId(id),
    get soloPatternVariationId() { return useTransportStore.getState().soloPatternVariationId; },
    setSoloPatternVariationId: (id: string | null) => useTransportStore.getState().setSoloPatternVariationId(id),
    handleTogglePlay: onTogglePlay, handleStop: onStop, handleRewind: onStop,
    handleStartSoloPattern: onStartSolo, handleStopSoloPattern: onStopSolo,
    seekToMeasure: onSeek, handleTimelineNavigate: onNavigate,
    launchSpeedTrainer: onLaunchSpeedTrainer, stopSpeedTrainerAudio: onStopSpeedTrainer,
    invalidateAudioParamsCache: triggerCompile,
    ...refs,
  }), [isPlaying, isLoading, isCompiling, onTogglePlay, onStop, onStartSolo, onStopSolo, onSeek, onNavigate, onLaunchSpeedTrainer, onStopSpeedTrainer, triggerCompile, setCurrentMeasure, setSoloPatternPlayId, setSoloPatternVariationId, refs]);
}
export default useAudioSync;

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    try { Tone.Transport.stop(); Tone.Transport.cancel(); } catch (_) {}
    const engine = getAudioEngine();
    if (engine) { engine.stop(); engine.dispose(); }
    stopAudioRecording();
    VocalRecordingService.stopRecording();
    safeSuspendAudioContext();
  });
}
