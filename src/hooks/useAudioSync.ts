import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
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

  // Calcul dynamique de l'intervalle de tick (tempo adaptatif, vitesse et speed trainer)
  getTickDurationRef.current = () => {
    if (useSequencerStore.getState().isSpeedTrainerActive) {
      const stBpm = refs.speedTrainerCurrentBpmRef.current || useSequencerStore.getState().speedTrainerCurrentBpm || Tone.Transport.bpm.value;
      return 2.5 / stBpm;
    }
    const currentMeasureIdx = refs.measureCountRef.current % (refs.totalMeasuresRef.current || 1);
    const rawBpm = refs.measureBpmsRef.current?.[currentMeasureIdx];
    const targetBpm = isNaN(rawBpm) || rawBpm <= 0 ? (props.bpm || useSequencerStore.getState().bpm || 100) : rawBpm;
    return 2.5 / targetBpm;
  };

  // Synchronisation stricte de l'état de lecture React, Store Zustand et Refs partagées
  useEffect(() => {
    refs.isPlayingRef.current = isPlaying;
    if (props.isPlayingRef) props.isPlayingRef.current = isPlaying;
    useSequencerStore.getState().setIsPlaying(isPlaying);
    if (typeof window !== 'undefined') {
      (window as any).__IS_PLAYING__ = isPlaying;
    }
  }, [isPlaying, props.isPlayingRef, refs.isPlayingRef]);

  useEffect(() => {
    if (props.setIsPlayingRef) {
      props.setIsPlayingRef.current = setIsPlaying;
    }
  }, [props.setIsPlayingRef]);

  useEffect(() => {
    if (props.bpm) {
      Tone.Transport.bpm.value = props.bpm;
    }
  }, [props.bpm]);

  useEffect(() => {
    return useSequencerStore.subscribe((state, prev) => {
      if (state.tocarJuntoActive !== prev.tocarJuntoActive || state.tocarJuntoTrackId !== prev.tocarJuntoTrackId) {
        refs.familyMuteSetRef.current.clear();
      }
    });
  }, [refs.familyMuteSetRef]);

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

  onTickRef.current = (time: number) => executeTickStep(time, {
    ...refs, trackInputs, channels, busChannels, masterVolumeNode: masterVolumeNode as any, audioEngine: getAudioEngine(), handleStop: onStop, setCurrentMeasure,
  });

  useEffect(() => {
    const handleVis = () => {
      if (document.hidden) {
        if (refs.isPlayingRef.current) executeTransportStop({ ...refs, audioEngine: getAudioEngine(), setIsPlaying, setSoloPatternPlayId, setCurrentMeasure });
      } else {
        purgeVisualTickBuffer(); resetVisualTickBuffer(); flushVisualBuffers();
        refs.hitTriggersRef.current.clear(); getAudioEngine()?.purgeScheduledHits();
      }
    };
    document.addEventListener('visibilitychange', handleVis);
    return () => document.removeEventListener('visibilitychange', handleVis);
  }, [setCurrentMeasure, setSoloPatternPlayId, refs]);

  const onStop = useCallback(() => executeTransportStop({
    ...refs, audioEngine: getAudioEngine(), setIsPlaying, setSoloPatternPlayId, setCurrentMeasure,
  }), [setCurrentMeasure, setSoloPatternPlayId, refs]);

  const onTogglePlay = useCallback((opts?: any) => handleTogglePlay(opts, {
    ...refs, trackInputs, channels, busChannels, audioEngine: getAudioEngine(), setIsPlaying, setSoloPatternPlayId, setCurrentMeasure,
  }), [setCurrentMeasure, setSoloPatternPlayId, refs]);

  const onStartSolo = useCallback((id: number, vId?: string) => handleStartSoloPattern(id, vId, {
    ...refs, channels, busChannels, audioEngine: getAudioEngine(), setSoloPatternPlayId,
    setSoloPatternVariationId, setCurrentMeasure, setIsPlaying, setIsLoading, handleStop: onStop,
  }), [onStop, setCurrentMeasure, setSoloPatternPlayId, setSoloPatternVariationId, refs]);

  const onStopSolo = useCallback(() => handleStopSoloPattern({
    ...refs, channels, busChannels, audioEngine: getAudioEngine(), setSoloPatternPlayId,
    setSoloPatternVariationId, setCurrentMeasure, setIsPlaying, setIsLoading, handleStop: onStop,
  }), [onStop, setCurrentMeasure, setSoloPatternPlayId, setSoloPatternVariationId, refs]);

  const onSeek = useCallback((m: number, s: number = 0, st?: number) => seekToMeasure(m, s, st, {
    ...refs, audioEngine: getAudioEngine(), setCurrentMeasure,
  }), [setCurrentMeasure, refs]);

  const onNavigate = useCallback((m: number, s: number, st?: number, it: number = 1) => handleTimelineNavigate(m, s, st, it, {
    ...refs, audioEngine: getAudioEngine(), setCurrentMeasure,
  }), [setCurrentMeasure, refs]);

  useEffect(() => {
    const handleTimelineNav = (e: Event) => {
      const customEvent = e as CustomEvent<{ mIdx: number; sIdx: number; iteration?: number }>;
      const { mIdx, sIdx, iteration } = customEvent.detail;
      if (sIdx === 0) {
        onSeek(mIdx, 0);
      } else {
        onNavigate(mIdx, sIdx, 16, iteration ?? 1);
      }
    };
    window.addEventListener('o-girador-timeline-nav', handleTimelineNav);
    return () => window.removeEventListener('o-girador-timeline-nav', handleTimelineNav);
  }, [onSeek, onNavigate]);

  const onLaunchSpeedTrainer = useCallback((cfg: any) => launchSpeedTrainer(cfg, {
    ...refs, audioEngine: getAudioEngine(), handleStop: onStop, setCurrentMeasure, setIsPlaying,
  }), [onStop, setCurrentMeasure, refs]);

  const onStopSpeedTrainer = useCallback(() => stopSpeedTrainerAudio({
    ...refs, audioEngine: getAudioEngine(), handleStop: onStop, setCurrentMeasure, setIsPlaying,
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
