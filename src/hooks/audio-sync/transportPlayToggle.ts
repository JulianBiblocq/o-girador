import * as Tone from 'tone';
import { Track } from '../../types';
import { vocalEngineService } from '../../audio/vocalEngineService';
import { useAudioStore } from '../../stores/useAudioStore';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { useTransportStore } from '../../stores/useTransportStore';
import { requestWakeLock } from './wakeLockHelper';
import { executePreRollCountdown } from './audioSyncPreRollPlanner';
import { executeTransportPause, TransportPauseContext } from './transportPause';
import { getAudioEngine } from './audioEngineNodes';
import { applyResumeAnchorCompensation } from './transportResumeAnchor';
import { resolveTargetMeasureAndPreRoll } from './transportTargetMeasureResolver';

export interface PlayToggleContext extends TransportPauseContext {
  isStartingRef: { current: boolean }; isPlayingRef: { current: boolean };
  soloPatternPlayIdRef: { current: number | null }; autoStopTimeoutRef: { current: number | null };
  isPlaybackEndingRef: { current: boolean }; lastPlayedSignalIdRef: { current: string | null };
  tracksRef: { current: Track[] }; measureBpmsRef: { current: number[] };
  measureTimeSigsRef: { current: Record<number, string> }; targetPreRollMeasureRef: { current: number };
  engineTimeoutsRef: { current: Set<number> }; trackInputs: Record<string | number, Tone.Gain>;
  channels: Record<string | number, Tone.Channel>; busChannels: Record<string | number, Tone.Channel>;
  setSoloPatternPlayId: (id: number | null) => void;
}

export async function handleTogglePlay(
  playOptions: { skipPreRoll?: boolean; forcePreRoll?: boolean; targetMeasure?: number; scheduledStartTime?: number } | undefined,
  ctx: PlayToggleContext
): Promise<void> {
  if (ctx.isStartingRef.current) return;
  ctx.isStartingRef.current = true;
  try {
    const activeEngine = ctx.audioEngine || getAudioEngine();
    if (!useAudioStore.getState().isAudioUnlocked) useAudioStore.getState().unlockAudio();

    const rawCtx = (Tone.getContext().rawContext || Tone.context) as AudioContext;
    if (rawCtx && rawCtx.state !== 'running') {
      try { await rawCtx.resume(); } catch (_) {}
    }
    if (Tone.context && Tone.context.state !== 'running') {
      try { await Tone.context.resume(); } catch (_) {}
    }
    if (Tone.start) {
      try { await Tone.start(); } catch (_) {}
    }
    if (ctx.soloPatternPlayIdRef.current !== null) {
      ctx.setSoloPatternPlayId(null);
    }

    if (!ctx.isPlayingRef.current) {
      if (ctx.autoStopTimeoutRef.current) {
        clearTimeout(ctx.autoStopTimeoutRef.current);
        ctx.autoStopTimeoutRef.current = null;
      }
      ctx.isPlaybackEndingRef.current = false;
      ctx.lastPlayedSignalIdRef.current = null;
      activeEngine?.stopAllBarulho();

      if (activeEngine && activeEngine.bufferPool.size === 0) {
        try { await activeEngine.loadAllSamples(); } catch (_) {}
      }

      const pendingRehydration = vocalEngineService.getRehydratingPromise();
      if (pendingRehydration) {
        try { await pendingRehydration; } catch (_) {}
      }

      const preRoll = useTransportStore.getState().preRollSettings;
      const startTracks = ctx.tracksRef.current;
      const { targetM, shouldExecutePreRoll } = resolveTargetMeasureAndPreRoll(
        playOptions,
        ctx.measureCountRef.current,
        ctx.totalMeasuresRef.current,
        startTracks,
        ctx.measureTimeSigsRef.current,
        ctx.soloPatternPlayIdRef.current
      );
      ctx.targetPreRollMeasureRef.current = targetM;

      let scheduledMusicStartTime: number | undefined;

      if (shouldExecutePreRoll) {
        const targetSig = ctx.measureTimeSigsRef.current[targetM] || '4/4';
        const targetBpm = isNaN(ctx.measureBpmsRef.current[targetM]) || ctx.measureBpmsRef.current[targetM] <= 0
          ? (useSequencerStore.getState().bpm || 100) : ctx.measureBpmsRef.current[targetM];
        const measuresCount = (preRoll && preRoll.enabled) ? (preRoll.measuresCount || 1) : 1;

        scheduledMusicStartTime = executePreRollCountdown({
          targetM, measuresCount, targetSig, targetBpm, startTracks,
          soloPatternPlayId: ctx.soloPatternPlayIdRef.current,
          measureTimeSigs: ctx.measureTimeSigsRef.current,
          isPreRollActiveRef: ctx.isPreRollActiveRef,
          engineTimeoutsRef: ctx.engineTimeoutsRef,
          tickEventDetailRef: ctx.tickEventDetailRef,
          anticipatedMeasures: ctx.anticipatedMeasuresRef.current,
          activeSequencerVocals: ctx.activeSequencerVocalsRef.current,
          trackInputs: ctx.trackInputs,
          channels: ctx.channels,
          busChannels: ctx.busChannels
        });
      } else {
        ctx.isPreRollActiveRef.current = false;
        ctx.preRollRemainingMeasuresRef.current = 0;
        useSequencerStore.getState().setIsPreRolling(false);
      }

      if (activeEngine) {
        activeEngine.currentMeasure = targetM;
        activeEngine.currentStep = 0;
        activeEngine.schedulingMeasure = targetM;
        activeEngine.schedulingStep = 0;
      }
      ctx.currentStepIndexRef.current = -1;
      ctx.measureCountRef.current = targetM;

      if (Tone.Transport.state !== 'started') {
        Tone.Transport.position = `${targetM}:0:0`;
        Tone.Transport.start(scheduledMusicStartTime);
      }

      applyResumeAnchorCompensation(ctx.anchoredMeasureStartSecRef, ctx.tickEventDetailRef);

      activeEngine?.start(scheduledMusicStartTime);
      ctx.setIsPlaying(true);
      ctx.isPlayingRef.current = true;
      requestWakeLock();
    } else {
      executeTransportPause(ctx);
    }
  } finally {
    ctx.isStartingRef.current = false;
  }
}
