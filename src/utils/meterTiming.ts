/**
 * Calculs unifiés de métrique et durées audio / visuelles (Zero Render Thrashing).
 */

import { getRodaMeasureGeometry } from './rodaTimeSigGeometry';

export function isCompoundMeter(sig: string): boolean {
  return getRodaMeasureGeometry(sig).isCompound;
}

export function getBeatsCount(sig: string): number {
  return getRodaMeasureGeometry(sig).beatsCount;
}

export function getBeatDurationSec(sig: string, bpm: number): number {
  const safeBpm = Math.max(1, bpm || 100);
  return isCompoundMeter(sig) ? 90 / safeBpm : 60 / safeBpm;
}

export function getMeasureDurationSec(sig: string, bpm: number): number {
  const safeBpm = Math.max(1, bpm || 100);
  const totalTicks = getRodaMeasureGeometry(sig).maxTicks;
  return (totalTicks * 2.5) / safeBpm;
}

export function getTickDurationSec(bpm: number): number {
  const safeBpm = Math.max(1, bpm || 100);
  return 2.5 / safeBpm;
}
