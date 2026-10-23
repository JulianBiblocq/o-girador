/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Calculs unifiés de métrique et durées audio / visuelles (Zero Render Thrashing).
 */

import { getMaxTicks } from '../data';

export function isCompoundMeter(sig: string): boolean {
  return sig === '6/8' || sig === '12/8';
}

export function getBeatsCount(sig: string): number {
  if (sig === '6/8') return 2;
  if (sig === '12/8') return 4;
  if (sig === '3/4') return 3;
  if (sig === '2/4') return 2;
  return 4;
}

export function getBeatDurationSec(sig: string, bpm: number): number {
  const safeBpm = Math.max(1, bpm || 100);
  return isCompoundMeter(sig) ? 90 / safeBpm : 60 / safeBpm;
}

export function getMeasureDurationSec(sig: string, bpm: number): number {
  const safeBpm = Math.max(1, bpm || 100);
  const totalTicks = getMaxTicks(sig as any);
  return (totalTicks * 2.5) / safeBpm;
}

export function getTickDurationSec(bpm: number): number {
  const safeBpm = Math.max(1, bpm || 100);
  return 2.5 / safeBpm;
}
