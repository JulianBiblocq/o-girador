/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const percentToDb = (percent: number): number => {
  if (percent <= 0) return -Infinity;
  return 40 * Math.log10(percent / 100);
};

export const calcReverbOpacity = (vol: number): number => {
  const clamped = Math.max(0, Math.min(100, vol));
  if (clamped <= 0) return 0.12;
  if (clamped <= 50) return 0.12 + (clamped / 50) * (0.50 - 0.12);
  if (clamped <= 70) return 0.50 + ((clamped - 50) / 20) * (0.85 - 0.50);
  return 0.85 + ((clamped - 70) / 30) * (1.0 - 0.85);
};

export const calcDistoOpacity = (drive: number): number => {
  const clamped = Math.max(0, Math.min(100, drive));
  return 0.12 + (clamped / 100) * 0.88;
};
