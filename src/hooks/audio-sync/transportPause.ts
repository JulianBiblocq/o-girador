import * as Tone from 'tone';
import { vocalEngineService } from '../../audio/vocalEngineService';
import { stopAllNativeOscillators } from '../../audio/nativeSynths';
import { flushVisualBuffers, purgeVisualTickBuffer, getLastAudibleTick, setLastAudibleTick } from '../../audio/visualTickBuffer';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { getExpandedMeasures } from '../../utils/measureHelpers';
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
  currentLoopIterationRef?: { current: number };
  isPlayingRef: { current: boolean };
  setIsPlaying: (p: boolean) => void;
  setCurrentMeasure: (m: number) => void;
}

export function executeTransportPause(ctx: TransportPauseContext): void {
  const audibleTickSnapshot = getLastAudibleTick() ? { ...getLastAudibleTick()! } : null;
  ctx.isPreRollActiveRef.current = false;
  ctx.preRollRemainingMeasuresRef.current = 0;
  const store = useSequencerStore.getState();
  store.setIsPreRolling(false);
  const activeEngine = ctx.audioEngine || getAudioEngine();
  activeEngine?.stop();
  Tone.Transport.pause();
  ctx.anchoredMeasureStartSecRef.current = -1;
  Tone.Draw.cancel();
  flushVisualBuffers();
  purgeVisualTickBuffer();
  setLastAudibleTick(null);
  ctx.hitTriggersRef.current.clear();

  activeEngine?.stopAllBarulho();
  activeEngine?.releaseVoicePitch();
  stopAllNativeOscillators();

  vocalEngineService.stopAllVocalPlayback();
  vocalEngineService.disposeAllVocalPlayers();
  ctx.activeSequencerVocalsRef.current.forEach(v => { try { v.stop(); } catch (_) {} });
  ctx.activeSequencerVocalsRef.current.clear();
  store.resetFirstPassRegistry();
  ctx.anticipatedMeasuresRef.current.clear();
  ctx.soloLoopCycleRef.current = 0;
  ctx.lastElapsedSecRef.current = 0;
  ctx.setIsPlaying(false);
  ctx.isPlayingRef.current = false;
  releaseWakeLock();

  const totalM = ctx.totalMeasuresRef.current || 1;
  const safeMeasure = Math.max(0, Math.min(ctx.measureCountRef.current, totalM - 1));
  const pausedStep = audibleTickSnapshot ? audibleTickSnapshot.step : 0;
  const rawPausedMeasure = audibleTickSnapshot ? audibleTickSnapshot.measure : safeMeasure;
  const pausedMeasure = Math.max(0, Math.min(rawPausedMeasure, totalM - 1));
  const pausedMaxTicks = audibleTickSnapshot ? audibleTickSnapshot.maxTicks : ctx.maxTicksRef.current;
  const ratioVal = audibleTickSnapshot ? audibleTickSnapshot.ratio : 0;
  const pausedIter = audibleTickSnapshot ? audibleTickSnapshot.iteration : 1;
  const pausedLoopIter = audibleTickSnapshot?.loopIteration ?? ctx.currentLoopIterationRef?.current ?? 1;

  ctx.measureCountRef.current = pausedMeasure;
  ctx.setCurrentMeasure(pausedMeasure);
  store.setCurrentLoopIteration(pausedLoopIter);

  const expanded = getExpandedMeasures(totalM, store.songSections);
  const expIdx = expanded.findIndex(item => item.baseMeasure === pausedMeasure && item.iteration === pausedIter);
  const fallbackExpIdx = expIdx !== -1 ? expIdx : expanded.findIndex(item => item.baseMeasure === pausedMeasure);
  store.setCurrentExpandedMeasureIdx(fallbackExpIdx !== -1 ? fallbackExpIdx : pausedMeasure);

  if (audibleTickSnapshot && audibleTickSnapshot.measureDuration && audibleTickSnapshot.measureDuration > 0) {
    const measureDurationSec = audibleTickSnapshot.measureDuration;
    Tone.Transport.seconds = (pausedMeasure * measureDurationSec) + (ratioVal * measureDurationSec);
    if (ctx.audioEngine) {
      ctx.audioEngine.currentStep = pausedStep;
      ctx.audioEngine.currentMeasure = pausedMeasure;
    }
    ctx.currentStepIndexRef.current = pausedStep;
  }

  const detail = ctx.tickEventDetailRef.current;
  detail.step = pausedStep >= 0 ? pausedStep : 0;
  detail.measure = pausedMeasure;
  detail.maxTicks = pausedMaxTicks;
  detail.ratio = ratioVal;
  detail.visualStep16 = Math.floor(ratioVal * 16);
  detail.visualStep12 = Math.floor(ratioVal * 12);
  detail.time = Tone.context.currentTime;
  detail.iteration = pausedIter;
  detail.loopIteration = pausedLoopIter;
  detail.isPaused = true;

  tickSubscribers.forEach((cb) => {
    try { cb(detail); } catch (err) { console.error(err); }
  });
}
