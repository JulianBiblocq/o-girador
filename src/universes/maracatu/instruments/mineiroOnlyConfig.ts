/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * O Girador - Mineiro Audio Configuration
 */

import { InstrumentAudioConfig } from './types';

export const mineiroConfig: InstrumentAudioConfig = {
  id: 'mineiro',
  name: 'Mineiro',
  uiOrder: ['P', 'T', 'p', 't', 'L', 'B'],
  leftHandedSupport: false,
  strokes: [
    {
      symbol: 'P', // Fort Pousser
      keys: ['P'],
      files: [
        "Mixdown/Mineiro F P 1.ogg",
        "Mixdown/Mineiro F P 2.ogg",
        "Mixdown/Mineiro F P 3.ogg",
        "Mixdown/Mineiro F P 4.ogg"
      ],
      caseSensitive: true
    },
    {
      symbol: 'T', // Fort Tirer
      keys: ['T'],
      files: [
        "Mixdown/Mineiro F T 1.ogg",
        "Mixdown/Mineiro F T 2.ogg",
        "Mixdown/Mineiro F T 3.ogg",
        "Mixdown/Mineiro F T 4.ogg"
      ],
      caseSensitive: true
    },
    {
      symbol: 'p', // Faible Pousser
      keys: ['p'],
      files: [
        "Mixdown/Mineiro f 1.ogg",
        "Mixdown/Mineiro f 2.ogg",
        "Mixdown/Mineiro f 3.ogg",
        "Mixdown/Mineiro f 4.ogg"
      ],
      caseSensitive: true
    },
    {
      symbol: 't', // Faible Tirer
      keys: ['t'],
      files: [
        "Mixdown/Mineiro f 1.ogg",
        "Mixdown/Mineiro f 2.ogg",
        "Mixdown/Mineiro f 3.ogg",
        "Mixdown/Mineiro f 4.ogg"
      ],
      caseSensitive: true
    },
    {
      symbol: 'L', // Lado (L/l) (Insensitive)
      keys: ['L', 'l'],
      files: [
        "Mixdown/Mineiro L 1.ogg",
        "Mixdown/Mineiro L 2.ogg",
        "Mixdown/Mineiro L 3.ogg",
        "Mixdown/Mineiro L 4.ogg"
      ],
      caseSensitive: false
    },
    {
      symbol: 'B', // Barulho (B/b) (Insensitive)
      keys: ['B', 'b'],
      files: ["Mixdown/Mineiro B.ogg"],
      caseSensitive: false,
      isBarulho: true
    }
  ]
};
