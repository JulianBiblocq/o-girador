/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Calculateur dynamique de capacité A4 pleine page pour les fiches vierges (< 50 lignes).
 */

export interface SectionCapacityParams {
  pupitresCount: number;
  hasVariationLine?: boolean;
  freeLinesCount?: number;
  isLandscape?: boolean;
}

export function calculateFeuilleASeriesCount(params: SectionCapacityParams): number {
  const { pupitresCount, hasVariationLine = false, freeLinesCount = 0, isLandscape = false } = params;
  const rows = Math.max(1, pupitresCount + (hasVariationLine ? 1 : 0) + freeLinesCount);
  const budget = isLandscape ? 16 : 24;
  return Math.max(1, Math.min(isLandscape ? 4 : 6, Math.floor(budget / Math.max(1, rows))));
}

export function calculateFeuilleBSectionsCount(params: SectionCapacityParams): number {
  const { pupitresCount, hasVariationLine = false, freeLinesCount = 0, isLandscape = false } = params;
  const rows = Math.max(1, pupitresCount + (hasVariationLine ? 1 : 0) + freeLinesCount);
  const budget = isLandscape ? 17 : 26;
  const linesPerSec = rows + 1.25;
  return Math.max(1, Math.min(isLandscape ? 4 : 6, Math.floor(budget / linesPerSec)));
}

export function calculateFeuilleCSystemsCount(isLandscape = false): number {
  return isLandscape ? 4 : 6;
}

export function calculateFeuilleDRowsCount(isLandscape = false): number {
  return isLandscape ? 14 : 20;
}
