/**
 * O Girador - Gonguê / Iron Bell Audio Configuration (< 55 lignes)
 */

import { InstrumentAudioConfig, StrokeMapping } from './types';
import { buildStudioGongueStrokes, resolveStudioBankFlags, STUDIO_BANK_ENABLED } from './studioBankRegistry';
import { buildBarulhoStrokePair } from './studioStrokeFactory';

const legacyGongueStrokes: StrokeMapping[] = [
  {
    symbol: 'G',
    keys: ['G'],
    files: ['Mixdown/Gongue G 1.ogg', 'Mixdown/Gongue G 2.ogg', 'Mixdown/Gongue G 3.ogg', 'Mixdown/Gongue G 4.ogg'],
    caseSensitive: true,
    baseGain: 1.0,
  },
  {
    symbol: 'A',
    keys: ['A'],
    files: ['Mixdown/Gongue A 1.ogg', 'Mixdown/Gongue A 2.ogg', 'Mixdown/Gongue A 3.ogg', 'Mixdown/Gongue A 4.ogg'],
    caseSensitive: true,
    baseGain: 1.0,
  },
  {
    symbol: 'g',
    keys: ['g'],
    files: ['Mixdown/Gongue f g 1.ogg', 'Mixdown/Gongue f g 2.ogg', 'Mixdown/Gongue f g 3.ogg', 'Mixdown/Gongue f g 4.ogg'],
    caseSensitive: true,
    baseGain: 1.0,
  },
  {
    symbol: 'a',
    keys: ['a'],
    files: ['Mixdown/Gongue f a 1.ogg', 'Mixdown/Gongue f a 2.ogg', 'Mixdown/Gongue f a 3.ogg', 'Mixdown/Gongue f a 4.ogg'],
    caseSensitive: true,
    baseGain: 1.0,
  },
  ...buildBarulhoStrokePair('Mixdown/Gongue B.ogg'),
];

export const gongueConfig: InstrumentAudioConfig = {
  id: 'gongue',
  name: 'Gonguê',
  uiOrder: ['G', 'A', 'g', 'a', 'B'],
  leftHandedSupport: false,
  ...resolveStudioBankFlags('gongue'),
  strokes: STUDIO_BANK_ENABLED.gongue ? buildStudioGongueStrokes() : legacyGongueStrokes,
};
