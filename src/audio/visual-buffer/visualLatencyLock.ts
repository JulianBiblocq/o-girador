/**
 * visualLatencyLock.ts — Échantillonnage unique de `outputLatency` au Play/Resume (< 50 lignes).
 * Élimine la gigue matérielle WASAPI/AAudio (±5–20 ms) tout en gardant l'offset Bluetooth réactif en direct.
 */
import * as Tone from 'tone';
import { getBluetoothVisualOffsetSec } from '../../utils/bluetoothLatencyStore';

const FALLBACK_OUTPUT_LATENCY_SEC = 0.05;
const MAX_SANITY_OUTPUT_LATENCY_SEC = 0.25;

let lockedOutputLatencySec = FALLBACK_OUTPUT_LATENCY_SEC;
let hasLockedOnce = false;

export function lockVisualOutputLatency(explicitCtx?: AudioContext | null): number {
  const rawCtx = explicitCtx ?? (Tone.getContext?.()?.rawContext as AudioContext | undefined);
  const rawLat = rawCtx?.outputLatency;
  if (typeof rawLat === 'number' && Number.isFinite(rawLat) && rawLat >= 0) {
    lockedOutputLatencySec = Math.min(MAX_SANITY_OUTPUT_LATENCY_SEC, rawLat);
  } else if (!hasLockedOnce) {
    lockedOutputLatencySec = FALLBACK_OUTPUT_LATENCY_SEC;
  }
  hasLockedOnce = true;
  return lockedOutputLatencySec;
}

export function getLockedOutputLatencySec(): number {
  return lockedOutputLatencySec;
}

export function getLockedVisualDelaySec(): number {
  return Math.max(0, lockedOutputLatencySec + getBluetoothVisualOffsetSec());
}
