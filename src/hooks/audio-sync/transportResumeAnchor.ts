/**
 * Ancrage synchrone de la reprise depuis Pause (Zéro Précompte, Zéro Saut d'aiguille, < 95 lignes).
 */

import * as Tone from 'tone';
import { getMaxTicks } from '../../data';
import { getMeasureDurationSec } from '../../utils/meterTiming';
import { getBluetoothVisualOffsetSec } from '../../utils/bluetoothLatencyStore';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { useTransportStore } from '../../stores/useTransportStore';
import { getMeasureStartTick } from './audioParamsCache';
import { clearFreeze, frozenPlaybackState } from './frozenPlaybackState';
import { tickSubscribers } from './audioSyncTypes';
import { AudioEngine } from '../../AudioEngine';

export interface ResumePreparationContext {
  audioEngine: AudioEngine | null;
  totalMeasuresRef: { current: number };
  measureCountRef: { current: number };
  currentStepIndexRef: { current: number };
  maxTicksRef: { current: number };
  measureTimeSigsRef: { current: Record<number, string> };
  measureBpmsRef: { current: number[] };
  anchoredMeasureStartSecRef: { current: number };
  anchoredMeasureIdxRef?: { current: number };
  lastScheduledMeasureRef?: { current: number };
  flatArrayPointerRef?: { current: number };
  lastAbsoluteTickRef?: { current: number };
  absoluteTickCountRef?: { current: number };
  currentMeasureStartTickRef?: { current: number };
  tickEventDetailRef: { current: any };
  setCurrentMeasure: (m: number) => void;
}

export function prepareTransportResume(
  ctx: ResumePreparationContext,
  activeEngine: AudioEngine | null
): number {
  const store = useSequencerStore.getState();
  const totalM = Math.max(1, ctx.totalMeasuresRef.current || 1);
  const frozenMeasure = Math.max(0, Math.min(totalM - 1, frozenPlaybackState.measure));
  const frozenProgress = Math.max(0, Math.min(0.999999, frozenPlaybackState.progress));
  const sig = ctx.measureTimeSigsRef.current?.[frozenMeasure] || store.measureTimeSigs?.[frozenMeasure] || store.timeSig || '4/4';
  const currentTicks = getMaxTicks(sig as any);
  const rawBpm = ctx.measureBpmsRef.current?.[frozenMeasure];
  const currentBpm = !rawBpm || isNaN(rawBpm) || rawBpm <= 0 ? (store.bpm || 100) : rawBpm;
  const measureDurationSec = getMeasureDurationSec(sig, currentBpm);

  const resumeTick = Math.max(
    0,
    Math.min(
      currentTicks - 1,
      frozenPlaybackState.maxTicks === currentTicks
        ? frozenPlaybackState.tick
        : Math.round(frozenProgress * currentTicks)
    )
  );

  const rawCtx = (Tone.getContext().rawContext || Tone.context) as AudioContext;
  const nowAudio = activeEngine ? activeEngine.getCurrentTime() : (rawCtx?.currentTime || Tone.context.currentTime);
  const resumeAudioStartTime = nowAudio + 0.035;
  const baseLatency = typeof rawCtx?.outputLatency === 'number' && !isNaN(rawCtx.outputLatency) ? rawCtx.outputLatency : 0.05;
  const visualDelay = baseLatency + getBluetoothVisualOffsetSec();
  const resumeDrawTime = resumeAudioStartTime + visualDelay;
  const newVisualAnchor = resumeDrawTime - frozenProgress * measureDurationSec;

  if (activeEngine) {
    activeEngine.currentMeasure = frozenMeasure;
    activeEngine.currentStep = resumeTick;
    activeEngine.schedulingMeasure = frozenMeasure;
    activeEngine.schedulingStep = resumeTick;
  }

  ctx.measureCountRef.current = frozenMeasure;
  ctx.maxTicksRef.current = currentTicks;
  ctx.currentStepIndexRef.current = resumeTick - 1;
  if (ctx.lastScheduledMeasureRef) ctx.lastScheduledMeasureRef.current = -1;
  if (ctx.flatArrayPointerRef) ctx.flatArrayPointerRef.current = 0;
  if (ctx.lastAbsoluteTickRef) ctx.lastAbsoluteTickRef.current = -1;
  const measureStartTick = getMeasureStartTick(frozenMeasure, ctx.measureTimeSigsRef.current);
  if (ctx.currentMeasureStartTickRef) ctx.currentMeasureStartTickRef.current = measureStartTick;
  if (ctx.absoluteTickCountRef) ctx.absoluteTickCountRef.current = measureStartTick + resumeTick;
  ctx.anchoredMeasureStartSecRef.current = newVisualAnchor;
  if (ctx.anchoredMeasureIdxRef) ctx.anchoredMeasureIdxRef.current = frozenMeasure;
  ctx.setCurrentMeasure(frozenMeasure);

  try {
    Tone.Transport.seconds = frozenMeasure * measureDurationSec + frozenProgress * measureDurationSec;
    if (Tone.Transport.state !== 'started') Tone.Transport.start(resumeAudioStartTime);
  } catch (_) {}

  const detail = ctx.tickEventDetailRef.current;
  Object.assign(detail, {
    step: resumeTick, measure: frozenMeasure, maxTicks: currentTicks, ratio: frozenProgress,
    visualStep16: Math.floor(frozenProgress * 16) % 16, visualStep12: Math.floor(frozenProgress * 12) % 12,
    time: resumeDrawTime, targetStartTime: resumeDrawTime,
    measureStartTime: newVisualAnchor, measureDuration: measureDurationSec,
    iteration: frozenPlaybackState.iteration, loopIteration: frozenPlaybackState.loopIteration,
    isPreRoll: false, isPaused: false, isNavigation: false,
  });

  clearFreeze();
  useTransportStore.getState().setIsPaused(false);
  tickSubscribers.forEach((cb) => { try { cb(detail); } catch (err) { console.error(err); } });
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('o-girador-playback-resumed'));
  return resumeAudioStartTime;
}
