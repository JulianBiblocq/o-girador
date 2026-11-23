import * as Tone from 'tone';
import { getMaxTicks } from '../../data';
import { vocalEngineService } from '../../audio/vocalEngineService';
import { stopAllNativeOscillators } from '../../audio/nativeSynths';
import { flushVisualBuffers, getLastAudibleTick, purgeVisualTickBuffer, resetVisualTickBuffer, setLastAudibleTick } from '../../audio/visualTickBuffer';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { useTransportStore } from '../../stores/useTransportStore';
import { getExpandedMeasures } from '../../utils/measureHelpers';
import { deactivateMultimediaAudioSession } from '../../audio/iosAudioSessionUnlock';
import { releaseWakeLock } from './wakeLockHelper';
import { resetLiveVariationLookahead } from './liveVariationLookaheadEngine';
import { clearFreeze, frozenPlaybackState } from './frozenPlaybackState';
import { tickSubscribers } from './audioSyncTypes';
import { AudioEngine } from '../../AudioEngine';
import { getAudioEngine } from './audioEngineNodes';

export interface TransportStopContext {
  autoStopTimeoutRef: { current: number | null }; speedTrainerTimeoutsRef: { current: number[] };
  engineTimeoutsRef: { current: Set<number> }; pendingMeasureRef: { current: number | null };
  pendingIterationRef: { current: number | null }; soloPatternPlayIdRef: { current: number | null };
  mutedVoiceTracksRef: { current: Set<string | number> }; hitTriggersRef: { current: any };
  lastPlayedPatternRef: { current: Record<number, any> }; isPreRollActiveRef: { current: boolean };
  preRollRemainingMeasuresRef: { current: number }; targetPreRollMeasureRef?: { current: number };
  totalMeasuresRef?: { current: number }; measureTimeSigsRef?: { current: Record<number, string> };
  activeSequencerVocalsRef: { current: Map<string, any> }; anticipatedMeasuresRef: { current: Set<string> };
  lastElapsedSecRef: { current: number }; isPlayingRef: { current: boolean };
  anchoredMeasureStartSecRef: { current: number }; anchoredMeasureIdxRef: { current: number };
  currentStepIndexRef: { current: number }; hasFinishedRef: { current: boolean };
  isPlaybackEndingRef: { current: boolean }; measureCountRef: { current: number };
  lastPlayedSignalIdRef: { current: string | null }; tickEventDetailRef: { current: any };
  isLoopExitRequestedRef?: { current: boolean }; currentLoopIterationRef?: { current: number };
  activeVariationsRef?: { current: Record<number, any> }; audioEngine: AudioEngine | null;
  setIsPlaying: (playing: boolean) => void; setSoloPatternPlayId: (id: number | null) => void;
  setCurrentMeasure: (m: number) => void;
}

export function executeTransportStop(ctx: TransportStopContext, opts?: { resetToStart?: boolean }): void {
  const store = useSequencerStore.getState();
  const wasPlaying = ctx.isPlayingRef.current;
  const wasPaused = useTransportStore.getState().isPaused || frozenPlaybackState.active;
  const wasPreRoll = ctx.isPreRollActiveRef.current;
  const rawTick = getLastAudibleTick();
  const audibleSnap = (!wasPreRoll && rawTick && !rawTick.isPreRoll) ? rawTick : null;

  const totalM = Math.max(1, ctx.totalMeasuresRef?.current ?? store.totalMeasures ?? 1);
  let rawRestingMeasure = 0;
  if (!opts?.resetToStart && (wasPlaying || wasPaused)) {
    if (wasPaused && frozenPlaybackState.active) rawRestingMeasure = frozenPlaybackState.measure;
    else if (wasPreRoll && ctx.targetPreRollMeasureRef) rawRestingMeasure = ctx.targetPreRollMeasureRef.current;
    else if (audibleSnap) rawRestingMeasure = audibleSnap.measure;
    else rawRestingMeasure = ctx.measureCountRef.current ?? store.currentMeasure ?? 0;
  }
  const restingMeasure = Math.max(0, Math.min(Math.max(0, totalM - 1), rawRestingMeasure));

  if (ctx.autoStopTimeoutRef.current) { clearTimeout(ctx.autoStopTimeoutRef.current); ctx.autoStopTimeoutRef.current = null; }
  ctx.speedTrainerTimeoutsRef.current.forEach((t) => clearTimeout(t));
  ctx.speedTrainerTimeoutsRef.current = [];
  if (store.isSpeedTrainerActive) { store.stopSpeedTrainer(); try { Tone.Transport.bpm.value = store.bpm; } catch (_) {} }

  ctx.engineTimeoutsRef.current.forEach((t) => clearTimeout(t));
  ctx.engineTimeoutsRef.current.clear();
  ctx.pendingMeasureRef.current = null; ctx.pendingIterationRef.current = null;
  store.setCurrentLoopIteration(1); store.clearLoopExitRequest(); store.setIsLoopBypassed(false);
  if ((store as any).clearQueuedMeasure) (store as any).clearQueuedMeasure();
  if (ctx.isLoopExitRequestedRef) ctx.isLoopExitRequestedRef.current = false;
  if (ctx.currentLoopIterationRef) ctx.currentLoopIterationRef.current = 1;
  if (ctx.soloPatternPlayIdRef.current !== null || useTransportStore.getState().soloPatternVariationId !== null) {
    ctx.soloPatternPlayIdRef.current = null;
    useTransportStore.getState().setSoloPatternPlayback(null, null);
  }

  const activeEngine = ctx.audioEngine || getAudioEngine();
  activeEngine?.stopAllBarulho(); activeEngine?.releaseVoicePitch(); activeEngine?.releaseAllVoices(); activeEngine?.stop();
  ctx.mutedVoiceTracksRef.current.clear();
  if (activeEngine) {
    activeEngine.currentMeasure = restingMeasure; activeEngine.currentStep = 0;
    activeEngine.schedulingMeasure = restingMeasure; activeEngine.schedulingStep = 0;
    activeEngine.purgeScheduledHits();
  }

  clearFreeze();
  useTransportStore.getState().setIsPaused(false);
  try { Tone.Draw?.cancel?.(); } catch (_) {}
  flushVisualBuffers(); purgeVisualTickBuffer(); resetVisualTickBuffer(); setLastAudibleTick(null);
  ctx.hitTriggersRef.current.clear(); ctx.lastPlayedPatternRef.current = {};
  store.resetFirstPassRegistry();
  resetLiveVariationLookahead(ctx.activeVariationsRef);
  try { Tone.Transport.stop(); Tone.Transport.position = `${restingMeasure}:0:0`; } catch (_) {}

  stopAllNativeOscillators();
  ctx.isPreRollActiveRef.current = false; ctx.preRollRemainingMeasuresRef.current = 0;
  store.setIsPreRolling(false);
  vocalEngineService.stopAllVocalPlayback(); vocalEngineService.disposeAllVocalPlayers();
  ctx.activeSequencerVocalsRef.current.forEach((v) => { try { v.stop(); } catch (_) {} });
  ctx.activeSequencerVocalsRef.current.clear(); ctx.anticipatedMeasuresRef.current.clear();
  ctx.lastElapsedSecRef.current = 0; ctx.isPlayingRef.current = false; ctx.setIsPlaying(false);
  deactivateMultimediaAudioSession();
  releaseWakeLock();

  ctx.anchoredMeasureStartSecRef.current = 0; ctx.anchoredMeasureIdxRef.current = -1;
  ctx.currentStepIndexRef.current = -1; ctx.hasFinishedRef.current = false; ctx.isPlaybackEndingRef.current = false;
  ctx.measureCountRef.current = restingMeasure; ctx.setCurrentMeasure(restingMeasure);
  const expanded = getExpandedMeasures(totalM, store.songSections);
  const expIdx = expanded.findIndex((item) => item.baseMeasure === restingMeasure);
  store.setCurrentExpandedMeasureIdx(expIdx !== -1 ? expIdx : restingMeasure);
  ctx.lastPlayedSignalIdRef.current = null;

  const restSig = ctx.measureTimeSigsRef?.current?.[restingMeasure] || store.measureTimeSigs?.[restingMeasure] || store.timeSig || '4/4';
  const detail = ctx.tickEventDetailRef.current;
  Object.assign(detail, {
    step: -1, measure: restingMeasure, maxTicks: getMaxTicks(restSig as any), ratio: 0,
    visualStep16: 0, visualStep12: 0, time: Tone.context?.currentTime ?? 0, iteration: 1,
    measureStartTime: 0, measureDuration: 0, isPaused: false, isNavigation: false,
  });
  tickSubscribers.forEach((cb) => { try { cb(detail); } catch (err) { console.error(err); } });
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('o-girador-playback-stopped'));
}
