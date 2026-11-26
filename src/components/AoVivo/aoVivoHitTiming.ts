/**
 * aoVivoHitTiming.ts — Calcul horloge Web Audio + Balanço déterministe + Microtiming Ao Vivo (< 115 lignes).
 * - Calcule l'offset déterministe de chaque note via `computePercussionNoteSwing` (`swingJitter = 0`) + `computeStepMicrotiming`,
 *   afin qu'Ao Vivo chaloupe avec le Balanço même piste mutée, en Tocar Junto ou son coupé.
 */
import * as Tone from 'tone';
import { getAudioEngine } from '../../hooks/audio-sync/audioEngineNodes';
import { computePercussionNoteSwing, resolveStepBeatInfo } from '../../hooks/audio-sync/percussionSwingHelper';
import { useTransportStore } from '../../stores/useTransportStore';
import { getBluetoothVisualOffsetSec } from '../../utils/bluetoothLatencyStore';
import { computeStepMicrotiming } from '../../workers/compiler/stepNotePacker';
import { getAudioTime } from '../circle-sequencer/circleAudioTime';

export function computeAoVivoSignedDeltaMs(
  detail: any,
  extraOffsetSec = 0,
  overrideCtxSec?: number,
  overrideOutLatencySec?: number,
  overrideBtOffsetSec?: number
): number {
  if (!detail) return 0;
  if (typeof detail.deltaSec === 'number' && typeof detail.time !== 'number' && typeof detail.hitTime !== 'number' && typeof detail.drawTime !== 'number') {
    return (detail.deltaSec + extraOffsetSec) * 1000;
  }
  const ctxTime = overrideCtxSec ?? getAudioTime();
  if (!(ctxTime > 0)) return 0;

  const rawCtx = Tone.getContext().rawContext as AudioContext | undefined;
  const outLat = overrideOutLatencySec !== undefined
    ? overrideOutLatencySec
    : typeof rawCtx?.outputLatency === 'number' && !Number.isNaN(rawCtx.outputLatency)
      ? rawCtx.outputLatency
      : 0.05;
  const btSec = overrideBtOffsetSec !== undefined ? overrideBtOffsetSec : getBluetoothVisualOffsetSec();
  const totalLatSec = Math.max(0, outLat + btSec);
  const hasExplicitLatOverride = overrideOutLatencySec !== undefined || overrideBtOffsetSec !== undefined;

  let hitTimeSec: number | null = null;
  if (typeof detail.hitTime === 'number' && detail.hitTime > 0) {
    hitTimeSec = detail.hitTime;
  } else if (typeof detail.drawTime === 'number' && detail.drawTime > 0) {
    hitTimeSec = hasExplicitLatOverride && typeof detail.audioTime === 'number' && detail.audioTime > 0
      ? detail.audioTime + totalLatSec
      : detail.drawTime;
  } else if (typeof detail.time === 'number' && detail.time > 0) {
    hitTimeSec = detail.time + totalLatSec;
  }

  if (hitTimeSec === null) return 0;
  return (hitTimeSec + extraOffsetSec - ctxTime) * 1000;
}

export function computeAoVivoDeltaMs(
  detail: any,
  extraOffsetSec = 0,
  overrideCtxSec?: number
): number {
  return -computeAoVivoSignedDeltaMs(detail, extraOffsetSec, overrideCtxSec);
}

export function computeAoVivoHitLeadMs(
  detail: any,
  extraOffsetSec = 0,
  overrideCtxSec?: number,
  overrideOutLatencySec?: number,
  overrideBtOffsetSec?: number
): number {
  const leadMs = computeAoVivoSignedDeltaMs(detail, extraOffsetSec, overrideCtxSec, overrideOutLatencySec, overrideBtOffsetSec);
  return Math.round(Math.max(0, Math.min(450, leadMs)));
}

export function computeAoVivoSwingAndMicroOffsetSec(params: {
  effectivePattern: any;
  concreteTrack: any;
  stepInMeasure: number;
  targetStep: number;
  strokeIndex: number;
  stepDurationSec: number;
  currentSig: string;
  effectiveMicrotimings?: any[];
  baseStepAudioSec?: number;
}): number {
  const {
    effectivePattern, concreteTrack, stepInMeasure, targetStep, strokeIndex,
    stepDurationSec, currentSig, effectiveMicrotimings, baseStepAudioSec,
  } = params;
  if (!concreteTrack || stepDurationSec <= 0) return 0;

  const globalSwing = useTransportStore.getState().globalSwing;
  const beatInfo = resolveStepBeatInfo(stepInMeasure, effectivePattern, currentSig);
  const isTuplet = beatInfo.isTernary || (beatInfo.beatRes !== 1 && beatInfo.beatRes !== 2 && beatInfo.beatRes !== 4);
  const engine = getAudioEngine();
  const adherence = engine ? engine.getTrackBalancoAdherence(concreteTrack.id) : 1.0;

  const swingSec = globalSwing
    ? computePercussionNoteSwing({
        activePattern: effectivePattern,
        liveTrack: concreteTrack,
        circleStepIdx: stepInMeasure,
        isTuplet,
        swingJitter: 0,
        globalMode: globalSwing.mode || 'off',
        globalSwing,
        stepDurationSec,
        balancoAdherence: adherence,
        baseStepAudioSec,
        timeSig: currentSig,
      })
    : 0;

  const microPct = computeStepMicrotiming(effectiveMicrotimings?.[targetStep], strokeIndex);
  const microSec = (microPct / 100) * stepDurationSec * 0.5;
  return swingSec + microSec;
}
