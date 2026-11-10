import * as Tone from 'tone';

const LOG10_20 = 20 / Math.LN10;
export const SHARED_METER_BUF = new Float32Array(128);
export type VuLedState = 'off' | 'warn' | 'clip';

export interface PeakHoldState {
  rmsDb: number; rmsBarNorm: number;
  peakDb: number; peakBarNorm: number; effectivePeakNorm: number;
  barDb: number; barNorm: number; holdDb: number; holdNorm: number;
  peakScale: number; holdUntilMs: number; warnUntilMs: number; clipUntilMs: number; lastTickMs: number;
}

export function createPeakHoldState(): PeakHoldState {
  return { rmsDb: -60, rmsBarNorm: 0, peakDb: -60, peakBarNorm: 0, effectivePeakNorm: 0, barDb: -60, barNorm: 0, holdDb: -60, holdNorm: 0, peakScale: 0, holdUntilMs: 0, warnUntilMs: 0, clipUntilMs: 0, lastTickMs: 0 };
}

export function applyVuLedDomState(el: HTMLElement | null, ledState: VuLedState): void {
  if (!el) return;
  if (ledState === 'clip') { el.style.backgroundColor = 'var(--vu-level-clip)'; el.style.opacity = '1'; }
  else if (ledState === 'warn') { el.style.backgroundColor = 'var(--vu-level-warn)'; el.style.opacity = '1'; }
  else { el.style.backgroundColor = 'var(--vu-led-off-bg)'; el.style.opacity = '0.85'; }
}

/** Échelle perceptive respirante [-60..0 dBFS] -> [0..1] (-36->18%, -18->48%, -12->62%, -6->75%, 0->100%) */
export function dbToStudioMeterNorm(db: number): number {
  if (!Number.isFinite(db) || db <= -59.5) return 0;
  if (db >= 0) return 1;
  if (db <= -36) return ((db + 60) / 24) * 0.18;
  if (db <= -18) return 0.18 + ((db + 36) / 18) * 0.30;
  if (db <= -12) return 0.48 + ((db + 18) / 6) * 0.14;
  if (db <= -6) return 0.62 + ((db + 12) / 6) * 0.13;
  return 0.75 + ((db + 6) / 6) * 0.25;
}
export const dbToStudioMeterScale = dbToStudioMeterNorm;

export const STUDIO_VU_GRADIENT_VERTICAL =
  'linear-gradient(to top, var(--vu-level-nominal) 0%, var(--vu-level-nominal) 60%, var(--vu-level-warn) 64%, var(--vu-level-warn) 86%, var(--vu-level-clip) 89%, var(--vu-level-clip) 100%)';
export const STUDIO_VU_GRADIENT_HORIZONTAL =
  'linear-gradient(to right, var(--vu-level-nominal) 0%, var(--vu-level-nominal) 60%, var(--vu-level-warn) 64%, var(--vu-level-warn) 86%, var(--vu-level-clip) 89%, var(--vu-level-clip) 100%)';

export const STUDIO_METER_TICKS = [
  { db: 0, label: '0', norm: dbToStudioMeterNorm(0) }, { db: -6, label: '-6', norm: dbToStudioMeterNorm(-6) },
  { db: -18, label: '-18', norm: dbToStudioMeterNorm(-18) }, { db: -36, label: '-36', norm: dbToStudioMeterNorm(-36) },
] as const;

export function createLightweightSacAnalyser(): any {
  const rawCtx = Tone.getContext().rawContext as AudioContext;
  const analyser = rawCtx.createAnalyser();
  analyser.fftSize = 128; analyser.smoothingTimeConstant = 0;
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
    const s = buf[i]; sumSq += s * s;
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

export function readMeterDb(meterNode: any): number { return readMeterRmsAndPeakDb(meterNode).peakDb; }
export function computeNextMeterScale(lastScale: number, db: number): number {
  const target = dbToStudioMeterNorm(db);
  return target > lastScale ? target : (lastScale * 0.92 + target * 0.08 < 0.005 ? 0 : lastScale * 0.92 + target * 0.08);
}

/** Double enveloppe Dual-Meter : Corps RMS (90ms montée / 180ms ~16 dB/s relâchement) + Halo Peak (18 dB/s) + Voyant O 2 seuils */
export function advanceDualMeterBallistics(
  state: PeakHoldState, rmsDb: number, peakDb: number, isClipNow: boolean, nowMs: number, gainOffsetDb = 0
) {
  const dtSec = state.lastTickMs > 0 ? Math.max(0, Math.min(0.2, (nowMs - state.lastTickMs) / 1000)) : 0.016;
  state.lastTickMs = nowMs;
  const off = Number.isFinite(gainOffsetDb) ? gainOffsetDb : 0;
  const cRmsDb = Number.isFinite(rmsDb) ? Math.max(-60, Math.min(6, rmsDb + off)) : -60;
  const cPeakDb = Number.isFinite(peakDb) ? Math.max(-60, Math.min(6, peakDb + off)) : -60;

  if (cRmsDb > state.rmsDb) {
    const baseRms = state.rmsDb <= -58 ? Math.max(-42, cRmsDb - 10) : state.rmsDb;
    state.rmsDb = Math.min(cRmsDb, baseRms + Math.max(16 * dtSec, (cRmsDb - baseRms) * (1 - Math.exp(-dtSec / 0.090))));
  } else {
    state.rmsDb = Math.max(cRmsDb, state.rmsDb - Math.max(16 * dtSec, (state.rmsDb - cRmsDb) * (1 - Math.exp(-dtSec / 0.180)) * 0.35));
  }
  state.rmsBarNorm = dbToStudioMeterNorm(state.rmsDb);
  if (state.rmsBarNorm < 0.005) { state.rmsBarNorm = 0; state.rmsDb = -60; }

  const instantPeakNorm = dbToStudioMeterNorm(cPeakDb);
  if (instantPeakNorm >= state.peakBarNorm) { state.peakDb = cPeakDb; state.peakBarNorm = instantPeakNorm; }
  else {
    state.peakDb = Math.max(cPeakDb, state.peakDb - 18 * dtSec);
    state.peakBarNorm = dbToStudioMeterNorm(state.peakDb);
    if (state.peakBarNorm < 0.005) { state.peakBarNorm = 0; state.peakDb = -60; }
  }
  state.effectivePeakNorm = Math.max(state.peakBarNorm, state.rmsBarNorm);
  state.barNorm = state.effectivePeakNorm; state.barDb = state.peakDb;

  if (state.effectivePeakNorm >= state.holdNorm) {
    state.holdNorm = state.effectivePeakNorm; state.holdDb = Math.max(state.peakDb, state.rmsDb); state.holdUntilMs = nowMs + 1200;
  } else if (nowMs > state.holdUntilMs) {
    state.holdDb = Math.max(state.peakDb, state.holdDb - 15 * dtSec);
    state.holdNorm = Math.max(state.effectivePeakNorm, dbToStudioMeterNorm(state.holdDb));
    if (state.holdNorm < 0.01) { state.holdNorm = 0; state.holdDb = -60; }
  }
  state.peakScale = state.holdNorm;
  if (isClipNow || cPeakDb >= -0.1) state.clipUntilMs = Math.max(state.clipUntilMs, nowMs + 3000);
  else if (cPeakDb >= -3.0) state.warnUntilMs = Math.max(state.warnUntilMs, nowMs + 350);
  const ledState: VuLedState = nowMs < state.clipUntilMs ? 'clip' : (nowMs < state.warnUntilMs ? 'warn' : 'off');
  return { rmsBarNorm: state.rmsBarNorm, peakBarNorm: state.peakBarNorm, effectivePeakNorm: state.effectivePeakNorm, barNorm: state.barNorm, holdNorm: state.holdNorm, peakScale: state.holdNorm, isClipHeld: ledState === 'clip', ledState, peakDb: cPeakDb };
}

export function advancePeakBallistics(state: PeakHoldState, peakDb: number, isClipNow: boolean, nowMs: number) {
  return advanceDualMeterBallistics(state, peakDb - 6, peakDb, isClipNow, nowMs, 0);
}
export const advancePeakHoldState = advancePeakBallistics;
