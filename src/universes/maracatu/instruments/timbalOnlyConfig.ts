/**
 * O Girador - Timbal Audio Configuration (< 25 lignes)
 */

import { InstrumentAudioConfig } from './types';
import { timbalStrokes } from './timbalStrokes';
import { buildStudioTimbalStrokes, resolveStudioBankFlags, STUDIO_BANK_ENABLED } from './studioBankRegistry';

export const timbalConfig: InstrumentAudioConfig = {
  id: 'timbal',
  name: 'Timbal',
  uiOrder: ['G', 'g', 'A', 'a', 'S', 's', 'D', 'd', 'P', 'p', 'F', 'V', 'C', 'B'],
  leftHandedSupport: true,
  ...resolveStudioBankFlags('timbal'),
  strokes: STUDIO_BANK_ENABLED.timbal ? buildStudioTimbalStrokes() : timbalStrokes,
};
