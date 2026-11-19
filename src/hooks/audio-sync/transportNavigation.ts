import * as Tone from 'tone';
import { getMaxTicks } from '../../data';
import { vocalEngineService } from '../../audio/vocalEngineService';
import { stopAllNativeOscillators } from '../../audio/nativeSynths';
import { purgeVisualTickBuffer, setLastAudibleTick } from '../../audio/visualTickBuffer';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { useTransportStore } from '../../stores/useTransportStore';
import { rebuildWorkletHorizonFromNow } from '../../audio/worklet/horizon/percussionHorizonPusher';
import { recalculateLookaheadForQueuedMeasure, resetLiveVariationLookahead } from './liveVariationLookaheadEngine';
import { clearFreeze } from './frozenPlaybackState';
import { tickSubscribers } from './audioSyncTypes';
import type { NavigationContext } from './transportNavigationTypes';

export type { NavigationContext };

export function seekToMeasure(
  measureIdx: number,
  stepIdxInMeasure: number = 0,
  stepsInMeasure: number | undefined,
  ctx: NavigationContext
): void {
  const totalM = Math.max(1, ctx.totalMeasuresRef.current || 1);
  const clampedM = Math.max(0, Math.min(totalM - 1, measureIdx));
  const mSig = ctx.measureTimeSigsRef.current[clampedM] || '4/4';
  const currentTicks = getMaxTicks(mSig as any);
  const steps = stepsInMeasure || (mSig === '6/8' || mSig === '12/8' ? 24 : 16);
  const tickIdx = Math.max(0, Math.min(currentTicks - 1, Math.floor((stepIdxInMeasure / steps) * currentTicks)));
  const store = useSequencerStore.getState();

  ctx.measureCountRef.current = clampedM;
  ctx.sectionIterationRef.current = 1;
  ctx.soloLoopCycleRef.current = 0;
  ctx.pendingMeasureRef.current = null;
  ctx.pendingIterationRef.current = null;
  if ((store as any).clearQueuedMeasure) (store as any).clearQueuedMeasure();
  store.resetFirstPassRegistry();
  resetLiveVariationLookahead();
  ctx.setCurrentMeasure(clampedM);
  ctx.hasFinishedRef.current = false;
  ctx.isPlaybackEndingRef.current = false;
  ctx.maxTicksRef.current = currentTicks;

  if (ctx.isPlayingRef.current) {
    if (ctx.isPreRollActiveRef?.current) {
      ctx.isPreRollActiveRef.current = false;
      if (ctx.preRollRemainingMeasuresRef) ctx.preRollRemainingMeasuresRef.current = 0;
      ctx.engineTimeoutsRef?.current.forEach((t) => clearTimeout(t));
      ctx.engineTimeoutsRef?.current.clear();
      store.setIsPreRolling(false);
    }
    ctx.audioEngine?.stopAllBarulho();
    ctx.audioEngine?.releaseVoicePitch();
    ctx.audioEngine?.releaseAllVoices();
    stopAllNativeOscillators();
    vocalEngineService.stopAllVocalPlayback();
    ctx.activeSequencerVocalsRef.current.forEach((v) => { try { v.stop(); } catch (_) {} });
    ctx.activeSequencerVocalsRef.current.clear();
    ctx.anticipatedMeasuresRef.current.clear();
    purgeVisualTickBuffer();
    setLastAudibleTick(null);
    ctx.hitTriggersRef?.current?.clear?.();
    if (ctx.anchoredMeasureStartSecRef) ctx.anchoredMeasureStartSecRef.current = 0;
    if (ctx.anchoredMeasureIdxRef) ctx.anchoredMeasureIdxRef.current = -1;
    if (ctx.lastScheduledMeasureRef) ctx.lastScheduledMeasureRef.current = -1;

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
    clearFreeze();
    useTransportStore.getState().setIsPaused(false);
    ctx.currentStepIndexRef.current = tickIdx === 0 ? -1 : tickIdx - 1;
    if (ctx.audioEngine) {
      ctx.audioEngine.currentMeasure = clampedM;
      ctx.audioEngine.currentStep = Math.max(0, tickIdx);
    }
    try { Tone.Transport.position = `${clampedM}:0:0`; } catch (_) {}
  }

  const ratioVal = currentTicks > 0 ? tickIdx / currentTicks : 0;
  const detail = ctx.tickEventDetailRef.current;
  Object.assign(detail, {
    step: !ctx.isPlayingRef.current && tickIdx === 0 ? -1 : tickIdx,
    measure: clampedM, maxTicks: currentTicks, ratio: ratioVal,
    visualStep16: Math.floor(ratioVal * 16), visualStep12: Math.floor(ratioVal * 12),
    time: Tone.context.currentTime, iteration: 1, isPaused: false, isNavigation: true,
  });
  tickSubscribers.forEach((cb) => { try { cb(detail); } catch (err) { console.error(err); } });
}

export function handleTimelineNavigate(
  measureIdx: number,
  stepIdxInMeasure: number,
  stepsInMeasure: number | undefined,
  iteration: number = 1,
  ctx: NavigationContext
): void {
  const totalM = Math.max(1, ctx.totalMeasuresRef.current || 1);
  const targetMeasure = ((measureIdx % totalM) + totalM) % totalM;

  if (ctx.isPlayingRef.current) {
    ctx.pendingMeasureRef.current = targetMeasure;
    ctx.pendingIterationRef.current = iteration;
    const tracks = ctx.tracksRef?.current || useSequencerStore.getState().tracks;
    recalculateLookaheadForQueuedMeasure(
      targetMeasure, tracks, ctx.soloPatternPlayIdRef?.current ?? null, ctx.soloPatternVariationIdRef?.current ?? null
    );
    rebuildWorkletHorizonFromNow('queued');
    window.dispatchEvent(new CustomEvent('o-girador-measure-queued', { detail: { measure: targetMeasure, iteration } }));
    return;
  }

  seekToMeasure(targetMeasure, stepIdxInMeasure, stepsInMeasure, ctx);
}
