import * as Tone from 'tone';
import { vocalEngineService } from '../../audio/vocalEngineService';
import { stopAllNativeOscillators } from '../../audio/nativeSynths';
import { flushVisualBuffers, purgeVisualTickBuffer, resetVisualTickBuffer } from '../../audio/visualTickBuffer';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { releaseWakeLock } from './wakeLockHelper';
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

  ctx.speedTrainerTimeoutsRef.current.forEach(t => clearTimeout(t));
  ctx.speedTrainerTimeoutsRef.current = [];
  if (useSequencerStore.getState().isSpeedTrainerActive) {
    useSequencerStore.getState().stopSpeedTrainer();
    Tone.Transport.bpm.value = useSequencerStore.getState().bpm;
  }

  ctx.engineTimeoutsRef.current.forEach(t => clearTimeout(t));
  ctx.engineTimeoutsRef.current.clear();
  ctx.pendingMeasureRef.current = null;
  ctx.pendingIterationRef.current = null;
  useSequencerStore.getState().setCurrentLoopIteration(1);
  useSequencerStore.getState().clearLoopExitRequest();
  if (ctx.soloPatternPlayIdRef.current !== null) {
    ctx.setSoloPatternPlayId(null);
  }

  const activeEngine = ctx.audioEngine || getAudioEngine();
  activeEngine?.stop();
  activeEngine?.releaseVoicePitch();
  activeEngine?.releaseAllVoices();
  ctx.mutedVoiceTracksRef.current.clear();

  if (activeEngine) {
    activeEngine.currentMeasure = 0;
    activeEngine.currentStep = 0;
    activeEngine.schedulingMeasure = 0;
    activeEngine.schedulingStep = 0;
    activeEngine.purgeScheduledHits();
  }

  Tone.Draw.cancel();
  flushVisualBuffers();
  purgeVisualTickBuffer();
  resetVisualTickBuffer();
  ctx.hitTriggersRef.current.clear();
  ctx.lastPlayedPatternRef.current = {};
  useSequencerStore.getState().resetFirstPassRegistry();

  try {
    Tone.Transport.stop();
    Tone.Transport.position = 0;
    Tone.Transport.seconds = 0;
  } catch (_) {}

  activeEngine?.stopAllBarulho();
  stopAllNativeOscillators();
  ctx.isPreRollActiveRef.current = false;
  ctx.preRollRemainingMeasuresRef.current = 0;
  useSequencerStore.getState().setIsPreRolling(false);

  vocalEngineService.stopAllVocalPlayback();
  vocalEngineService.disposeAllVocalPlayers();
  ctx.activeSequencerVocalsRef.current.forEach(v => { try { v.stop(); } catch (_) {} });
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
  ctx.lastPlayedSignalIdRef.current = null;

  const detail = ctx.tickEventDetailRef.current;
  detail.step = -1;
  detail.measure = 0;
  detail.maxTicks = 16;
  detail.ratio = 0;
  detail.visualStep16 = 0;
  detail.visualStep12 = 0;
  detail.time = Tone.context.currentTime;
  detail.iteration = 1;
  detail.measureStartTime = 0;
  detail.measureDuration = 0;
  detail.isPaused = false;
  detail.isNavigation = false;

  tickSubscribers.forEach((cb) => {
    try { cb(detail); } catch (err) { console.error(err); }
  });
}
