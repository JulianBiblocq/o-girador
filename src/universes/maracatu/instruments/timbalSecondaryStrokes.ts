/**
 * O Girador - Timbal Secondary Stroke Mappings (P, F/f, V/v, C, B/b) (< 70 lignes)
 */

import { StrokeMapping } from './types';
import { buildBarulhoStrokePair, buildVirtualWeakStroke } from './studioStrokeFactory';

const TIMBAL_S_LEGACY = [
  'Mixdown/Timbal S 1.ogg',
  'Mixdown/Timbal S 2.ogg',
  'Mixdown/Timbal S 3.ogg',
  'Mixdown/Timbal S 4.ogg',
];
const TIMBAL_P_LEGACY = [
  'Mixdown/Timbal P 1.ogg',
  'Mixdown/Timbal P 2.ogg',
  'Mixdown/Timbal P 3.ogg',
  'Mixdown/Timbal P 4.ogg',
];
const TIMBAL_F_LEGACY = [
  'Mixdown/Timbal F 1.ogg',
  'Mixdown/Timbal F 2.ogg',
  'Mixdown/Timbal F 3.ogg',
  'Mixdown/Timbal F 4.ogg',
];
const TIMBAL_V_LEGACY = [
  'Mixdown/Timbal V 1.ogg',
  'Mixdown/Timbal V 2.ogg',
  'Mixdown/Timbal V 3.ogg',
  'Mixdown/Timbal V 4.ogg',
];

export const timbalSecondaryStrokes: StrokeMapping[] = [
  { symbol: 'T', keys: ['T'], files: TIMBAL_S_LEGACY, caseSensitive: true, baseGain: 1.0 },
  { symbol: 't', keys: ['t'], files: TIMBAL_S_LEGACY, caseSensitive: true, baseGain: 1.0 },
  { symbol: 'P', keys: ['P'], files: TIMBAL_P_LEGACY, caseSensitive: true, baseGain: 1.0 },
  { symbol: 'p', keys: ['p'], files: TIMBAL_P_LEGACY, caseSensitive: true, baseGain: 1.0 },
  { symbol: 'F', keys: ['F'], files: TIMBAL_F_LEGACY, caseSensitive: true, baseGain: 1.0 },
  buildVirtualWeakStroke('f', TIMBAL_F_LEGACY),
  { symbol: 'V', keys: ['V'], files: TIMBAL_V_LEGACY, caseSensitive: true, baseGain: 1.0 },
  buildVirtualWeakStroke('v', TIMBAL_V_LEGACY),
  { symbol: 'C', keys: ['C', 'c'], files: ['Mixdown/Timbal C 1.ogg', 'Mixdown/Timbal C 2.ogg'], caseSensitive: false, baseGain: 1.0 },
  ...buildBarulhoStrokePair('Mixdown/Timbal B.ogg'),
];
