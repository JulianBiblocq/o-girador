/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * O Girador - Timbal Audio Configuration
 */

import { InstrumentAudioConfig } from './types';
import { timbalStrokes } from './timbalStrokes';

export const timbalConfig: InstrumentAudioConfig = {
  id: 'timbal',
  name: 'Timbal',
  uiOrder: ['G', 'g', 'A', 'a', 'S', 's', 'D', 'd', 'P', 'p', 'F', 'V', 'C', 'B'],
  leftHandedSupport: true,
  strokes: timbalStrokes
};
