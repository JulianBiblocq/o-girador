import * as Tone from 'tone';
import { Track } from '../../types';
import { useAudioStore } from '../../stores/useAudioStore';
import { useTransportStore } from '../../stores/useTransportStore';
import { vocalEngineService } from '../../audio/vocalEngineService';
import { stopAllNativeOscillators } from '../../audio/nativeSynths';
import { flushVisualBuffers, purgeVisualTickBuffer, setLastAudibleTick } from '../../audio/visualTickBuffer';
import { extractActiveInstrumentsFromTracks } from '../../audio/engine/activeTrackPreloadExtractor';
import { AudioEngine } from '../../AudioEngine';
import { getAudioEngine } from './audioEngineNodes';
import { buildFlatSongSchedule } from '../../workers/compiler/flatScheduleBuilder';
import { instrumentsConfig } from '../../data';
import { cancelAudioContextAutoSuspend, safeResumeAudioContext } from '../../audio/audioContextSuspendManager';
import { restoreStoreChannelGains } from './realtimeFaderAudioUpdater';
import { clearFreeze } from './frozenPlaybackState';
import { resetWorkletHorizonState } from '../../audio/worklet/horizon/percussionHorizonPusher';
import { findConcretePatternOwnerTrack } from '../../utils/soloVariationMatcher';
import { resetLiveVariationLookahead } from './liveVariationLookaheadEngine';
import { openSoloFamilyAndBusGains, primeSoloVariationLookahead, tryHotSwapSoloPattern } from './soloPatternSetupHelper';

export interface SoloTransportContext {
  tracksRef: { current: Track[] };
  savedSoloMuteStateRef: { current: any };
  channels: Record<string | number, Tone.Channel>;
  busChannels: Record<string | number, Tone.Channel>;
  lastAppliedTracksParamsRef: { current: Record<string | number, string> };
  soloLoopCycleRef: { current: number };
  currentStepIndexRef: { current: number };
  measureCountRef: { current: number };
  isPlaybackEndingRef: { current: boolean };
  lastPlayedSignalIdRef: { current: string | null };
  isPlayingRef: { current: boolean };
  audioEngine: AudioEngine | null;
  setSoloPatternPlayId: (id: number | null) => void;
  setSoloPatternVariationId: (id: string | null) => void;
  setCurrentMeasure: (m: number) => void;
  setIsPlaying: (p: boolean) => void;
  setIsLoading: (l: boolean) => void;
  handleStop: () => void;
  soloPatternPlayIdRef?: { current: number | null };
  soloPatternVariationIdRef?: { current: string | null };
  flatCompiledScheduleRef?: { current: Float64Array | null };
  totalMeasuresRef?: { current: number };
  measureTimeSigsRef?: { current: Record<number, string> };
  activeVariationsRef?: { current: Record<number, any> };
}

export async function handleStartSoloPattern(patternId: number, variationId: string | undefined, ctx: SoloTransportContext): Promise<void> {
  if (!useAudioStore.getState().isAudioUnlocked) useAudioStore.getState().unlockAudio();
  cancelAudioContextAutoSuspend();
  await safeResumeAudioContext();
  if (Tone.start) { try { await Tone.start(); } catch (_) {} }

  const activeEngine = ctx.audioEngine || getAudioEngine();
  const currentTracks = ctx.tracksRef.current;
  const soloTrack = findConcretePatternOwnerTrack(currentTracks, patternId);
  const soloPattern = soloTrack?.patterns?.find((p: any) => String(p.id) === String(patternId));
  const firstAssignedMeasure = soloPattern?.measureAssignments?.findIndex((a: boolean) => a === true) ?? -1;
  const targetMeasure = firstAssignedMeasure >= 0 ? firstAssignedMeasure : 0;
  const effectiveVarId = variationId || 'ensemble';
  const rawSigs = ctx.measureTimeSigsRef?.current;
  const totalMeasures = ctx.totalMeasuresRef?.current || 1;
  const timeSigs: string[] = Array.isArray(rawSigs) ? rawSigs : Array.from({ length: totalMeasures }, (_, i) => rawSigs?.[i] || '4/4');

  if (tryHotSwapSoloPattern({ patternId, effectiveVarId, targetMeasure, totalMeasures, timeSigs, soloTrack, currentTracks, activeEngine, ctx })) {
    return;
  }

  activeEngine?.stop(); Tone.Transport.stop(); activeEngine?.stopAllBarulho();
  activeEngine?.purgeScheduledHits();
  stopAllNativeOscillators(); vocalEngineService.stopAllVocalPlayback();
  clearFreeze(); useTransportStore.getState().setIsPaused(false);
  flushVisualBuffers(); purgeVisualTickBuffer(); setLastAudibleTick(null);
  resetWorkletHorizonState();
  resetLiveVariationLookahead(ctx.activeVariationsRef);

  openSoloFamilyAndBusGains({ soloTrack, currentTracks, channels: ctx.channels, busChannels: ctx.busChannels, savedSoloMuteStateRef: ctx.savedSoloMuteStateRef });
  if (ctx.soloPatternPlayIdRef) ctx.soloPatternPlayIdRef.current = patternId;
  if (ctx.soloPatternVariationIdRef) ctx.soloPatternVariationIdRef.current = effectiveVarId;
  useTransportStore.getState().setSoloPatternPlayback(patternId, effectiveVarId);

  ctx.soloLoopCycleRef.current = 0; ctx.currentStepIndexRef.current = -1;
  ctx.measureCountRef.current = targetMeasure; ctx.isPlaybackEndingRef.current = false;
  ctx.setCurrentMeasure(targetMeasure); Tone.Transport.seconds = 0; ctx.lastPlayedSignalIdRef.current = null;

  if (ctx.flatCompiledScheduleRef) {
    ctx.flatCompiledScheduleRef.current = buildFlatSongSchedule(currentTracks, totalMeasures, timeSigs, instrumentsConfig, patternId, effectiveVarId, false) as any;
  }
  primeSoloVariationLookahead({ targetMeasure, totalMeasures, currentTracks, measureTimeSigs: timeSigs, patternId, effectiveVarId, activeVariationsRef: ctx.activeVariationsRef });

  if (activeEngine) {
    try { await activeEngine.syncActiveInstrumentsMemory(extractActiveInstrumentsFromTracks(currentTracks)); } catch (_) {}
    await activeEngine.waitForWorkletReady();
    activeEngine.syncTracksToWorklet(currentTracks);
    activeEngine.currentMeasure = targetMeasure; activeEngine.currentStep = 0;
    activeEngine.schedulingMeasure = targetMeasure; activeEngine.schedulingStep = 0;
  }

  ctx.setIsLoading(true);
  try { if (Tone.loaded) await Tone.loaded(); await new Promise((resolve) => setTimeout(resolve, 60)); } catch (_) {} finally { ctx.setIsLoading(false); }
  cancelAudioContextAutoSuspend();
  await safeResumeAudioContext();
  if (Tone.Transport.state !== 'started') Tone.Transport.start();
  activeEngine?.start();
  ctx.setIsPlaying(true); ctx.isPlayingRef.current = true;
}

export function handleStopSoloPattern(ctx: SoloTransportContext): void {
  const tracks = ctx.tracksRef.current;
  if (ctx.savedSoloMuteStateRef.current) {
    restoreStoreChannelGains(tracks, ctx.channels, ctx.busChannels);
    ctx.savedSoloMuteStateRef.current = null;
  }
  ctx.lastAppliedTracksParamsRef.current = {};
  if (ctx.soloPatternPlayIdRef) ctx.soloPatternPlayIdRef.current = null;
  if (ctx.soloPatternVariationIdRef) ctx.soloPatternVariationIdRef.current = null;
  useTransportStore.getState().setSoloPatternPlayback(null, null);
  ctx.soloLoopCycleRef.current = 0;
  resetWorkletHorizonState();
  resetLiveVariationLookahead(ctx.activeVariationsRef);
  const activeEngine = ctx.audioEngine || getAudioEngine();
  activeEngine?.purgeScheduledHits();
  activeEngine?.syncTracksToWorklet(tracks);
  if (ctx.isPlayingRef.current) ctx.handleStop();
}
