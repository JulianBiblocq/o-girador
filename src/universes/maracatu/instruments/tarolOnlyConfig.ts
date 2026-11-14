/**
 * O Girador - Tarol Instrument Audio Configuration (< 75 lignes)
 */

import { InstrumentAudioConfig, StrokeMapping } from './types';
import { buildStudioSnareStrokes, resolveStudioBankFlags, STUDIO_BANK_ENABLED } from './studioBankRegistry';
import { buildBarulhoStrokePair, buildCompositeRimFallbackPair, buildVirtualWeakStroke } from './studioStrokeFactory';

const TAROL_STRONG_LEGACY = [
  'Mixdown/Tarol F1.ogg',
  'Mixdown/Tarol F 2.ogg',
  'Mixdown/Tarol F 3.ogg',
  'Mixdown/Tarol F 4.ogg',
];
const TAROL_WEAK_LEGACY = [
  'Mixdown/Tarol faible 1.ogg',
  'Mixdown/Tarol faible 2.ogg',
  'Mixdown/Tarol faible 3.ogg',
  'Mixdown/Tarol faible 4.ogg',
];
const TAROL_RUFADA_LEGACY = ['Mixdown/Tarol R 1.ogg', 'Mixdown/Tarol R 2.ogg'];
const TAROL_FLA_LEGACY = ['Mixdown/Tarol Fla 1.ogg', 'Mixdown/Tarol Fla 2.ogg'];

const legacyTarolStrokes: StrokeMapping[] = [
  { symbol: 'D', keys: ['D'], files: TAROL_STRONG_LEGACY, caseSensitive: true, baseGain: 1.0 },
  { symbol: 'E', keys: ['E'], files: TAROL_STRONG_LEGACY, caseSensitive: true, baseGain: 1.0 },
  { symbol: 'd', keys: ['d'], files: TAROL_WEAK_LEGACY, caseSensitive: true, baseGain: 1.0 },
  { symbol: 'e', keys: ['e'], files: TAROL_WEAK_LEGACY, caseSensitive: true, baseGain: 1.0 },
  ...buildCompositeRimFallbackPair(TAROL_STRONG_LEGACY, 'X'),
  { symbol: 'R', keys: ['R'], files: TAROL_RUFADA_LEGACY, caseSensitive: true, baseGain: 1.0 },
  { symbol: 'r', keys: ['r'], files: TAROL_RUFADA_LEGACY, caseSensitive: true, baseGain: 1.0 },
  { symbol: 'F', keys: ['F'], files: TAROL_FLA_LEGACY, caseSensitive: true, baseGain: 1.0 },
  buildVirtualWeakStroke('f', TAROL_FLA_LEGACY),
  { symbol: 'X', keys: ['X', 'x'], files: ['Mixdown/Tarol X.ogg'], caseSensitive: false, baseGain: 1.0 },
  { symbol: 'C', keys: ['C', 'c'], files: ['Mixdown/Tarol C 1.ogg', 'Mixdown/Tarol C 2.ogg'], caseSensitive: false, baseGain: 1.0 },
  ...buildBarulhoStrokePair('Mixdown/Tarol B.ogg'),
];

export const tarolConfig: InstrumentAudioConfig = {
  id: 'tarol',
  name: 'Tarol',
  uiOrder: ['D', 'E', 'd', 'e', 'A', 'a', 'X', 'C', 'B', 'F', 'R', 'r'],
  leftHandedSupport: true,
  ...resolveStudioBankFlags('tarol'),
  strokes: STUDIO_BANK_ENABLED.tarol ? buildStudioSnareStrokes('Tarol') : legacyTarolStrokes,
};
