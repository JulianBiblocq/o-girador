/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * O Girador - Apito Audio Configuration
 */

import { InstrumentAudioConfig } from './types';

export const apitoConfig: InstrumentAudioConfig = {
  id: 'apito',
  name: 'Apito',
  uiOrder: ['W', 'w'],
  leftHandedSupport: false,
  strokes: [
    {
      symbol: 'W',
      keys: ['W'],
      files: ["Mixdown/Apito W long.ogg"],
      caseSensitive: true
    },
    {
      symbol: 'w',
      keys: ['w'],
      files: ["Mixdown/Apito w court.ogg"],
      caseSensitive: true
    }
  ]
};
