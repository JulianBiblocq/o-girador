/**
 * O Girador - Caixa Instrument Audio Configuration (< 75 lignes)
 */

import { InstrumentAudioConfig, StrokeMapping } from './types';
import { buildStudioSnareStrokes, resolveStudioBankFlags, STUDIO_BANK_ENABLED } from './studioBankRegistry';
import { buildBarulhoStrokePair, buildCompositeRimFallbackPair, buildVirtualWeakStroke } from './studioStrokeFactory';

const CAIXA_STRONG_LEGACY = [
  'Mixdown/Caixa F 1.ogg',
  'Mixdown/Caixa F 2.ogg',
  'Mixdown/Caixa F 3.ogg',
  'Mixdown/Caixa F 4.ogg',
];
const CAIXA_WEAK_LEGACY = [
  'Mixdown/Caixa faible 1.ogg',
  'Mixdown/Caixa faible 2.ogg',
  'Mixdown/Caixa faible 3.ogg',
  'Mixdown/Caixa faible 4.ogg',
];
const CAIXA_RUFADA_LEGACY = ['Mixdown/Caixa R 1.ogg', 'Mixdown/Caixa R 2.ogg'];
const CAIXA_FLA_LEGACY = ['Mixdown/Caixa Fla 1.ogg', 'Mixdown/Caixa Fla 2.ogg'];

const legacyCaixaStrokes: StrokeMapping[] = [
  { symbol: 'D', keys: ['D'], files: CAIXA_STRONG_LEGACY, caseSensitive: true, baseGain: 1.0 },
  { symbol: 'E', keys: ['E'], files: CAIXA_STRONG_LEGACY, caseSensitive: true, baseGain: 1.0 },
  { symbol: 'd', keys: ['d'], files: CAIXA_WEAK_LEGACY, caseSensitive: true, baseGain: 1.0 },
  { symbol: 'e', keys: ['e'], files: CAIXA_WEAK_LEGACY, caseSensitive: true, baseGain: 1.0 },
  ...buildCompositeRimFallbackPair(CAIXA_STRONG_LEGACY, 'X'),
  { symbol: 'R', keys: ['R'], files: CAIXA_RUFADA_LEGACY, caseSensitive: true, baseGain: 1.0 },
  { symbol: 'r', keys: ['r'], files: CAIXA_RUFADA_LEGACY, caseSensitive: true, baseGain: 1.0 },
  { symbol: 'F', keys: ['F'], files: CAIXA_FLA_LEGACY, caseSensitive: true, baseGain: 1.0 },
  buildVirtualWeakStroke('f', CAIXA_FLA_LEGACY),
  { symbol: 'X', keys: ['X', 'x'], files: ['Mixdown/Caixa X.ogg'], caseSensitive: false, baseGain: 1.0 },
  { symbol: 'C', keys: ['C', 'c'], files: ['Mixdown/Caixa C 1.ogg', 'Mixdown/Caixa C 2.ogg'], caseSensitive: false, baseGain: 1.0 },
  ...buildBarulhoStrokePair('Mixdown/Caixa B.ogg'),
];

export const caixaConfig: InstrumentAudioConfig = {
  id: 'caixa',
  name: 'Caixa',
  uiOrder: ['D', 'E', 'd', 'e', 'A', 'a', 'X', 'C', 'B', 'F', 'R', 'r'],
  leftHandedSupport: true,
  ...resolveStudioBankFlags('caixa'),
  strokes: STUDIO_BANK_ENABLED.caixa ? buildStudioSnareStrokes('Caixa') : legacyCaixaStrokes,
};
