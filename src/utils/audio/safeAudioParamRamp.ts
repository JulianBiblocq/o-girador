import * as Tone from 'tone';
import { rampNativeLinearGain } from './channelFaderLinearRamp';

export function safeRampTo(
  param: any,
  targetValue: number,
  durationSec = 0.02,
  minVal = -100,
  maxVal = 20000
): void {
  if (!param) return;

  let raw: number;
  if (typeof targetValue !== 'number' || Number.isNaN(targetValue)) {
    raw = minVal <= 0 && 0 <= maxVal ? 0 : minVal;
  } else if (targetValue === -Infinity) {
    raw = minVal;
  } else if (targetValue === Infinity) {
    raw = maxVal;
  } else {
    raw = targetValue;
  }
  const clamped = Math.max(minVal, Math.min(maxVal, raw));

  let isRunning = false;
  try {
    isRunning = Tone.getContext().state === 'running';
  } catch (_) {
    isRunning = true;
  }

  if (isRunning && durationSec > 0) {
    try {
      if (typeof param.rampTo === 'function') {
        param.rampTo(clamped, durationSec);
        return;
      }
    } catch (_) {
      try {
        param.cancelScheduledValues?.(0);
        param.value = clamped;
        return;
      } catch (__) {}
    }
  }

  try {
    param.value = clamped;
  } catch (_) {}
}

export function safeRampDb(param: any, db: number, durationSec = 0.018): void {
  if (!param) return;
  if (param.units === 'decibels' && param._param) {
    const lin = typeof db !== 'number' || Number.isNaN(db) || db === -Infinity || db <= -99.5
      ? 0
      : Math.pow(10, Math.max(-100, Math.min(12, db === Infinity ? 12 : db)) / 20);
    rampNativeLinearGain(param, lin, durationSec);
    return;
  }
  safeRampTo(param, db, durationSec, -100, 12);
}

export function safeRampPan(param: any, pan: number, durationSec = 0.02): void {
  safeRampTo(param, pan, durationSec, -1, 1);
}

export function safeRampFreq(param: any, hz: number, durationSec = 0.02): void {
  safeRampTo(param, hz, durationSec, 10, 20000);
}

export function safeRampGainDb(param: any, gainDb: number, durationSec = 0.02): void {
  safeRampTo(param, gainDb, durationSec, -24, 24);
}
