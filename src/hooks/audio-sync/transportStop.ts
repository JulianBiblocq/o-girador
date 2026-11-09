import * as Tone from 'tone';
import { vocalEngineService } from '../../audio/vocalEngineService';
import { stopAllNativeOscillators } from '../../audio/nativeSynths';
import { flushVisualBuffers, purgeVisualTickBuffer, resetVisualTickBuffer, setLastAudibleTick } from '../../audio/visualTickBuffer';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { releaseWakeLock } from './wakeLockHelper';
import { resetLiveVariationLookahead } from './liveVariationLookaheadEngine';
import { tickSubscribers } from './audioSyncTypes';
import { AudioEngine } from '../../AudioEngine';
import { getAudioEngine } from './audioEngineNodes';

export interface TransportStopContext {
  autoStopTimeoutRef: { current: number | null };
  speedTrainerTimeoutsRef: { current: number[] };
  engineTimeoutsRef: { current: Set<number> };
  pendingMeasureRef: { current: number | null };
  pendingIterationRef: { current: number | null };
  soloPatternPlayIdRef: { current: number | null };
  mutedVoiceTracksRef: { current: Set<string | number> };
  hitTriggersRef: { current: any };
  lastPlayedPatternRef: { current: Record<number, any> };
  isPreRollActiveRef: { current: boolean };
  preRollRemainingMeasuresRef: { current: number };
  activeSequencerVocalsRef: { current: Map<string, any> };
  anticipatedMeasuresRef: { current: Set<string> };
  lastElapsedSecRef: { current: number };
  isPlayingRef: { current: boolean };
  anchoredMeasureStartSecRef: { current: number };
  anchoredMeasureIdxRef: { current: number };
  currentStepIndexRef: { current: number };
  hasFinishedRef: { current: boolean };
  isPlaybackEndingRef: { current: boolean };
  measureCountRef: { current: number };
  lastPlayedSignalIdRef: { current: string | null };
  tickEventDetailRef: { current: any };
  isLoopExitRequestedRef?: { current: boolean };
  currentLoopIterationRef?: { current: number };
  activeVariationsRef?: { current: Record<number, any> };
  audioEngine: AudioEngine | null;
  setIsPlaying: (playing: boolean) => void;
  setSoloPatternPlayId: (id: number | null) => void;
  setCurrentMeasure: (m: number) => void;
}

export function executeTransportStop(ctx: TransportStopContext): void {
  if (ctx.autoStopTimeoutRef.current) {
    clearTimeout(ctx.autoStopTimeoutRef.current);
    ctx.autoStopTimeoutRef.current = null;
  }

  ctx.speedTrainerTimeoutsRef.current.forEach((t) => clearTimeout(t));
  ctx.speedTrainerTimeoutsRef.current = [];
  const store = useSequencerStore.getState();
  if (store.isSpeedTrainerActive) {
    store.stopSpeedTrainer();
    Tone.Transport.bpm.value = store.bpm;
  }

  ctx.engineTimeoutsRef.current.forEach((t) => clearTimeout(t));
  ctx.engineTimeoutsRef.current.clear();
  ctx.pendingMeasureRef.current = null;
  ctx.pendingIterationRef.current = null;
  store.setCurrentLoopIteration(1);
  store.clearLoopExitRequest();
  store.setIsLoopBypassed(false);
  if ((store as any).clearQueuedMeasure) (store as any).clearQueuedMeasure();
  if (ctx.isLoopExitRequestedRef) ctx.isLoopExitRequestedRef.current = false;
  if (ctx.currentLoopIterationRef) ctx.currentLoopIterationRef.current = 1;
  if (ctx.soloPatternPlayIdRef.current !== null) ctx.setSoloPatternPlayId(null);

  const activeEngine = ctx.audioEngine || getAudioEngine();
  activeEngine?.stop();
  activeEngine?.releaseVoicePitch();
  activeEngine?.releaseAllVoices();
  ctx.mutedVoiceTracksRef.current.clear();

  if (activeEngine) {
    activeEngine.currentMeasure = 0; activeEngine.currentStep = 0;
    activeEngine.schedulingMeasure = 0; activeEngine.schedulingStep = 0;
    activeEngine.purgeScheduledHits();
  }

  Tone.Draw.cancel();
  flushVisualBuffers();
  purgeVisualTickBuffer();
  resetVisualTickBuffer();
  setLastAudibleTick(null);
  ctx.hitTriggersRef.current.clear();
  ctx.lastPlayedPatternRef.current = {};
  store.resetFirstPassRegistry();
  resetLiveVariationLookahead(ctx.activeVariationsRef);

  try {
    Tone.Transport.stop(); Tone.Transport.position = 0; Tone.Transport.seconds = 0;
  } catch (_) {}

  activeEngine?.stopAllBarulho();
  stopAllNativeOscillators();
  ctx.isPreRollActiveRef.current = false;
  ctx.preRollRemainingMeasuresRef.current = 0;
  store.setIsPreRolling(false);

  vocalEngineService.stopAllVocalPlayback();
  vocalEngineService.disposeAllVocalPlayers();
  ctx.activeSequencerVocalsRef.current.forEach((v) => { try { v.stop(); } catch (_) {} });
  ctx.activeSequencerVocalsRef.current.clear();
  ctx.anticipatedMeasuresRef.current.clear();
  ctx.lastElapsedSecRef.current = 0;
  ctx.setIsPlaying(false);
  ctx.isPlayingRef.current = false;
  releaseWakeLock();

  ctx.anchoredMeasureStartSecRef.current = 0;
  ctx.anchoredMeasureIdxRef.current = -1;
  ctx.currentStepIndexRef.current = -1;
  ctx.hasFinishedRef.current = false;
  ctx.isPlaybackEndingRef.current = false;
  ctx.measureCountRef.current = 0;
  ctx.setCurrentMeasure(0);
  store.setCurrentExpandedMeasureIdx(0);
  ctx.lastPlayedSignalIdRef.current = null;

  const detail = ctx.tickEventDetailRef.current;
  Object.assign(detail, {
    step: -1, measure: 0, maxTicks: 16, ratio: 0, visualStep16: 0, visualStep12: 0,
    time: Tone.context.currentTime, iteration: 1, measureStartTime: 0, measureDuration: 0,
    isPaused: false, isNavigation: false,
  });

  tickSubscribers.forEach((cb) => {
    try { cb(detail); } catch (err) { console.error(err); }
  });

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('o-girador-timeline-nav', { detail: { mIdx: 0, sIdx: 0 } }));
    window.dispatchEvent(new CustomEvent('o-girador-playback-stopped'));
  }
}
