/**
 * masterBusBypassRamp.ts — Rampe linéaire sans clic (~25 ms) Zéro-GC pour les étages 1 et 2 du MasterBusWorklet (< 45 lignes).
 * - `activeAestheticMix` (`1` quand `!ecoBypassAesthetic`, `0` en Palier 2 Éco) pilote Bass-Mono, Transient Shaper et Ducking Vocal.
 * - `activeCompMix` (`compMixPct / 100` quand `compressorEnabled && !ecoBypassAesthetic`, `0` sinon) pilote le compresseur Bus Glue.
 */
import type { MasterBusDspParams, MasterBusDspState } from './masterBusWorkletTypes';

export const MASTER_BYPASS_RAMP_SEC = 0.025;

export function computeMasterTargetAestheticMix(p: MasterBusDspParams): number {
  return p.ecoBypassAesthetic ? 0 : 1;
}

export function computeMasterTargetCompMix(p: MasterBusDspParams): number {
  if (!p.compressorEnabled || p.ecoBypassAesthetic || p.ratio <= 1.001) return 0;
  return Math.max(0, Math.min(1, p.compMixPct / 100));
}

export function computeMasterBypassRampStep(sampleRate: number, maxMix = 1): number {
  const sr = sampleRate > 8000 ? sampleRate : 48000;
  return Math.max(0.01, maxMix) / (MASTER_BYPASS_RAMP_SEC * sr);
}

export function advanceLinearMixToward(current: number, target: number, step: number): number {
  if (current < target) {
    const next = current + step;
    return next > target ? target : next;
  }
  if (current > target) {
    const next = current - step;
    return next < target ? target : next;
  }
  return current;
}

export function primeMasterBusBypassMixes(s: MasterBusDspState): void {
  s.activeAestheticMix = computeMasterTargetAestheticMix(s.params);
  s.activeCompMix = computeMasterTargetCompMix(s.params);
}
