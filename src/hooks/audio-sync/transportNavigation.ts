import * as Tone from 'tone';
import { getMaxTicks } from '../../data';
import { vocalEngineService } from '../../audio/vocalEngineService';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { tickSubscribers } from './audioSyncTypes';
import { AudioEngine } from '../../AudioEngine';

export interface NavigationContext {
  totalMeasuresRef: { current: number };
  measureTimeSigsRef: { current: Record<number, string> };
  measureCountRef: { current: number };
  sectionIterationRef: { current: number };
  soloLoopCycleRef: { current: number };
  hasFinishedRef: { current: boolean };
  isPlaybackEndingRef: { current: boolean };
  maxTicksRef: { current: number };
  currentStepIndexRef: { current: number };
  isPlayingRef: { current: boolean };
  pendingMeasureRef: { current: number | null };
  pendingIterationRef: { current: number | null };
  activeSequencerVocalsRef: { current: Map<string, any> };
  anticipatedMeasuresRef: { current: Set<string> };
  tickEventDetailRef: { current: any };
  audioEngine: AudioEngine | null;
  setCurrentMeasure: (m: number) => void;
}

export function seekToMeasure(measureIdx: number, stepIdxInMeasure: number = 0, stepsInMeasure: number | undefined, ctx: NavigationContext): void {
  const totalM = ctx.totalMeasuresRef.current || 1;
  const clampedM = Math.max(0, Math.min(totalM - 1, measureIdx));
  const mSig = ctx.measureTimeSigsRef.current[clampedM] || '4/4';
  const currentTicks = getMaxTicks(mSig as any);
  const steps = stepsInMeasure || (mSig === '6/8' || mSig === '12/8' ? 24 : 16);
  const tickIdx = Math.max(0, Math.min(currentTicks - 1, Math.floor((stepIdxInMeasure / steps) * currentTicks)));

  ctx.measureCountRef.current = clampedM;
  ctx.sectionIterationRef.current = 1;
  ctx.soloLoopCycleRef.current = 0;
  useSequencerStore.getState().resetFirstPassRegistry();
  ctx.setCurrentMeasure(clampedM);
  ctx.hasFinishedRef.current = false;
  ctx.isPlaybackEndingRef.current = false;
  ctx.maxTicksRef.current = currentTicks;

  if (ctx.isPlayingRef.current) {
    vocalEngineService.stopAllVocalPlayback();
    vocalEngineService.disposeAllVocalPlayers();
    ctx.activeSequencerVocalsRef.current.forEach(v => { try { v.stop(); } catch (_) {} });
    ctx.activeSequencerVocalsRef.current.clear();
    ctx.anticipatedMeasuresRef.current.clear();

    ctx.currentStepIndexRef.current = tickIdx - 1;
    if (ctx.audioEngine) {
      ctx.audioEngine.purgeScheduledHits();
      ctx.audioEngine.currentMeasure = clampedM;
      ctx.audioEngine.currentStep = tickIdx;
      ctx.audioEngine.schedulingMeasure = clampedM;
      ctx.audioEngine.schedulingStep = tickIdx;
      ctx.audioEngine.forceReanchor();
    }
    try { Tone.Transport.position = `${clampedM}:0:0`; } catch (_) {}
  } else {
    ctx.currentStepIndexRef.current = tickIdx - 1;
    if (ctx.audioEngine) {
      ctx.audioEngine.currentMeasure = clampedM;
      ctx.audioEngine.currentStep = Math.max(0, tickIdx);
    }
    try { Tone.Transport.position = `${clampedM}:0:0`; } catch (_) {}
  }

  const ratioVal = currentTicks > 0 ? tickIdx / currentTicks : 0;
  const detail = ctx.tickEventDetailRef.current;
  detail.step = tickIdx;
  detail.measure = clampedM;
  detail.maxTicks = currentTicks;
  detail.ratio = ratioVal;
  detail.visualStep16 = Math.floor(ratioVal * 16);
  detail.visualStep12 = Math.floor(ratioVal * 12);
  detail.time = Tone.context.currentTime;
  detail.iteration = 1;
  detail.isPaused = !ctx.isPlayingRef.current;
  detail.isNavigation = true;

  tickSubscribers.forEach((cb) => {
    try { cb(detail); } catch (err) { console.error(err); }
  });
}

export function handleTimelineNavigate(
  measureIdx: number, stepIdxInMeasure: number, stepsInMeasure: number | undefined,
  iteration: number = 1, ctx: NavigationContext
): void {
  if (stepIdxInMeasure === 0) {
    seekToMeasure(measureIdx, 0, stepsInMeasure, ctx);
    return;
  }

  const targetMeasure = measureIdx % (ctx.totalMeasuresRef.current || 1);
  if (ctx.isPlayingRef.current) {
    ctx.pendingMeasureRef.current = targetMeasure;
    ctx.pendingIterationRef.current = iteration;
    window.dispatchEvent(new CustomEvent('o-girador-measure-queued', {
      detail: { measure: targetMeasure, iteration }
    }));
    return;
  }

  const mSig = ctx.measureTimeSigsRef.current[measureIdx] || '4/4';
  const currentTicks = getMaxTicks(mSig as any);
  const steps = stepsInMeasure || (mSig === '6/8' || mSig === '12/8' ? 24 : 16);
  const tickIdx = Math.max(0, Math.min(currentTicks - 1, Math.floor((stepIdxInMeasure / steps) * currentTicks)));

  ctx.measureCountRef.current = measureIdx;
  ctx.sectionIterationRef.current = iteration;
  ctx.setCurrentMeasure(targetMeasure);
  ctx.currentStepIndexRef.current = tickIdx - 1;
  ctx.hasFinishedRef.current = false;
  ctx.isPlaybackEndingRef.current = false;
  ctx.maxTicksRef.current = currentTicks;

  if (ctx.audioEngine) {
    ctx.audioEngine.currentMeasure = measureIdx;
    ctx.audioEngine.currentStep = Math.max(0, tickIdx);
  }

  const ratioVal = tickIdx / currentTicks;
  const detail = ctx.tickEventDetailRef.current;
  detail.step = tickIdx;
  detail.measure = targetMeasure;
  detail.maxTicks = currentTicks;
  detail.ratio = ratioVal;
  detail.visualStep16 = Math.floor(ratioVal * 16);
  detail.visualStep12 = Math.floor(ratioVal * 12);
  detail.time = Tone.context.currentTime;
  detail.iteration = iteration;
  detail.isPaused = !ctx.isPlayingRef.current;
  detail.isNavigation = true;

  tickSubscribers.forEach((cb) => {
    try { cb(detail); } catch (err) { console.error(err); }
  });
}
