export type BalancoMorphPhase = 'idle' | 'waiting-play' | 'anchor' | 'ramp-down' | 'hold-zero' | 'ramp-up';

let horizonRebuilder: (() => void) | null = null;
export function registerLiveBalancoHorizonRebuilder(fn: () => void): void { horizonRebuilder = fn; }

let drawerOpen = false;
const drawerListeners = new Set<() => void>();
let manualScale = 1.0;
let cycleActive = false, waitingForPlay = false;
let t0Sec = 0, t1Sec = 0, t2Sec = 0, t3Sec = 0, t4Sec = 0, startScale = 1.0;
let throttleTimer: ReturnType<typeof setTimeout> | null = null;
let lastHorizonRebuildMs = 0;
const HORIZON_THROTTLE_MS = 50;

function scheduleHorizonRebuild(immediate: boolean): void {
  if (throttleTimer !== null) { clearTimeout(throttleTimer); throttleTimer = null; }
  const nowMs = typeof performance !== 'undefined' ? performance.now() : Date.now();
  if (immediate || nowMs - lastHorizonRebuildMs >= HORIZON_THROTTLE_MS) {
    lastHorizonRebuildMs = nowMs;
    horizonRebuilder?.();
    return;
  }
  const waitMs = Math.max(10, HORIZON_THROTTLE_MS - (nowMs - lastHorizonRebuildMs));
  throttleTimer = setTimeout(() => {
    throttleTimer = null;
    lastHorizonRebuildMs = typeof performance !== 'undefined' ? performance.now() : Date.now();
    horizonRebuilder?.();
  }, waitMs);
}

export function subscribeFocusBalancoDrawer(listener: () => void): () => void {
  drawerListeners.add(listener);
  return () => drawerListeners.delete(listener);
}

export function getIsFocusBalancoDrawerOpen(): boolean { return drawerOpen; }

export function setFocusBalancoDrawerOpen(open: boolean): void {
  if (!open) resetLiveBalancoMorphToUnity();
  if (drawerOpen !== open) {
    drawerOpen = open;
    drawerListeners.forEach((fn) => fn());
  }
}

export function getLiveBalancoMorphScale(): number { return manualScale; }
export function isBalancoMorphCycleActive(): boolean { return cycleActive; }

export function getLiveBalancoMorphScaleAtTime(baseStepAudioSec?: number): number {
  if (!cycleActive) return manualScale;
  if (waitingForPlay || t0Sec <= 0 || baseStepAudioSec === undefined) return startScale;
  if (baseStepAudioSec <= t1Sec) return startScale;
  if (baseStepAudioSec <= t2Sec) {
    const u = (baseStepAudioSec - t1Sec) / Math.max(0.001, t2Sec - t1Sec);
    return startScale * (0.5 + 0.5 * Math.cos(Math.PI * u));
  }
  if (baseStepAudioSec <= t3Sec) return 0;
  if (baseStepAudioSec < t4Sec) {
    const u = (baseStepAudioSec - t3Sec) / Math.max(0.001, t4Sec - t3Sec);
    return 0.5 - 0.5 * Math.cos(Math.PI * u);
  }
  return 1.0;
}

export function resolveBalancoMorphPhaseAtTime(audioSec: number): BalancoMorphPhase {
  if (!cycleActive) return 'idle';
  if (waitingForPlay || t0Sec <= 0) return 'waiting-play';
  if (audioSec < t1Sec) return 'anchor';
  if (audioSec < t2Sec) return 'ramp-down';
  if (audioSec < t3Sec) return 'hold-zero';
  if (audioSec < t4Sec) return 'ramp-up';
  cycleActive = false;
  manualScale = 1.0;
  return 'idle';
}

export function anchorBalancoMorphEnvelope(audioNowSec: number, rawMeasureDurSec: number): void {
  const mSec = Math.max(1.1, Math.min(4.0, rawMeasureDurSec || 2.4));
  waitingForPlay = false;
  t0Sec = audioNowSec;
  t1Sec = t0Sec + 1.0 * mSec;
  t2Sec = t1Sec + 2.0 * mSec;
  t3Sec = t2Sec + 2.0 * mSec;
  t4Sec = t3Sec + 2.0 * mSec;
  scheduleHorizonRebuild(true);
}

export function startBalancoMorphCycle(audioNowSec: number, measureDurSec: number, waitPlay: boolean): void {
  startScale = manualScale > 0.15 ? manualScale : 1.0;
  manualScale = startScale;
  cycleActive = true;
  if (waitPlay) { waitingForPlay = true; t0Sec = 0; }
  else anchorBalancoMorphEnvelope(audioNowSec, measureDurSec);
}

export function setManualBalancoMorphScale(nextScale: number, immediate = false): void {
  const clamped = Math.max(0, Math.min(1, Number.isFinite(nextScale) ? nextScale : 1));
  const changed = cycleActive || Math.abs(clamped - manualScale) > 1e-4;
  cycleActive = false; waitingForPlay = false; t0Sec = 0;
  manualScale = clamped;
  if (changed) scheduleHorizonRebuild(immediate);
}

export function resetLiveBalancoMorphToUnity(): void {
  const wasNonUnity = cycleActive || waitingForPlay || Math.abs(manualScale - 1.0) > 1e-4;
  if (throttleTimer !== null) { clearTimeout(throttleTimer); throttleTimer = null; }
  cycleActive = false; waitingForPlay = false; t0Sec = 0;
  manualScale = 1.0; startScale = 1.0;
  if (wasNonUnity) horizonRebuilder?.();
}

if (typeof window !== 'undefined') {
  window.addEventListener('o-girador-playback-stopped', () => {
    if (cycleActive || waitingForPlay) resetLiveBalancoMorphToUnity();
  });
}
