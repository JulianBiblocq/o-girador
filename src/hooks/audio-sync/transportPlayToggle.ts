import * as Tone from 'tone';
import { Track } from '../../types';
import { getMaxTicks } from '../../data';
import { isSamplePlaybackAllowed } from './vocalSampleHelpers';
import { vocalEngineService } from '../../audio/vocalEngineService';
import { useAudioStore } from '../../stores/useAudioStore';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { useTransportStore } from '../../stores/useTransportStore';
import { requestWakeLock } from './wakeLockHelper';
import { executePreRollCountdown } from './audioSyncPreRollPlanner';
import { executeTransportPause, TransportPauseContext } from './transportPause';
import { checkStartingVocalAnacrusis } from './startingAnacrusisChecker';
import { AudioEngine } from '../../AudioEngine';

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
    if (!useAudioStore.getState().isAudioUnlocked) useAudioStore.getState().unlockAudio();

    const rawCtx = (Tone.getContext().rawContext || Tone.context) as AudioContext;
    if (rawCtx && rawCtx.state !== 'running') {
      try { await rawCtx.resume(); } catch (_) {}
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
      ctx.audioEngine?.stopAllBarulho();

      if (ctx.audioEngine && ctx.audioEngine.bufferPool.size === 0) {
        try { await ctx.audioEngine.loadAllSamples(); } catch (_) {}
      }

      const pendingRehydration = vocalEngineService.getRehydratingPromise();
      if (pendingRehydration) {
        try { await pendingRehydration; } catch (_) {}
      }

      const preRoll = useTransportStore.getState().preRollSettings;
      const audioStore = useAudioStore.getState();
      const armedTargetMeasure = (audioStore.targetPatternId !== null && audioStore.targetMeasureIdx !== null)
        ? audioStore.targetMeasureIdx : null;

      let targetM: number;
      let shouldSkipPreRoll = playOptions?.skipPreRoll;

      if (playOptions?.targetMeasure !== undefined) {
        targetM = playOptions.targetMeasure % (ctx.totalMeasuresRef.current || 1);
      } else if (armedTargetMeasure !== null) {
        targetM = armedTargetMeasure >= 2 ? (armedTargetMeasure - 2) : 0;
        shouldSkipPreRoll = armedTargetMeasure === 0 ? false : true;
      } else {
        targetM = ctx.measureCountRef.current % (ctx.totalMeasuresRef.current || 1);
      }
      ctx.targetPreRollMeasureRef.current = targetM;

      let scheduledMusicStartTime: number | undefined;
      const startTracks = ctx.tracksRef.current;
      const hasVocalAnacrusisAtStart = checkStartingVocalAnacrusis(
        startTracks, targetM, ctx.measureTimeSigsRef.current, ctx.soloPatternPlayIdRef.current
      );

      const forcePreRollForAnacrusis = (hasVocalAnacrusisAtStart && !playOptions?.skipPreRoll);
      const shouldExecutePreRoll = (!shouldSkipPreRoll && ((preRoll && preRoll.enabled) || Boolean(playOptions?.forcePreRoll))) || forcePreRollForAnacrusis;

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

      if (ctx.audioEngine) {
        ctx.audioEngine.currentMeasure = targetM;
        ctx.audioEngine.currentStep = 0;
        ctx.audioEngine.schedulingMeasure = targetM;
        ctx.audioEngine.schedulingStep = 0;
      }
      ctx.currentStepIndexRef.current = -1;
      ctx.measureCountRef.current = targetM;

      if (Tone.Transport.state !== 'started') {
        Tone.Transport.position = `${targetM}:0:0`;
        Tone.Transport.start(scheduledMusicStartTime);
      }
      ctx.audioEngine?.start(scheduledMusicStartTime);
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
