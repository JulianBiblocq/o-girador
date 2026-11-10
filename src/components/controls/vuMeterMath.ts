import * as Tone from 'tone';

const LOG10_20 = 20 / Math.LN10;

/** Buffer Float32Array(128) pré-alloué unique pour éviter toute allocation GC à 60 FPS */
export const SHARED_METER_BUF = new Float32Array(128);

export interface PeakHoldState {
  barDb: number; barNorm: number; holdDb: number; holdNorm: number;
  peakScale: number; holdUntilMs: number; clipUntilMs: number; lastTickMs: number;
}

export function createPeakHoldState(): PeakHoldState {
  return { barDb: -60, barNorm: 0, holdDb: -60, holdNorm: 0, peakScale: 0, holdUntilMs: 0, clipUntilMs: 0, lastTickMs: 0 };
}

/** Courbe studio perceptive [-60 dB .. 0 dB] -> [0 .. 1] (-36 dB -> ~21%, -18 dB -> ~54%, -6 dB -> ~83%, -0.3 dB -> ~99.1%) */
export function dbToStudioMeterNorm(db: number): number {
  if (!Number.isFinite(db) || db <= -59.5) return 0;
  if (db >= 0) return 1;
  return Math.max(0, Math.min(1, Math.pow((db + 60) / 60, 1.72)));
}

export const dbToStudioMeterScale = dbToStudioMeterNorm;

export const STUDIO_VU_GRADIENT_VERTICAL =
  'linear-gradient(to top, var(--vu-level-nominal) 0%, var(--vu-level-nominal) 66%, var(--vu-level-warn) 70%, var(--vu-level-warn) 90%, var(--vu-level-clip) 93%, var(--vu-level-clip) 100%)';

export const STUDIO_VU_GRADIENT_HORIZONTAL =
  'linear-gradient(to right, var(--vu-level-nominal) 0%, var(--vu-level-nominal) 66%, var(--vu-level-warn) 70%, var(--vu-level-warn) 90%, var(--vu-level-clip) 93%, var(--vu-level-clip) 100%)';

export const STUDIO_METER_TICKS = [
  { db: 0, label: '0', norm: dbToStudioMeterNorm(0) },
  { db: -6, label: '-6', norm: dbToStudioMeterNorm(-6) },
  { db: -18, label: '-18', norm: dbToStudioMeterNorm(-18) },
  { db: -36, label: '-36', norm: dbToStudioMeterNorm(-36) },
] as const;

export function createLightweightSacAnalyser(): any {
  const rawCtx = Tone.getContext().rawContext as AudioContext;
  const analyser = rawCtx.createAnalyser();
  analyser.fftSize = 128;
  analyser.smoothingTimeConstant = 0;
  try { analyser.channelCount = 1; } catch (_) {}
  (analyser as any).dispose = () => { try { analyser.disconnect(); } catch (_) {} };
  return analyser;
}

export function linearToDbFloor(amp: number): number {
  if (!Number.isFinite(amp) || amp <= 1e-4) return -60;
  return Math.max(-60, Math.min(6, LOG10_20 * Math.log(amp)));
}

function scanBufferRmsPeak(buf: Float32Array): { rmsDb: number; peakDb: number; isClip: boolean } {
  let sumSq = 0, peak = 0;
  for (let i = 0; i < buf.length; i++) {
    const s = buf[i];
    sumSq += s * s;
    const abs = s < 0 ? -s : s;
    if (abs > peak) peak = abs;
  }
  return { rmsDb: linearToDbFloor(Math.sqrt(sumSq / buf.length)), peakDb: linearToDbFloor(peak), isClip: peak >= 0.9885 };
}

export function readMeterRmsAndPeakDb(meterNode: any): { rmsDb: number; peakDb: number; isClip: boolean } {
  if (!meterNode) return { rmsDb: -60, peakDb: -60, isClip: false };
  try {
    if (typeof meterNode.getFloatTimeDomainData === 'function') {
      meterNode.getFloatTimeDomainData(SHARED_METER_BUF);
      return scanBufferRmsPeak(SHARED_METER_BUF);
    }
    if (typeof meterNode.getValue === 'function') {
      const data = meterNode.getValue();
      const arr = data instanceof Float32Array ? data : (Array.isArray(data) && data[0] instanceof Float32Array ? data[0] : null);
      if (arr && arr.length > 0) return scanBufferRmsPeak(arr);
      if (typeof data === 'number' && Number.isFinite(data)) {
        const c = Math.max(-60, Math.min(6, data));
        return { rmsDb: c, peakDb: c, isClip: c >= -0.1 };
      }
    }
  } catch (_) {}
  return { rmsDb: -60, peakDb: -60, isClip: false };
}

export function readMeterDb(meterNode: any): number {
  return readMeterRmsAndPeakDb(meterNode).peakDb;
}

export function computeNextMeterScale(lastScale: number, db: number): number {
  const target = dbToStudioMeterNorm(db);
  if (target > lastScale) return target;
  const next = lastScale * 0.92 + target * 0.08;
  return next < 0.005 ? 0 : next;
}

/** Balistique unifiée Peak + Peak-Hold : barNorm et holdNorm pilotés par peakDb */
export function advancePeakBallistics(
  state: PeakHoldState, peakDb: number, isClipNow: boolean, nowMs: number
): { barNorm: number; holdNorm: number; peakScale: number; isClipHeld: boolean } {
  const dtSec = state.lastTickMs > 0 ? Math.max(0, Math.min(0.2, (nowMs - state.lastTickMs) / 1000)) : 0.016;
  state.lastTickMs = nowMs;

  const clampedPeakDb = Number.isFinite(peakDb) ? Math.max(-60, Math.min(6, peakDb)) : -60;
  const instantNorm = dbToStudioMeterNorm(clampedPeakDb);

  if (instantNorm >= state.barNorm) {
    state.barDb = clampedPeakDb;
    state.barNorm = instantNorm;
  } else {
    state.barDb = Math.max(clampedPeakDb, state.barDb - 20 * dtSec);
    state.barNorm = dbToStudioMeterNorm(state.barDb);
    if (state.barNorm < 0.005) { state.barNorm = 0; state.barDb = -60; }
  }

  if (state.barNorm >= state.holdNorm) {
    state.holdNorm = state.barNorm;
    state.holdDb = state.barDb;
    state.holdUntilMs = nowMs + 1200;
  } else if (nowMs > state.holdUntilMs) {
    state.holdDb = Math.max(state.barDb, state.holdDb - 15 * dtSec);
    state.holdNorm = Math.max(state.barNorm, dbToStudioMeterNorm(state.holdDb));
    if (state.holdNorm < 0.01) { state.holdNorm = 0; state.holdDb = -60; }
  }

  state.peakScale = state.holdNorm;
  if (isClipNow) state.clipUntilMs = Math.max(state.clipUntilMs, nowMs + 2500);
  return { barNorm: state.barNorm, holdNorm: state.holdNorm, peakScale: state.holdNorm, isClipHeld: nowMs < state.clipUntilMs };
}

export const advancePeakHoldState = advancePeakBallistics;
