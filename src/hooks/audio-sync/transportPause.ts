import * as Tone from 'tone';
import { vocalEngineService } from '../../audio/vocalEngineService';
import { stopAllNativeOscillators } from '../../audio/nativeSynths';
import { flushVisualBuffers, purgeVisualTickBuffer, getLastAudibleTick } from '../../audio/visualTickBuffer';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { releaseWakeLock } from './wakeLockHelper';
import { tickSubscribers } from './audioSyncTypes';
import { AudioEngine } from '../../AudioEngine';
import { getAudioEngine } from './audioEngineNodes';

export interface TransportPauseContext {
  isPreRollActiveRef: { current: boolean };
  preRollRemainingMeasuresRef: { current: number };
  audioEngine: AudioEngine | null;
  anchoredMeasureStartSecRef: { current: number };
  hitTriggersRef: { current: any };
  activeSequencerVocalsRef: { current: Map<string, any> };
  anticipatedMeasuresRef: { current: Set<string> };
  soloLoopCycleRef: { current: number };
  lastElapsedSecRef: { current: number };
  totalMeasuresRef: { current: number };
  measureCountRef: { current: number };
  currentStepIndexRef: { current: number };
  maxTicksRef: { current: number };
  tickEventDetailRef: { current: any };
  setIsPlaying: (p: boolean) => void;
  setCurrentMeasure: (m: number) => void;
}

export function executeTransportPause(ctx: TransportPauseContext): void {
  ctx.isPreRollActiveRef.current = false;
  ctx.preRollRemainingMeasuresRef.current = 0;
  useSequencerStore.getState().setIsPreRolling(false);
  const activeEngine = ctx.audioEngine || getAudioEngine();
  activeEngine?.stop();
  Tone.Transport.pause();
  ctx.anchoredMeasureStartSecRef.current = -1;
  Tone.Draw.cancel();
  flushVisualBuffers();
  purgeVisualTickBuffer();
  ctx.hitTriggersRef.current.clear();

  activeEngine?.stopAllBarulho();
  activeEngine?.releaseVoicePitch();
  stopAllNativeOscillators();

  vocalEngineService.stopAllVocalPlayback();
  vocalEngineService.disposeAllVocalPlayers();
  ctx.activeSequencerVocalsRef.current.forEach(v => { try { v.stop(); } catch (_) {} });
  ctx.activeSequencerVocalsRef.current.clear();
  useSequencerStore.getState().resetFirstPassRegistry();
  ctx.anticipatedMeasuresRef.current.clear();
  ctx.soloLoopCycleRef.current = 0;
  ctx.lastElapsedSecRef.current = 0;
  ctx.setIsPlaying(false);
  releaseWakeLock();

  const totalM = ctx.totalMeasuresRef.current || 1;
  const safeMeasure = Math.max(0, Math.min(ctx.measureCountRef.current, totalM - 1));
  ctx.measureCountRef.current = safeMeasure;
  ctx.setCurrentMeasure(safeMeasure);

  const audibleTick = getLastAudibleTick();
  const pausedStep = audibleTick ? audibleTick.step : 0;
  const rawPausedMeasure = audibleTick ? audibleTick.measure : safeMeasure;
  const pausedMeasure = Math.max(0, Math.min(rawPausedMeasure, totalM - 1));
  const pausedMaxTicks = audibleTick ? audibleTick.maxTicks : ctx.maxTicksRef.current;
  const ratioVal = audibleTick ? audibleTick.ratio : 0;

  if (audibleTick && audibleTick.measureDuration && audibleTick.measureDuration > 0) {
    const measureDurationSec = audibleTick.measureDuration;
    Tone.Transport.seconds = (pausedMeasure * measureDurationSec) + (ratioVal * measureDurationSec);
    if (ctx.audioEngine) {
      ctx.audioEngine.currentStep = pausedStep;
      ctx.audioEngine.currentMeasure = pausedMeasure;
    }
    ctx.currentStepIndexRef.current = pausedStep;
    ctx.setCurrentMeasure(pausedMeasure);
  }

  const detail = ctx.tickEventDetailRef.current;
  detail.step = pausedStep >= 0 ? pausedStep : 0;
  detail.measure = pausedMeasure;
  detail.maxTicks = pausedMaxTicks;
  detail.ratio = ratioVal;
  detail.visualStep16 = Math.floor(ratioVal * 16);
  detail.visualStep12 = Math.floor(ratioVal * 12);
  detail.time = Tone.context.currentTime;
  detail.iteration = audibleTick ? audibleTick.iteration : 1;
  detail.isPaused = true;

  tickSubscribers.forEach((cb) => {
    try { cb(detail); } catch (err) { console.error(err); }
  });
}
