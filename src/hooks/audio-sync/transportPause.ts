import * as Tone from 'tone';
import { vocalEngineService } from '../../audio/vocalEngineService';
import { stopAllNativeOscillators } from '../../audio/nativeSynths';
import { flushVisualBuffers, purgeVisualTickBuffer, getLastAudibleTick, setLastAudibleTick } from '../../audio/visualTickBuffer';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { useTransportStore } from '../../stores/useTransportStore';
import { getExpandedMeasures } from '../../utils/measureHelpers';
import { getRodaMeasureGeometry } from '../../utils/rodaTimeSigGeometry';
import { getPhysicalStepFromRatio } from '../../components/circle-sequencer/measurePatternHelpers';
import { deactivateMultimediaAudioSession } from '../../audio/iosAudioSessionUnlock';
import { releaseWakeLock } from './wakeLockHelper';
import { tickSubscribers } from './audioSyncTypes';
import { AudioEngine } from '../../AudioEngine';
import { getAudioEngine } from './audioEngineNodes';
import { freezeAt } from './frozenPlaybackState';

export interface TransportPauseContext {
  isPreRollActiveRef: { current: boolean };
  preRollRemainingMeasuresRef: { current: number };
  targetPreRollMeasureRef?: { current: number };
  engineTimeoutsRef?: { current: Set<number> };
  measureTimeSigsRef?: { current: Record<number, string> };
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
  const wasPreRoll = ctx.isPreRollActiveRef.current;
  const rawTickSnap = getLastAudibleTick();
  const audibleTickSnapshot = (!wasPreRoll && rawTickSnap && !rawTickSnap.isPreRoll) ? { ...rawTickSnap } : null;

  ctx.isPlayingRef.current = false;
  ctx.setIsPlaying(false);
  ctx.isPreRollActiveRef.current = false;
  ctx.preRollRemainingMeasuresRef.current = 0;
  ctx.engineTimeoutsRef?.current.forEach((t) => clearTimeout(t));
  ctx.engineTimeoutsRef?.current.clear();

  const store = useSequencerStore.getState();
  store.setIsPreRolling(false);
  const activeEngine = ctx.audioEngine || getAudioEngine();
  const nowAudio = activeEngine ? activeEngine.getCurrentTime() : Tone.context.currentTime;

  activeEngine?.stopAllBarulho();
  activeEngine?.releaseVoicePitch();
  activeEngine?.stop();
  stopAllNativeOscillators();
  try { Tone.Transport.pause(); } catch (_) {}
  ctx.anchoredMeasureStartSecRef.current = -1;
  try { Tone.Draw?.cancel?.(); } catch (_) {}
  flushVisualBuffers();
  purgeVisualTickBuffer();
  setLastAudibleTick(null);
  ctx.hitTriggersRef.current.clear();

  vocalEngineService.stopAllVocalPlayback();
  ctx.activeSequencerVocalsRef.current.forEach((v) => { try { v.stop(); } catch (_) {} });
  ctx.activeSequencerVocalsRef.current.clear();
  ctx.anticipatedMeasuresRef.current.clear();
  ctx.lastElapsedSecRef.current = 0;
  deactivateMultimediaAudioSession();
  releaseWakeLock();

  const totalM = Math.max(1, ctx.totalMeasuresRef.current || 1);
  const fallbackM = wasPreRoll ? (ctx.targetPreRollMeasureRef?.current ?? ctx.measureCountRef.current) : ctx.measureCountRef.current;
  const rawPausedMeasure = audibleTickSnapshot ? audibleTickSnapshot.measure : fallbackM;
  const pausedMeasure = Math.max(0, Math.min(rawPausedMeasure, totalM - 1));
  const activeSig = ctx.measureTimeSigsRef?.current?.[pausedMeasure] || store.measureTimeSigs?.[pausedMeasure] || store.timeSig || '4/4';
  const geom = getRodaMeasureGeometry(activeSig);
  const pausedMaxTicks = audibleTickSnapshot && audibleTickSnapshot.maxTicks > 0 ? audibleTickSnapshot.maxTicks : geom.maxTicks;

  let exactProgress = audibleTickSnapshot ? audibleTickSnapshot.ratio : 0;
  if (audibleTickSnapshot && audibleTickSnapshot.measureDuration && audibleTickSnapshot.measureDuration > 0 && audibleTickSnapshot.time > 0) {
    const elapsed = Math.max(0, Math.min(audibleTickSnapshot.measureDuration * 0.035, nowAudio - audibleTickSnapshot.time));
    exactProgress = Math.max(0, Math.min(0.999999, audibleTickSnapshot.ratio + elapsed / audibleTickSnapshot.measureDuration));
  }

  const pausedTick = audibleTickSnapshot ? Math.max(0, Math.min(pausedMaxTicks - 1, audibleTickSnapshot.step)) : 0;
  const physicalStep = getPhysicalStepFromRatio(exactProgress, null, geom.defaultSteps, geom.beatsCount);
  const pausedIter = audibleTickSnapshot ? audibleTickSnapshot.iteration : 1;
  const pausedLoopIter = audibleTickSnapshot?.loopIteration ?? ctx.currentLoopIterationRef?.current ?? 1;

  freezeAt({
    measure: pausedMeasure, step: Math.max(0, physicalStep), totalSteps: geom.defaultSteps,
    progress: exactProgress, tick: pausedTick, maxTicks: pausedMaxTicks,
    iteration: pausedIter, loopIteration: pausedLoopIter,
  });
  useTransportStore.getState().setIsPaused(true);

  ctx.measureCountRef.current = pausedMeasure;
  ctx.currentStepIndexRef.current = pausedTick;
  ctx.maxTicksRef.current = pausedMaxTicks;
  ctx.setCurrentMeasure(pausedMeasure);
  store.setCurrentLoopIteration(pausedLoopIter);
  if (activeEngine) {
    activeEngine.currentMeasure = pausedMeasure;
    activeEngine.currentStep = pausedTick;
  }

  const expanded = getExpandedMeasures(totalM, store.songSections);
  const expIdx = expanded.findIndex((item) => item.baseMeasure === pausedMeasure && item.iteration === pausedIter);
  const fallbackExpIdx = expIdx !== -1 ? expIdx : expanded.findIndex((item) => item.baseMeasure === pausedMeasure);
  store.setCurrentExpandedMeasureIdx(fallbackExpIdx !== -1 ? fallbackExpIdx : pausedMeasure);

  const detail = ctx.tickEventDetailRef.current;
  Object.assign(detail, {
    step: pausedTick, measure: pausedMeasure, maxTicks: pausedMaxTicks, ratio: exactProgress,
    visualStep16: Math.floor(exactProgress * 16), visualStep12: Math.floor(exactProgress * 12),
    time: nowAudio, iteration: pausedIter, loopIteration: pausedLoopIter, isPaused: true, isNavigation: false,
  });
  tickSubscribers.forEach((cb) => { try { cb(detail); } catch (err) { console.error(err); } });
}
