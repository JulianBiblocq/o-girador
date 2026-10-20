import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { UseAudioSyncProps, tickSubscribers, subscribeToTick, unsubscribeFromTick, ScheduledNote } from './audio-sync/audioSyncTypes';
import { getActiveStrokesForTrack } from './audio-sync/strokeNormalization';
import { isVocalSamplePattern, isSamplePlaybackAllowed, getVocalBufferForPattern } from './audio-sync/vocalSampleHelpers';
import { normalizePanForTone, invalidateAudioParamsCache, setGlobalInvalidateAudioParamsCache } from './audio-sync/audioParamsCache';
import {
  audioEngine, inputManager, masterVolumeNode, masterEQ, masterEQNode,
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
import { handleTogglePlay } from './audio-sync/transportPlayToggle';
import { executeTransportStop } from './audio-sync/transportStop';
import { handleStartSoloPattern, handleStopSoloPattern } from './audio-sync/soloPatternTransport';
import { seekToMeasure, handleTimelineNavigate } from './audio-sync/transportNavigation';
import { launchSpeedTrainer, stopSpeedTrainerAudio } from './audio-sync/speedTrainerService';
import { useTransportStore } from '../stores/useTransportStore';
import { useSequencerStore } from '../stores/useSequencerStore';
import { purgeVisualTickBuffer, resetVisualTickBuffer, flushVisualBuffers } from '../audio/visualTickBuffer';

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
  });

  onTickRef.current = (time: number) => executeTickStep(time, {
    ...refs, trackInputs, channels, busChannels, masterVolumeNode: masterVolumeNode as any, audioEngine, handleStop: onStop, setCurrentMeasure,
  });

  useEffect(() => {
    const handleVis = () => {
      if (document.hidden) {
        if (refs.isPlayingRef.current) executeTransportStop({ ...refs, audioEngine, setIsPlaying, setSoloPatternPlayId, setCurrentMeasure });
      } else {
        purgeVisualTickBuffer(); resetVisualTickBuffer(); flushVisualBuffers();
        refs.hitTriggersRef.current.clear(); audioEngine?.purgeScheduledHits();
      }
    };
    document.addEventListener('visibilitychange', handleVis);
    return () => document.removeEventListener('visibilitychange', handleVis);
  }, [setCurrentMeasure, setSoloPatternPlayId, refs]);

  const onStop = useCallback(() => executeTransportStop({
    ...refs, audioEngine, setIsPlaying, setSoloPatternPlayId, setCurrentMeasure,
  }), [setCurrentMeasure, setSoloPatternPlayId, refs]);

  const onTogglePlay = useCallback((opts?: any) => handleTogglePlay(opts, {
    ...refs, trackInputs, channels, busChannels, audioEngine, setIsPlaying, setSoloPatternPlayId, setCurrentMeasure,
  }), [setCurrentMeasure, setSoloPatternPlayId, refs]);

  const onStartSolo = useCallback((id: number, vId?: string) => handleStartSoloPattern(id, vId, {
    ...refs, channels, busChannels, audioEngine, setSoloPatternPlayId,
    setSoloPatternVariationId, setCurrentMeasure, setIsPlaying, setIsLoading, handleStop: onStop,
  }), [onStop, setCurrentMeasure, setSoloPatternPlayId, setSoloPatternVariationId, refs]);

  const onStopSolo = useCallback(() => handleStopSoloPattern({
    ...refs, channels, busChannels, audioEngine, setSoloPatternPlayId,
    setSoloPatternVariationId, setCurrentMeasure, setIsPlaying, setIsLoading, handleStop: onStop,
  }), [onStop, setCurrentMeasure, setSoloPatternPlayId, setSoloPatternVariationId, refs]);

  const onSeek = useCallback((m: number, s: number = 0, st?: number) => seekToMeasure(m, s, st, {
    ...refs, audioEngine, setCurrentMeasure,
  }), [setCurrentMeasure, refs]);

  const onNavigate = useCallback((m: number, s: number, st?: number, it: number = 1) => handleTimelineNavigate(m, s, st, it, {
    ...refs, audioEngine, setCurrentMeasure,
  }), [setCurrentMeasure, refs]);

  const onLaunchSpeedTrainer = useCallback((cfg: any) => launchSpeedTrainer(cfg, {
    ...refs, audioEngine, handleStop: onStop, setCurrentMeasure, setIsPlaying,
  }), [onStop, setCurrentMeasure, refs]);

  const onStopSpeedTrainer = useCallback(() => stopSpeedTrainerAudio({
    ...refs, audioEngine, handleStop: onStop, setCurrentMeasure, setIsPlaying,
  }), [onStop, setCurrentMeasure, refs]);

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
