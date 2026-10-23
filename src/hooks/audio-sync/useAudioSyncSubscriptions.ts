/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect } from 'react';
import * as Tone from 'tone';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { purgeVisualTickBuffer, resetVisualTickBuffer, flushVisualBuffers } from '../../audio/visualTickBuffer';
import { getAudioEngine } from './audioEngineNodes';

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
  isPlaying,
  setIsPlaying,
  isPlayingRef,
  setIsPlayingRef,
  bpm,
  refs,
  onStop,
  onSeek,
  onNavigate,
}: UseAudioSyncSubscriptionsProps): void {
  useEffect(() => {
    refs.isPlayingRef.current = isPlaying;
    if (isPlayingRef) isPlayingRef.current = isPlaying;
    useSequencerStore.getState().setIsPlaying(isPlaying);
    if (typeof window !== 'undefined') {
      (window as any).__IS_PLAYING__ = isPlaying;
    }
  }, [isPlaying, isPlayingRef, refs.isPlayingRef]);

  useEffect(() => {
    if (setIsPlayingRef) {
      setIsPlayingRef.current = setIsPlaying;
    }
  }, [setIsPlayingRef, setIsPlaying]);

  useEffect(() => {
    if (bpm) {
      Tone.Transport.bpm.value = bpm;
    }
  }, [bpm]);

  useEffect(() => {
    return useSequencerStore.subscribe((state, prev) => {
      if (state.tocarJuntoActive !== prev.tocarJuntoActive || state.tocarJuntoTrackId !== prev.tocarJuntoTrackId) {
        refs.familyMuteSetRef.current.clear();
      }
    });
  }, [refs.familyMuteSetRef]);

  useEffect(() => {
    const handleVis = () => {
      if (document.hidden) {
        if (refs.isPlayingRef.current) onStop();
      } else {
        purgeVisualTickBuffer();
        resetVisualTickBuffer();
        flushVisualBuffers();
        refs.hitTriggersRef.current.clear();
        getAudioEngine()?.purgeScheduledHits();
      }
    };
    document.addEventListener('visibilitychange', handleVis);
    return () => document.removeEventListener('visibilitychange', handleVis);
  }, [onStop, refs]);

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
}
