/**
 * alfaiaBankBuilder.ts — Constructeur des banques multi-samples Studio dédiées par fût d'Alfaia (< 80 lignes).
 * Nomenclature 100 % insensible à la casse (Windows NTFS & Linux ext4) : D, E, d_min, e_min, A, X, C, I, B.
 */
import { StrokeMapping } from './types';

export type AlfaiaStudioRole = 'marcante' | 'meiao' | 'repique';

function buildFiles(role: AlfaiaStudioRole, artToken: string, count: number): string[] {
  return Array.from({ length: count }, (_, i) => `Mixdown/Alfaia ${role} ${artToken} ${i + 1}.ogg`);
}

export function buildDedicatedAlfaiaStrokes(role: AlfaiaStudioRole, dStrongCount: number): StrokeMapping[] {
  return [
    {
      symbol: 'D',
      keys: ['D'],
      files: buildFiles(role, 'D', dStrongCount),
      caseSensitive: true,
    },
    {
      symbol: 'E',
      keys: ['E'],
      files: buildFiles(role, 'E', 6),
      caseSensitive: true,
    },
    {
      symbol: 'd',
      keys: ['d'],
      files: buildFiles(role, 'd_min', 6),
      caseSensitive: true,
    },
    {
      symbol: 'e',
      keys: ['e'],
      files: buildFiles(role, 'e_min', 6),
      caseSensitive: true,
    },
    {
      symbol: 'A',
      keys: ['A', 'a'],
      files: buildFiles(role, 'A', 4),
      caseSensitive: false,
    },
    {
      symbol: 'X',
      keys: ['X', 'x'],
      files: buildFiles(role, 'X', 4),
      caseSensitive: false,
    },
    {
      symbol: 'C',
      keys: ['C', 'c'],
      files: buildFiles(role, 'C', 4),
      caseSensitive: false,
    },
    {
      symbol: 'I',
      keys: ['I', 'i'],
      files: buildFiles(role, 'I', 4),
      caseSensitive: false,
    },
    {
      symbol: 'B',
      keys: ['B', 'b'],
      files: [`Mixdown/Alfaia ${role} B.ogg`],
      caseSensitive: false,
      isBarulho: true,
    },
  ];
}
