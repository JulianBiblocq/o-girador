import * as Tone from 'tone';

export function safeRampTo(
  param: any,
  targetValue: number,
  durationSec = 0.02,
  minVal = -100,
  maxVal = 20000
): void {
  if (!param) return;
  const raw = (typeof targetValue !== 'number' || !Number.isFinite(targetValue))
    ? (minVal <= 0 && 0 <= maxVal ? 0 : minVal)
    : targetValue;
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
      } catch (_) {}
    }
  }

  try {
    param.value = clamped;
  } catch (_) {}
}

export function safeRampDb(param: any, db: number, durationSec = 0.02): void {
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
