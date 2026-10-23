/**
 * 
 * O Girador - Gonguê / Iron Bell Audio Configuration
 */

import { InstrumentAudioConfig } from './types';

export const gongueConfig: InstrumentAudioConfig = {
  id: 'gongue',
  name: 'Gonguê',
  uiOrder: ['G', 'A', 'g', 'a', 'X', 'B'],
  leftHandedSupport: false,
  strokes: [
    {
      symbol: 'G', // Fort Grave (G)
      keys: ['G'],
      files: [
        "Mixdown/Gongue G 1.ogg",
        "Mixdown/Gongue G 2.ogg",
        "Mixdown/Gongue G 3.ogg",
        "Mixdown/Gongue G 4.ogg"
      ],
      caseSensitive: true
    },
    {
      symbol: 'A', // Fort Aigu (A)
      keys: ['A'],
      files: [
        "Mixdown/Gongue A 1.ogg",
        "Mixdown/Gongue A 2.ogg",
        "Mixdown/Gongue A 3.ogg",
        "Mixdown/Gongue A 4.ogg"
      ],
      caseSensitive: true
    },
    {
      symbol: 'g', // Faible Grave (g)
      keys: ['g'],
      files: [
        "Mixdown/Gongue f g 1.ogg",
        "Mixdown/Gongue f g 2.ogg",
        "Mixdown/Gongue f g 3.ogg",
        "Mixdown/Gongue f g 4.ogg"
      ],
      caseSensitive: true
    },
    {
      symbol: 'a', // Faible Aigu (a)
      keys: ['a'],
      files: [
        "Mixdown/Gongue f a 1.ogg",
        "Mixdown/Gongue f a 2.ogg",
        "Mixdown/Gongue f a 3.ogg",
        "Mixdown/Gongue f a 4.ogg"
      ],
      caseSensitive: true
    },
    {
      symbol: 'X', // Cerclage (X/x)
      keys: ['X', 'x'],
      files: [
        "Mixdown/Gongue C 1.ogg",
        "Mixdown/Gongue C 2.ogg"
      ],
      caseSensitive: false
    },
    {
      symbol: 'B', // Barulho (B/b)
      keys: ['B', 'b'],
      files: ["Mixdown/Gongue B.ogg"],
      caseSensitive: false,
      isBarulho: true
    }
  ]
};
