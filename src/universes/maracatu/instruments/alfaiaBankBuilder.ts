/**
 * alfaiaBankBuilder.ts — Constructeur des banques multi-samples Studio dédiées par fût d'Alfaia (< 100 lignes).
 * Nomenclature 100 % insensible à la casse (Windows NTFS & Linux ext4) : D, E, d_min, e_min, A, X, C, I, B.
 * Calibration dynamique `[d]` : place `d` (main droite faible) à mi-chemin exact en dB entre `e` (~ -8.3 dB) et `D` (0 dB).
 */
import { StrokeMapping } from './types';

export type AlfaiaStudioRole = 'marcante' | 'meiao' | 'repique';

/**
 * Compensation linéaire par fût mesurée sur les samples `.ogg` 48 kHz (RMS 80 ms d'attaque + RMS intégral) :
 * - marcante : `e` = -8.22 dB vs `D` -> cible `d` = -4.11 dB vs `D` (+4.40 dB sur `d_min`, soit x1.66)
 * - meiao    : `e` = -8.81 dB vs `D` -> cible `d` = -4.40 dB vs `D` (+3.69 dB sur `d_min`, soit x1.53)
 * - repique  : `e` = -7.82 dB vs `D` -> cible `d` = -3.91 dB vs `D` (+4.51 dB sur `d_min`, soit x1.68)
 */
export const ALFAIA_WEAK_RIGHT_BASE_GAIN: Record<AlfaiaStudioRole, number> = {
  marcante: 1.66,
  meiao: 1.53,
  repique: 1.68,
};

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
      baseGain: 1.0,
    },
    {
      symbol: 'E',
      keys: ['E'],
      files: buildFiles(role, 'E', 6),
      caseSensitive: true,
      baseGain: 1.0,
    },
    {
      symbol: 'd',
      keys: ['d'],
      files: buildFiles(role, 'd_min', 6),
      caseSensitive: true,
      baseGain: ALFAIA_WEAK_RIGHT_BASE_GAIN[role],
    },
    {
      symbol: 'e',
      keys: ['e'],
      files: buildFiles(role, 'e_min', 6),
      caseSensitive: true,
      baseGain: 1.0,
    },
    {
      symbol: 'A',
      keys: ['A', 'a'],
      files: buildFiles(role, 'A', 4),
      caseSensitive: false,
      baseGain: 1.0,
    },
    {
      symbol: 'X',
      keys: ['X', 'x'],
      files: buildFiles(role, 'X', 4),
      caseSensitive: false,
      baseGain: 1.0,
    },
    {
      symbol: 'C',
      keys: ['C', 'c'],
      files: buildFiles(role, 'C', 4),
      caseSensitive: false,
      baseGain: 1.0,
    },
    {
      symbol: 'I',
      keys: ['I', 'i'],
      files: buildFiles(role, 'I', 4),
      caseSensitive: false,
      baseGain: 1.0,
    },
    {
      symbol: 'B',
      keys: ['B'],
      files: [`Mixdown/Alfaia ${role} B.ogg`],
      caseSensitive: true,
      isBarulho: true,
      baseGain: 1.0,
    },
    {
      symbol: 'b',
      keys: ['b'],
      files: [`Mixdown/Alfaia ${role} B.ogg`],
      caseSensitive: true,
      isBarulho: true,
      baseGain: 1.0,
    },
  ];
}
