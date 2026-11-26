import * as Tone from 'tone';
import { Track } from '../../types';
import { unlockAudioOnUserGestureSync } from '../../audio/audioContextSuspendManager';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { useTransportStore } from '../../stores/useTransportStore';
import { requestWakeLock } from './wakeLockHelper';
import { executePreRollCountdown } from './audioSyncPreRollPlanner';
import { executeTransportPause, TransportPauseContext } from './transportPause';
import { getAudioEngine } from './audioEngineNodes';
import { prepareTransportResume, ResumePreparationContext } from './transportResumeAnchor';
import { clearFreeze, frozenPlaybackState } from './frozenPlaybackState';
import { resolveTargetMeasureAndPreRoll } from './transportTargetMeasureResolver';
import { bumpVariationSessionSeed } from '../../utils/deterministicVariationRng';
import { ensureTransportPlayReady } from './transportPlayReadiness';

export interface PlayToggleContext extends TransportPauseContext, ResumePreparationContext {
  isStartingRef: { current: boolean }; isStartingPlayRef?: { current: boolean }; isPlayingRef: { current: boolean };
  soloPatternPlayIdRef: { current: number | null }; soloPatternVariationIdRef?: { current: string | null };
  autoStopTimeoutRef: { current: number | null };
  isPlaybackEndingRef: { current: boolean }; lastPlayedSignalIdRef: { current: string | null };
  tracksRef: { current: Track[] }; measureBpmsRef: { current: number[] };
  measureTimeSigsRef: { current: Record<number, string> }; targetPreRollMeasureRef: { current: number };
  engineTimeoutsRef: { current: Set<number> }; trackInputs: Record<string | number, Tone.Gain>;
  channels: Record<string | number, Tone.Channel>; busChannels: Record<string | number, Tone.Channel>;
  flatCompiledScheduleRef?: { current: Float64Array | null };
  lastAppliedTracksParamsRef?: { current: Record<string | number, string> };
  lastAppliedBussesRef?: { current: Record<string | number, string | number | null> };
  setSoloPatternPlayId: (id: number | null) => void;
  setIsLoading?: (loading: boolean) => void;
}

export async function handleTogglePlay(
  playOptions: { skipPreRoll?: boolean; forcePreRoll?: boolean; targetMeasure?: number; scheduledStartTime?: number } | undefined,
  ctx: PlayToggleContext
): Promise<void> {
  // Ligne 1 100 % synchrone sur le geste utilisateur : bascule `playback` + réveil natif immédiat
  if (!ctx.isPlayingRef.current) {
    unlockAudioOnUserGestureSync((ctx.audioEngine || getAudioEngine())?.getAudioContext?.());
  }
  if (ctx.isStartingPlayRef?.current || ctx.isStartingRef.current) return;

  if (ctx.isPlayingRef.current) {
    if (ctx.soloPatternPlayIdRef.current !== null || useTransportStore.getState().soloPatternVariationId !== null) {
      ctx.soloPatternPlayIdRef.current = null;
      useTransportStore.getState().setSoloPatternPlayback(null, null);
    }
    executeTransportPause(ctx);
    return;
  }

  ctx.isStartingRef.current = true;
  if (ctx.isStartingPlayRef) ctx.isStartingPlayRef.current = true;
  try {
    const activeEngine = ctx.audioEngine || getAudioEngine();

    if (ctx.soloPatternPlayIdRef.current !== null || useTransportStore.getState().soloPatternVariationId !== null) {
      ctx.soloPatternPlayIdRef.current = null;
      useTransportStore.getState().setSoloPatternPlayback(null, null);
    }

    if (ctx.autoStopTimeoutRef.current) { clearTimeout(ctx.autoStopTimeoutRef.current); ctx.autoStopTimeoutRef.current = null; }
    ctx.isPlaybackEndingRef.current = false;
    ctx.lastPlayedSignalIdRef.current = null;
    activeEngine?.stopAllBarulho();

    const startTracks = await ensureTransportPlayReady(activeEngine, ctx);

    const isResumeFromPause = Boolean(
      useTransportStore.getState().isPaused && frozenPlaybackState.active &&
      !playOptions?.forcePreRoll && playOptions?.targetMeasure === undefined
    );
    if (isResumeFromPause) {
      ctx.isPreRollActiveRef.current = false;
      ctx.preRollRemainingMeasuresRef.current = 0;
      useSequencerStore.getState().setIsPreRolling(false);
      const resumeStartTime = prepareTransportResume(ctx, activeEngine);
      activeEngine?.start(resumeStartTime);
      ctx.setIsPlaying(true); ctx.isPlayingRef.current = true;
      requestWakeLock();
      return;
    }

    clearFreeze();
    bumpVariationSessionSeed();
    useTransportStore.getState().setIsPaused(false);
    const preRoll = useTransportStore.getState().preRollSettings;
    const { targetM, shouldExecutePreRoll } = resolveTargetMeasureAndPreRoll(
      playOptions, ctx.measureCountRef.current, ctx.totalMeasuresRef.current,
      startTracks, ctx.measureTimeSigsRef.current, ctx.soloPatternPlayIdRef.current
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
        soloPatternPlayId: ctx.soloPatternPlayIdRef.current, measureTimeSigs: ctx.measureTimeSigsRef.current,
        isPreRollActiveRef: ctx.isPreRollActiveRef, engineTimeoutsRef: ctx.engineTimeoutsRef,
        tickEventDetailRef: ctx.tickEventDetailRef, anticipatedMeasures: ctx.anticipatedMeasuresRef.current,
        activeSequencerVocals: ctx.activeSequencerVocalsRef.current,
        trackInputs: ctx.trackInputs, channels: ctx.channels, busChannels: ctx.busChannels,
      });
    } else {
      ctx.isPreRollActiveRef.current = false;
      ctx.preRollRemainingMeasuresRef.current = 0;
      useSequencerStore.getState().setIsPreRolling(false);
    }

    if (activeEngine) {
      activeEngine.currentMeasure = targetM; activeEngine.currentStep = 0;
      activeEngine.schedulingMeasure = targetM; activeEngine.schedulingStep = 0;
    }
    ctx.currentStepIndexRef.current = -1;
    ctx.measureCountRef.current = targetM;
    try {
      if (Tone.Transport && Tone.Transport.state !== 'started' && typeof Tone.Transport.start === 'function') {
        Tone.Transport.position = `${targetM}:0:0`;
        Tone.Transport.start(scheduledMusicStartTime);
      }
    } catch (_) {}
    activeEngine?.start(scheduledMusicStartTime);
    ctx.setIsPlaying(true); ctx.isPlayingRef.current = true;
    requestWakeLock();
  } finally {
    ctx.isStartingRef.current = false;
    if (ctx.isStartingPlayRef) ctx.isStartingPlayRef.current = false;
  }
}
