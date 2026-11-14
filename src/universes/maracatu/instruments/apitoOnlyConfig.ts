/**
 * O Girador - Apito Audio Configuration (< 35 lignes)
 */

import { InstrumentAudioConfig, StrokeMapping } from './types';
import { buildStudioApitoStrokes, resolveStudioBankFlags, STUDIO_BANK_ENABLED } from './studioBankRegistry';

const legacyApitoStrokes: StrokeMapping[] = [
  { symbol: 'W', keys: ['W'], files: ['Mixdown/Apito W long.ogg'], caseSensitive: true, baseGain: 1.0 },
  { symbol: 'w', keys: ['w'], files: ['Mixdown/Apito w court.ogg'], caseSensitive: true, baseGain: 1.0 },
];

export const apitoConfig: InstrumentAudioConfig = {
  id: 'apito',
  name: 'Apito',
  uiOrder: ['W', 'w'],
  leftHandedSupport: false,
  ...resolveStudioBankFlags('apito'),
  strokes: STUDIO_BANK_ENABLED.apito ? buildStudioApitoStrokes() : legacyApitoStrokes,
};
