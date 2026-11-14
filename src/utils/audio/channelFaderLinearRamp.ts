import * as Tone from 'tone';
import { CUTOFF_FADER_POSITION, faderPositionToDb } from '../audio-math/faderMath';

const lastLinearTargetMap = new WeakMap<object, number>();

export function resolveUnderlyingLinearAudioParam(paramOrWrapper: any): any {
  if (!paramOrWrapper) return null;
  let curr = paramOrWrapper;
  for (let i = 0; i < 6 && curr; i++) {
    if (curr._param && curr._param !== curr) {
      curr = curr._param;
    } else {
      break;
    }
  }
  return curr;
}

function getAudioContextTime(paramOrWrapper: any): { now: number; isRunning: boolean } {
  try {
    const rawCtx = paramOrWrapper?.context?.rawContext
      || paramOrWrapper?.context?._context
      || Tone.getContext()?.rawContext;
    const isRunning = rawCtx?.state === 'running';
    const now = typeof rawCtx?.currentTime === 'number' && Number.isFinite(rawCtx.currentTime)
      ? rawCtx.currentTime
      : 0;
    return { now, isRunning };
  } catch (_) {
    return { now: 0, isRunning: false };
  }
}

export function rampNativeLinearGain(
  paramOrWrapper: any,
  targetLinearGain: number,
  durationSec = 0.018,
  immediate = false
): void {
  if (!paramOrWrapper) return;
  const safeTarget = typeof targetLinearGain === 'number' && Number.isFinite(targetLinearGain) && targetLinearGain > 1e-6
    ? Math.min(8, targetLinearGain)
    : 0;

  try {
    if (paramOrWrapper._events && typeof paramOrWrapper._events.cancel === 'function') {
      paramOrWrapper._events.cancel(0);
    }
  } catch (_) {}

  const linearParam = resolveUnderlyingLinearAudioParam(paramOrWrapper);
  if (!linearParam) return;

  const { now, isRunning } = getAudioContextTime(paramOrWrapper);
  const rawCurr = typeof linearParam.value === 'number' ? linearParam.value : undefined;
  const fallbackCurr = typeof linearParam === 'object' ? lastLinearTargetMap.get(linearParam) : undefined;
  const startLin = typeof rawCurr === 'number' && Number.isFinite(rawCurr)
    ? Math.max(0, Math.min(8, rawCurr))
    : (fallbackCurr ?? safeTarget);

  try {
    if (typeof linearParam.cancelScheduledValues === 'function') {
      linearParam.cancelScheduledValues(now);
    }
    if (isRunning && !immediate && durationSec > 0 && Math.abs(startLin - safeTarget) > 1e-6 && typeof linearParam.linearRampToValueAtTime === 'function') {
      linearParam.setValueAtTime?.(startLin, now);
      linearParam.linearRampToValueAtTime(safeTarget, now + durationSec);
    } else {
      linearParam.setValueAtTime?.(safeTarget, now);
      try { linearParam.value = safeTarget; } catch (_) {}
    }
  } catch (_) {
    try { linearParam.value = safeTarget; } catch (__) {}
  }

  if (typeof linearParam === 'object') {
    lastLinearTargetMap.set(linearParam, safeTarget);
  }
}

export function computeChannelEffectiveLinearGain(
  faderPos: number,
  panCompensationDb = 0,
  isMuted = false
): number {
  if (isMuted) return 0;
  if (typeof faderPos !== 'number' || !Number.isFinite(faderPos) || faderPos <= CUTOFF_FADER_POSITION) {
    return 0;
  }
  const db = faderPositionToDb(faderPos);
  if (!Number.isFinite(db) || db <= -99.5) return 0;
  const finalDb = Math.max(-100, Math.min(12, db + panCompensationDb));
  return Math.pow(10, finalDb / 20);
}

export function applyChannelVolumeLinear(
  channelNode: any,
  faderPos: number,
  panCompensationDb: number,
  isMuted: boolean,
  durationSec = 0.018,
  immediate = false
): void {
  if (!channelNode?.volume) return;
  const targetGain = computeChannelEffectiveLinearGain(faderPos, panCompensationDb, isMuted);
  rampNativeLinearGain(channelNode.volume, targetGain, durationSec, immediate);
}

export function computeAuxSendLinearGain(sendPercent: number, disabledOrMuted = false): number {
  if (disabledOrMuted || typeof sendPercent !== 'number' || !Number.isFinite(sendPercent) || sendPercent <= 0) {
    return 0;
  }
  const db = 40 * Math.log10(Math.max(0.00001, sendPercent / 100));
  if (!Number.isFinite(db) || db <= -99.5) return 0;
  return Math.pow(10, Math.min(12, db) / 20);
}

export function applyAuxSendLinear(
  sendNode: any,
  sendPercent: number,
  disabledOrMuted = false,
  durationSec = 0.018,
  immediate = false
): void {
  if (!sendNode?.gain) return;
  rampNativeLinearGain(sendNode.gain, computeAuxSendLinearGain(sendPercent, disabledOrMuted), durationSec, immediate);
}

export function masterDbToLinearGain(masterVolDb: number): number {
  if (typeof masterVolDb !== 'number' || Number.isNaN(masterVolDb)) return 1;
  if (masterVolDb === -Infinity || masterVolDb <= -99.5) return 0;
  if (masterVolDb === Infinity) return Math.pow(10, 12 / 20);
  return Math.pow(10, Math.max(-100, Math.min(12, masterVolDb)) / 20);
}
