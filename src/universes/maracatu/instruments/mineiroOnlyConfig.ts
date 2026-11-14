/**
 * O Girador - Mineiro Audio Configuration (< 50 lignes)
 * - P / p : Pousser (Avant) / Projetar (Para frente)
 * - T / t : Tirer (Vers soi) / Trazer (Para trás)
 */

import { InstrumentAudioConfig, StrokeMapping } from './types';
import { buildStudioMineiroStrokes, resolveStudioBankFlags, STUDIO_BANK_ENABLED } from './studioBankRegistry';
import { buildBarulhoStrokePair } from './studioStrokeFactory';

const MINEIRO_WEAK_LEGACY = ['Mixdown/Mineiro f 1.ogg', 'Mixdown/Mineiro f 2.ogg', 'Mixdown/Mineiro f 3.ogg', 'Mixdown/Mineiro f 4.ogg'];

const legacyMineiroStrokes: StrokeMapping[] = [
  {
    symbol: 'P', // P ↑ — Pousser (Avant) / Projetar (Para frente)
    keys: ['P'],
    files: ['Mixdown/Mineiro F P 1.ogg', 'Mixdown/Mineiro F P 2.ogg', 'Mixdown/Mineiro F P 3.ogg', 'Mixdown/Mineiro F P 4.ogg'],
    caseSensitive: true,
    baseGain: 1.0,
  },
  {
    symbol: 'T', // T ↓ — Tirer (Vers soi) / Trazer (Para trás)
    keys: ['T'],
    files: ['Mixdown/Mineiro F T 1.ogg', 'Mixdown/Mineiro F T 2.ogg', 'Mixdown/Mineiro F T 3.ogg', 'Mixdown/Mineiro F T 4.ogg'],
    caseSensitive: true,
    baseGain: 1.0,
  },
  { symbol: 'p', keys: ['p'], files: MINEIRO_WEAK_LEGACY, caseSensitive: true, baseGain: 1.0 },
  { symbol: 't', keys: ['t'], files: MINEIRO_WEAK_LEGACY, caseSensitive: true, baseGain: 1.0 },
  {
    symbol: 'L',
    keys: ['L', 'l'],
    files: ['Mixdown/Mineiro L 1.ogg', 'Mixdown/Mineiro L 2.ogg', 'Mixdown/Mineiro L 3.ogg', 'Mixdown/Mineiro L 4.ogg'],
    caseSensitive: false,
    baseGain: 1.0,
  },
  ...buildBarulhoStrokePair('Mixdown/Mineiro B.ogg'),
];

export const mineiroConfig: InstrumentAudioConfig = {
  id: 'mineiro',
  name: 'Mineiro',
  uiOrder: ['P', 'T', 'p', 't', 'L', 'B'],
  leftHandedSupport: false,
  ...resolveStudioBankFlags('mineiro'),
  strokes: STUDIO_BANK_ENABLED.mineiro ? buildStudioMineiroStrokes() : legacyMineiroStrokes,
};
