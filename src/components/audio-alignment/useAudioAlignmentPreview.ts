/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import * as Tone from 'tone';
import { useAudio } from '../../contexts/AudioContext';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { createAlignmentPlayer, playScheduledPlayer } from './audioAlignmentPlayerScheduler';

export interface UseAudioAlignmentPreviewParams {
  audioBuffer: AudioBuffer;
  effectiveMeasure: number;
  anchorBpm: number;
  measureCycleDurationSec: number;
  trimStartSecRef: React.MutableRefObject<number>;
  trimEndSecRef: React.MutableRefObject<number>;
  sampleBpmRef: React.MutableRefObject<number>;
  nudgeMsRef: React.MutableRefObject<number>;
  calculateStartOffsetSec: (baseX: number, trimStart: number) => number;
  waveBaseXRef: React.MutableRefObject<number>;
}

export function useAudioAlignmentPreview(params: UseAudioAlignmentPreviewParams) {
  const {
    audioBuffer, effectiveMeasure, anchorBpm, measureCycleDurationSec,
    trimStartSecRef, trimEndSecRef, sampleBpmRef, nudgeMsRef,
    calculateStartOffsetSec, waveBaseXRef,
  } = params;

  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const isPlayingPreviewRef = useRef(false);
  const activePlayersRef = useRef<Tone.Player[]>([]);
  const previewLoopTimeoutRef = useRef<any>(null);
  const savedLoopStateRef = useRef<any>(null);

  const { handleTogglePlay, handleStop } = useAudio();

  const killSwitch = useCallback(() => {
    isPlayingPreviewRef.current = false;
    setIsPlayingPreview(false);
    if (previewLoopTimeoutRef.current) {
      clearTimeout(previewLoopTimeoutRef.current);
      previewLoopTimeoutRef.current = null;
    }
    activePlayersRef.current.forEach((p) => {
      try { p.stop(); p.disconnect(); p.dispose(); } catch (_) {}
    });
    activePlayersRef.current = [];
    try { Tone.Transport.stop(); Tone.Transport.cancel(); } catch (_) {}
    handleStop();
  }, [handleStop]);

  const scheduleVocalIteration = useCallback((iterationTime: number) => {
    if (!isPlayingPreviewRef.current) return;
    const tStart = trimStartSecRef.current;
    const duration = Math.max(0.05, trimEndSecRef.current - tStart);
    const player = createAlignmentPlayer(audioBuffer, sampleBpmRef.current, anchorBpm);
    playScheduledPlayer(player, iterationTime, tStart, duration);

    activePlayersRef.current.push(player as any);
    if (activePlayersRef.current.length > 3) {
      const old = activePlayersRef.current.shift();
      try { old?.dispose(); } catch (_) {}
    }

    const rawCtx = (Tone.getContext().rawContext || Tone.context) as AudioContext;
    const now = rawCtx ? rawCtx.currentTime : Tone.context.currentTime;
    const nextIterationTime = iterationTime + measureCycleDurationSec;
    const msUntilNext = (nextIterationTime - now - 0.1) * 1000;
    previewLoopTimeoutRef.current = setTimeout(() => {
      if (isPlayingPreviewRef.current) scheduleVocalIteration(nextIterationTime);
    }, Math.max(20, msUntilNext));
  }, [anchorBpm, audioBuffer, measureCycleDurationSec, sampleBpmRef, trimEndSecRef, trimStartSecRef]);

  const handleTogglePreview = async () => {
    if (isPlayingPreview) {
      killSwitch();
      if (savedLoopStateRef.current) {
        useSequencerStore.setState({ ...savedLoopStateRef.current });
        Tone.Transport.loop = savedLoopStateRef.current.isLooping;
        savedLoopStateRef.current = null;
      }
    } else {
      try {
        if (Tone.context.state !== 'running') await Tone.context.resume();
        await Tone.start();
      } catch (_) {}

      const cur = useSequencerStore.getState();
      savedLoopStateRef.current = {
        isLooping: cur.isLooping, loopStartMeasure: cur.loopStartMeasure,
        loopEndMeasure: cur.loopEndMeasure, isLoopRegionActive: cur.isLoopRegionActive,
      };

      useSequencerStore.setState({ isLooping: true, isLoopRegionActive: true, loopStartMeasure: effectiveMeasure, loopEndMeasure: effectiveMeasure });
      const totalOffsetSec = calculateStartOffsetSec(waveBaseXRef.current, trimStartSecRef.current) + (nudgeMsRef.current / 1000);
      const leadTime = totalOffsetSec < 0 ? Math.max(0.06, Math.abs(totalOffsetSec) + 0.05) : 0.06;

      const rawCtx = (Tone.getContext().rawContext || Tone.context) as AudioContext;
      const now = rawCtx ? rawCtx.currentTime : Tone.context.currentTime;
      const bateriaStartTime = now + leadTime;
      setIsPlayingPreview(true);
      isPlayingPreviewRef.current = true;

      await handleTogglePlay({ skipPreRoll: true, targetMeasure: effectiveMeasure, scheduledStartTime: bateriaStartTime });
      scheduleVocalIteration(bateriaStartTime + totalOffsetSec);
    }
  };

  useEffect(() => {
    return () => {
      killSwitch();
      if (savedLoopStateRef.current) {
        useSequencerStore.setState({ ...savedLoopStateRef.current });
        Tone.Transport.loop = savedLoopStateRef.current.isLooping;
      }
    };
  }, [killSwitch]);

  return { isPlayingPreview, killSwitch, handleTogglePreview, savedLoopStateRef };
}
