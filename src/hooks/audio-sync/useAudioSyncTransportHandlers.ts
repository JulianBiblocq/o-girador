import { useCallback } from 'react';
import { executeTransportStop } from './transportStop';
import { executeTransportRewind } from './transportRewind';
import { handleTogglePlay } from './transportPlayToggle';
import { handleStartSoloPattern, handleStopSoloPattern } from './soloPatternTransport';
import { seekToMeasure, handleTimelineNavigate } from './transportNavigation';
import { stepExploreRoda } from './rodaStepExplorer';
import { launchSpeedTrainer, stopSpeedTrainerAudio } from './speedTrainerService';
import { getAudioEngine, trackInputs, channels, busChannels } from './audioEngineNodes';

export interface UseAudioSyncTransportHandlersProps {
  refs: any;
  setIsPlaying: (playing: boolean) => void;
  setIsLoading: (loading: boolean) => void;
  setSoloPatternPlayId: (id: number | null) => void;
  setSoloPatternVariationId: (id: string | null) => void;
  setCurrentMeasure: (m: number) => void;
}

export function useAudioSyncTransportHandlers({
  refs,
  setIsPlaying,
  setIsLoading,
  setSoloPatternPlayId,
  setSoloPatternVariationId,
  setCurrentMeasure,
}: UseAudioSyncTransportHandlersProps) {
  const onStop = useCallback((opts?: { resetToStart?: boolean }) => executeTransportStop({
    ...refs, audioEngine: getAudioEngine(), setIsPlaying, setSoloPatternPlayId, setCurrentMeasure,
  }, opts), [setCurrentMeasure, setSoloPatternPlayId, refs, setIsPlaying]);

  const onRewind = useCallback(() => executeTransportRewind({
    ...refs, audioEngine: getAudioEngine(), setCurrentMeasure,
  }), [setCurrentMeasure, refs]);

  const onTogglePlay = useCallback((opts?: any) => handleTogglePlay(opts, {
    ...refs, trackInputs, channels, busChannels, audioEngine: getAudioEngine(), setIsPlaying, setSoloPatternPlayId, setCurrentMeasure,
  }), [setCurrentMeasure, setSoloPatternPlayId, refs, setIsPlaying]);

  const onStartSolo = useCallback((id: number, vId?: string) => handleStartSoloPattern(id, vId, {
    ...refs, channels, busChannels, audioEngine: getAudioEngine(), setSoloPatternPlayId,
    setSoloPatternVariationId, setCurrentMeasure, setIsPlaying, setIsLoading, handleStop: onStop,
  }), [onStop, setCurrentMeasure, setSoloPatternPlayId, setSoloPatternVariationId, refs, setIsPlaying, setIsLoading]);

  const onStopSolo = useCallback(() => handleStopSoloPattern({
    ...refs, channels, busChannels, audioEngine: getAudioEngine(), setSoloPatternPlayId,
    setSoloPatternVariationId, setCurrentMeasure, setIsPlaying, setIsLoading, handleStop: onStop,
  }), [onStop, setCurrentMeasure, setSoloPatternPlayId, setSoloPatternVariationId, refs, setIsPlaying, setIsLoading]);

  const onSeek = useCallback((m: number, s: number = 0, st?: number) => seekToMeasure(m, s, st, {
    ...refs, audioEngine: getAudioEngine(), setCurrentMeasure,
  }), [setCurrentMeasure, refs]);

  const onNavigate = useCallback((m: number, s: number, st?: number, it: number = 1) => handleTimelineNavigate(m, s, st, it, {
    ...refs, audioEngine: getAudioEngine(), setCurrentMeasure,
  }), [setCurrentMeasure, refs]);

  const onStepExploreRoda = useCallback((dir: 'next' | 'prev') => stepExploreRoda(dir, {
    ...refs, audioEngine: getAudioEngine(), setCurrentMeasure,
  }), [setCurrentMeasure, refs]);

  const onLaunchSpeedTrainer = useCallback((cfg: any) => launchSpeedTrainer(cfg, {
    ...refs, audioEngine: getAudioEngine(), handleStop: onStop, setCurrentMeasure, setIsPlaying,
  }), [onStop, setCurrentMeasure, refs, setIsPlaying]);

  const onStopSpeedTrainer = useCallback(() => stopSpeedTrainerAudio({
    ...refs, audioEngine: getAudioEngine(), handleStop: onStop, setCurrentMeasure, setIsPlaying,
  }), [onStop, setCurrentMeasure, refs, setIsPlaying]);

  return {
    onStop,
    onRewind,
    onTogglePlay,
    onStartSolo,
    onStopSolo,
    onSeek,
    onNavigate,
    onStepExploreRoda,
    onLaunchSpeedTrainer,
    onStopSpeedTrainer,
  };
}
