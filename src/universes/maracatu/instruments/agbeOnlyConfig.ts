/**
 * O Girador - Agbê Audio Configuration (< 55 lignes)
 */

import { InstrumentAudioConfig, StrokeMapping } from './types';
import { buildStudioAgbeStrokes, resolveStudioBankFlags, STUDIO_BANK_ENABLED } from './studioBankRegistry';
import { buildBarulhoStrokePair, buildVirtualWeakStroke } from './studioStrokeFactory';

const AGBE_WEAK_LEGACY = ['Mixdown/Agbe f 1.ogg', 'Mixdown/Agbe f 2.ogg', 'Mixdown/Agbe f 3.ogg', 'Mixdown/Agbe f 4.ogg'];
const AGBE_VOLTA_LEGACY = ['Mixdown/Agbe A 1.ogg', 'Mixdown/Agbe A 2.ogg'];

const legacyAgbeStrokes: StrokeMapping[] = [
  {
    symbol: 'E',
    keys: ['E'],
    files: ['Mixdown/Agbe F E 1.ogg', 'Mixdown/Agbe F E 2.ogg', 'Mixdown/Agbe F E 3.ogg', 'Mixdown/Agbe F E 4.ogg'],
    caseSensitive: true,
    baseGain: 1.0,
  },
  {
    symbol: 'D',
    keys: ['D'],
    files: ['Mixdown/Agbe F D 1.ogg', 'Mixdown/Agbe F D 2.ogg', 'Mixdown/Agbe F D 3.ogg', 'Mixdown/Agbe F D 4.ogg'],
    caseSensitive: true,
    baseGain: 1.0,
  },
  { symbol: 'e', keys: ['e'], files: AGBE_WEAK_LEGACY, caseSensitive: true, baseGain: 1.0 },
  { symbol: 'd', keys: ['d'], files: AGBE_WEAK_LEGACY, caseSensitive: true, baseGain: 1.0 },
  {
    symbol: 'S',
    keys: ['S', 's'],
    files: ['Mixdown/Agbe S 1.ogg', 'Mixdown/Agbe S 2.ogg'],
    caseSensitive: false,
    baseGain: 1.0,
  },
  { symbol: 'V', keys: ['V'], files: AGBE_VOLTA_LEGACY, caseSensitive: true, baseGain: 1.0 },
  buildVirtualWeakStroke('v', AGBE_VOLTA_LEGACY),
  ...buildBarulhoStrokePair('Mixdown/Agbe B.ogg'),
];

export const agbeConfig: InstrumentAudioConfig = {
  id: 'agbe',
  name: 'Agbê',
  uiOrder: ['E', 'D', 'e', 'd', 'S', 'V', 'B'],
  leftHandedSupport: false,
  ...resolveStudioBankFlags('agbe'),
  strokes: STUDIO_BANK_ENABLED.agbe ? buildStudioAgbeStrokes() : legacyAgbeStrokes,
};
