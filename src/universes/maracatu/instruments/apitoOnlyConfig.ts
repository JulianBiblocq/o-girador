/**
 * O Girador - Apito Audio Configuration (< 40 lignes)
 * - Expose `L` / `l` (sifflet long bouclé comme un Barulho) et `C` (sifflet court) en plus de `W` / `w`.
 * - Tant que `STUDIO_BANK_ENABLED.apito === false`, fallback automatique sans 404 sur `Mixdown/Apito W long.ogg` et `Mixdown/Apito w court.ogg`.
 */

import { InstrumentAudioConfig, StrokeMapping } from './types';
import { buildStudioApitoStrokes, resolveStudioBankFlags, STUDIO_BANK_ENABLED } from './studioBankRegistry';

const legacyApitoStrokes: StrokeMapping[] = [
  { symbol: 'W', keys: ['W'], files: ['Mixdown/Apito W long.ogg'], caseSensitive: true, baseGain: 1.0 },
  { symbol: 'w', keys: ['w'], files: ['Mixdown/Apito w court.ogg'], caseSensitive: true, baseGain: 1.0 },
  { symbol: 'L', keys: ['L'], files: ['Mixdown/Apito W long.ogg'], caseSensitive: true, isBarulho: true, baseGain: 1.0 },
  { symbol: 'l', keys: ['l'], files: ['Mixdown/Apito W long.ogg'], caseSensitive: true, isBarulho: true, baseGain: 1.0 },
  { symbol: 'C', keys: ['C', 'c'], files: ['Mixdown/Apito w court.ogg'], caseSensitive: false, baseGain: 1.0 },
];

export const apitoConfig: InstrumentAudioConfig = {
  id: 'apito',
  name: 'Apito',
  uiOrder: ['W', 'w', 'L', 'C'],
  leftHandedSupport: false,
  ...resolveStudioBankFlags('apito'),
  strokes: STUDIO_BANK_ENABLED.apito ? buildStudioApitoStrokes() : legacyApitoStrokes,
};
