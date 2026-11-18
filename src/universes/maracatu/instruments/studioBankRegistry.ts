/**
 * studioBankRegistry.ts — Registre d'accueil Studio sans 404 des 7 instruments restants (< 130 lignes).
 * - Tant que `STUDIO_BANK_ENABLED[id]` vaut `false`, les configs conservent 100 % des fichiers actuels (`0` x 404).
 * - Dès bascule à `true`, active la nomenclature `*_min`, `calibratedStudioBank: true`, `macroPitch: 1.0` et `f`/`v` à `0.82`.
 */

import { StrokeMapping } from './types';
import {
  buildBarulhoStrokePair,
  buildDedicatedStroke,
  buildStudioFiles,
  buildVirtualWeakStroke,
} from './studioStrokeFactory';

export type PendingStudioInstrumentId =
  | 'caixa'
  | 'tarol'
  | 'timbal'
  | 'gongue'
  | 'agbe'
  | 'mineiro'
  | 'apito';

export const STUDIO_BANK_ENABLED: Record<PendingStudioInstrumentId, boolean> = {
  caixa: false,
  tarol: false,
  timbal: false,
  gongue: true,
  agbe: true,
  mineiro: true,
  apito: true,
};

export function resolveStudioBankFlags(id: PendingStudioInstrumentId): {
  macroPitch?: number;
  calibratedStudioBank?: boolean;
} {
  if (!STUDIO_BANK_ENABLED[id]) return {};
  return { macroPitch: 1.0, calibratedStudioBank: true };
}

export function buildStudioSnareStrokes(prefix: 'Caixa' | 'Tarol'): StrokeMapping[] {
  const rimPool = buildStudioFiles(prefix, 'A', 5);
  const flaPool = buildStudioFiles(prefix, 'F', 4);
  return [
    buildDedicatedStroke('D', buildStudioFiles(prefix, 'D', 6)),
    buildDedicatedStroke('E', buildStudioFiles(prefix, 'E', 6)),
    buildDedicatedStroke('d', buildStudioFiles(prefix, 'd_min', 6)),
    buildDedicatedStroke('e', buildStudioFiles(prefix, 'e_min', 6)),
    buildDedicatedStroke('A', rimPool, ['A'], true),
    buildDedicatedStroke('a', rimPool, ['a'], true),
    buildDedicatedStroke('R', buildStudioFiles(prefix, 'R', 4)),
    buildDedicatedStroke('r', buildStudioFiles(prefix, 'r_min', 4)),
    buildDedicatedStroke('F', flaPool, ['F'], true),
    buildVirtualWeakStroke('f', flaPool),
    buildDedicatedStroke('X', buildStudioFiles(prefix, 'X', 4), ['X', 'x'], false),
    buildDedicatedStroke('C', buildStudioFiles(prefix, 'C', 4), ['C', 'c'], false),
    ...buildBarulhoStrokePair(`Mixdown/${prefix} B.ogg`),
  ];
}

export function buildStudioTimbalStrokes(): StrokeMapping[] {
  const fPool = buildStudioFiles('Timbal', 'F', 4);
  const vPool = buildStudioFiles('Timbal', 'V', 4);
  return [
    buildDedicatedStroke('G', buildStudioFiles('Timbal', 'G', 6)),
    buildDedicatedStroke('g', buildStudioFiles('Timbal', 'g_min', 6)),
    buildDedicatedStroke('A', buildStudioFiles('Timbal', 'A', 6)),
    buildDedicatedStroke('a', buildStudioFiles('Timbal', 'a_min', 6)),
    buildDedicatedStroke('S', buildStudioFiles('Timbal', 'S', 6)),
    buildDedicatedStroke('s', buildStudioFiles('Timbal', 's_min', 6)),
    buildDedicatedStroke('D', buildStudioFiles('Timbal', 'D', 6)),
    buildDedicatedStroke('d', buildStudioFiles('Timbal', 'd_min', 6)),
    buildDedicatedStroke('P', buildStudioFiles('Timbal', 'P', 6)),
    buildDedicatedStroke('p', buildStudioFiles('Timbal', 'p_min', 6)),
    buildDedicatedStroke('F', fPool, ['F'], true),
    buildVirtualWeakStroke('f', fPool),
    buildDedicatedStroke('V', vPool, ['V'], true),
    buildVirtualWeakStroke('v', vPool),
    buildDedicatedStroke('C', buildStudioFiles('Timbal', 'C', 4), ['C', 'c'], false),
    ...buildBarulhoStrokePair('Mixdown/Timbal B.ogg'),
  ];
}

export function buildStudioGongueStrokes(): StrokeMapping[] {
  return [
    buildDedicatedStroke('G', buildStudioFiles('Gongue', 'G', 6)),
    buildDedicatedStroke('A', buildStudioFiles('Gongue', 'A', 6)),
    buildDedicatedStroke('g', buildStudioFiles('Gongue', 'g_min', 5)),
    buildDedicatedStroke('a', buildStudioFiles('Gongue', 'a_min', 5)),
    buildDedicatedStroke('X', buildStudioFiles('Gongue', 'X', 3), ['X'], true),
    ...buildBarulhoStrokePair('Mixdown/Gongue B.ogg'),
  ];
}

export function buildStudioAgbeStrokes(): StrokeMapping[] {
  const sPool = buildStudioFiles('Agbe', 'S', 4);
  const vPool = buildStudioFiles('Agbe', 'V', 4);
  return [
    buildDedicatedStroke('E', buildStudioFiles('Agbe', 'F E', 6)),
    buildDedicatedStroke('D', buildStudioFiles('Agbe', 'F D', 6)),
    buildDedicatedStroke('e', buildStudioFiles('Agbe', 'f_min e', 6)),
    buildDedicatedStroke('d', buildStudioFiles('Agbe', 'f_min d', 6)),
    buildDedicatedStroke('S', sPool, ['S'], true),
    buildVirtualWeakStroke('s', sPool),
    buildDedicatedStroke('V', vPool, ['V'], true),
    buildVirtualWeakStroke('v', vPool),
    ...buildBarulhoStrokePair('Mixdown/Agbe B.ogg'),
  ];
}

export function buildStudioMineiroStrokes(): StrokeMapping[] {
  const lPool = buildStudioFiles('Mineiro', 'L', 4);
  return [
    buildDedicatedStroke('P', buildStudioFiles('Mineiro', 'F P', 6)),
    buildDedicatedStroke('T', buildStudioFiles('Mineiro', 'F T', 6)),
    buildDedicatedStroke('p', buildStudioFiles('Mineiro', 'f_min p', 6)),
    buildDedicatedStroke('t', buildStudioFiles('Mineiro', 'f_min t', 6)),
    buildDedicatedStroke('L', lPool, ['L'], true),
    buildVirtualWeakStroke('l', lPool),
    ...buildBarulhoStrokePair('Mixdown/Mineiro B.ogg'),
  ];
}

export function buildStudioApitoStrokes(): StrokeMapping[] {
  const shortFiles = buildStudioFiles('Apito', 'C', 3);
  return [
    { symbol: 'L', keys: ['L'], files: ['Mixdown/Apito L.ogg'], caseSensitive: true, isBarulho: true, baseGain: 1.0 },
    { symbol: 'l', keys: ['l'], files: ['Mixdown/Apito L.ogg'], caseSensitive: true, isBarulho: true, baseGain: 1.0 },
    buildDedicatedStroke('C', shortFiles, ['C', 'c'], false),
    { symbol: 'W', keys: ['W'], files: ['Mixdown/Apito L.ogg'], caseSensitive: true, isBarulho: true, baseGain: 1.0 },
    buildDedicatedStroke('w', shortFiles, ['w'], true),
  ];
}
