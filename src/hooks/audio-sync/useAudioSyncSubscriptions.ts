import { useEffect } from 'react';
import * as Tone from 'tone';
import { useSequencerStore } from '../../stores/useSequencerStore';
import {
  areAllStudioWindowsHidden,
  purgeVisualTickBuffer,
  resetVisualTickBuffer,
  flushVisualBuffers,
} from '../../audio/visualTickBuffer';
import { rebuildWorkletHorizonFromNow } from '../../audio/worklet/horizon/percussionHorizonPusher';
import { isBalancoMorphCycleActive, resetLiveBalancoMorphToUnity } from '../../audio/groove/liveBalancoMorph';
import { getRodaMeasureGeometry } from '../../utils/rodaTimeSigGeometry';
import { SATELLITE_VISIBILITY_EVENT } from '../../utils/satelliteWindowWatcher';
import {
  busChannels, channels, distortionSends, getAudioEngine, masterVolumeNode, meters, reverbSends, trackInputs,
} from './audioEngineNodes';
import { syncTrackChannels } from './syncTrackChannels';

export interface UseAudioSyncSubscriptionsProps {
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;
  isPlayingRef?: React.MutableRefObject<boolean>;
  setIsPlayingRef?: React.MutableRefObject<(playing: boolean) => void>;
  bpm?: number;
  refs: any;
  onStop: () => void;
  onSeek: (m: number, s?: number, st?: number) => void;
  onNavigate: (m: number, s: number, st?: number, it?: number) => void;
}

export function useAudioSyncSubscriptions({
  isPlaying, setIsPlaying, isPlayingRef, setIsPlayingRef, bpm, refs, onStop, onSeek, onNavigate,
}: UseAudioSyncSubscriptionsProps): void {
  useEffect(() => {
    refs.isPlayingRef.current = isPlaying;
    if (isPlayingRef) isPlayingRef.current = isPlaying;
    if (useSequencerStore.getState().isPlaying !== isPlaying) {
      useSequencerStore.getState().setIsPlaying(isPlaying);
    }
    if (!isPlaying && isBalancoMorphCycleActive()) resetLiveBalancoMorphToUnity();
    if (typeof window !== 'undefined') (window as any).__IS_PLAYING__ = isPlaying;
  }, [isPlaying, isPlayingRef, refs.isPlayingRef]);

  useEffect(() => {
    if (setIsPlayingRef) setIsPlayingRef.current = setIsPlaying;
  }, [setIsPlayingRef, setIsPlaying]);

  useEffect(() => {
    if (bpm) Tone.Transport.bpm.value = bpm;
  }, [bpm]);

  useEffect(() => {
    return useSequencerStore.subscribe((state, prev) => {
      const practiceMuteChanged =
        state.mobileViewMode !== prev.mobileViewMode ||
        state.isRestOfEnsembleMuted !== prev.isRestOfEnsembleMuted ||
        state.tocarJuntoActive !== prev.tocarJuntoActive ||
        state.tocarJuntoTrackId !== prev.tocarJuntoTrackId ||
        state.tocarJuntoIsMuted !== prev.tocarJuntoIsMuted ||
        state.tocarJuntoMuteScope !== prev.tocarJuntoMuteScope ||
        state.focusTrackId !== prev.focusTrackId ||
        state.referenceTrackId !== prev.referenceTrackId ||
        state.isLetraActive !== prev.isLetraActive;

      if (practiceMuteChanged) {
        refs.familyMuteSetRef.current.clear();
        const eng = getAudioEngine();
        eng?.syncTracksToWorklet(state.tracks);
        if (refs.isAudioInitializedRef?.current) {
          syncTrackChannels({
            tracks: state.tracks, isEcoMode: state.isEcoMode, channels, meters, trackInputs, busChannels,
            reverbSends, distortionSends, lastAppliedTracksParamsRef: refs.lastAppliedTracksParamsRef,
            lastAppliedBussesRef: refs.lastAppliedBussesRef, masterVolumeNode, audioEngine: eng,
          });
        }
      }
      const squadCountChanged = state.tracks !== prev.tracks && state.tracks.some((t, idx) => {
        const prevT = prev.tracks[idx]?.id === t.id ? prev.tracks[idx] : prev.tracks.find((x) => x.id === t.id);
        return (t.sectionPlayers?.length ?? 0) !== (prevT?.sectionPlayers?.length ?? 0);
      });
      if (
        state.bpm !== prev.bpm ||
        state.measureBpms !== prev.measureBpms ||
        state.measureBpmTransitions !== prev.measureBpmTransitions ||
        state.ecoConfig?.disableFx !== prev.ecoConfig?.disableFx ||
        squadCountChanged
      ) {
        rebuildWorkletHorizonFromNow('bpm');
      }
    });
  }, [refs]);

  useEffect(() => {
    const handleVis = () => {
      if (areAllStudioWindowsHidden()) {
        if (refs.isPlayingRef.current) onStop();
      } else if (!document.hidden) {
        purgeVisualTickBuffer();
        resetVisualTickBuffer();
        flushVisualBuffers();
        refs.hitTriggersRef.current.clear();
        if (!refs.isPlayingRef.current) getAudioEngine()?.purgeScheduledHits();
      }
    };
    document.addEventListener('visibilitychange', handleVis);
    window.addEventListener(SATELLITE_VISIBILITY_EVENT, handleVis);
    return () => {
      document.removeEventListener('visibilitychange', handleVis);
      window.removeEventListener(SATELLITE_VISIBILITY_EVENT, handleVis);
    };
  }, [onStop, refs]);

  useEffect(() => {
    const handleTimelineNav = (e: Event) => {
      const customEvent = e as CustomEvent<{ mIdx: number; sIdx: number; iteration?: number }>;
      const { mIdx, sIdx, iteration } = customEvent.detail;
      if (sIdx === 0) onSeek(mIdx, 0);
      else {
        const st = useSequencerStore.getState();
        const mSig = st.measureTimeSigs?.[mIdx] || st.timeSig || '4/4';
        onNavigate(mIdx, sIdx, getRodaMeasureGeometry(mSig).defaultSteps, iteration ?? 1);
      }
    };
    window.addEventListener('o-girador-timeline-nav', handleTimelineNav);
    return () => window.removeEventListener('o-girador-timeline-nav', handleTimelineNav);
  }, [onSeek, onNavigate]);
}
