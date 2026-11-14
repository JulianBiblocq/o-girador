/**
 * studioStrokeFactory.ts — Fabrique pure de mappings de frappes Studio & Fallbacks (< 85 lignes).
 * - Convention OS-safe insensible à la casse (`*_min` pour les vraies minuscules enregistrées).
 * - `baseGain: 1.0` sur 100 % des banques dédiées ; `baseGain: 0.82` réservé aux minuscules virtuelles `f` et `v`.
 */

import { StrokeMapping } from './types';

export const VIRTUAL_LOWERCASE_GAIN = 0.82;

export function buildStudioFiles(prefix: string, artToken: string, count: number): string[] {
  return Array.from({ length: count }, (_, i) => `Mixdown/${prefix} ${artToken} ${i + 1}.ogg`);
}

export function buildDedicatedStroke(
  symbol: string,
  files: string[],
  keys: string[] = [symbol],
  caseSensitive = true
): StrokeMapping {
  return {
    symbol,
    keys,
    files,
    caseSensitive,
    baseGain: 1.0,
  };
}

export function buildVirtualWeakStroke(symbol: 'f' | 'v', parentFiles: string[]): StrokeMapping {
  return {
    symbol,
    keys: [symbol],
    files: [...parentFiles],
    caseSensitive: true,
    baseGain: VIRTUAL_LOWERCASE_GAIN,
  };
}

export function buildBarulhoStrokePair(barulhoFile: string): StrokeMapping[] {
  return [
    {
      symbol: 'B',
      keys: ['B'],
      files: [barulhoFile],
      caseSensitive: true,
      isBarulho: true,
      baseGain: 1.0,
    },
    {
      symbol: 'b',
      keys: ['b'],
      files: [barulhoFile],
      caseSensitive: true,
      isBarulho: true,
      baseGain: 1.0,
    },
  ];
}

export function buildCompositeRimFallbackPair(strongHeadFiles: string[], rimSymbol = 'X'): StrokeMapping[] {
  return [
    {
      symbol: 'A',
      keys: ['A'],
      files: [...strongHeadFiles],
      caseSensitive: true,
      baseGain: 1.0,
      compositeRimSymbol: rimSymbol,
    },
    {
      symbol: 'a',
      keys: ['a'],
      files: [...strongHeadFiles],
      caseSensitive: true,
      baseGain: 1.0,
      compositeRimSymbol: rimSymbol,
    },
  ];
}
