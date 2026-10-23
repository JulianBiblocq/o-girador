/**
 * 
 * O Girador - Alfaia Audio Configuration (Marcante, Meião, Repique)
 */

import { InstrumentAudioConfig, StrokeMapping } from './types';

export function getAlfaiaStrokes(): StrokeMapping[] {
  return [
    {
      symbol: 'D', // Fort Right
      keys: ['D'],
      files: [
        "Mixdown/Alfaia meiao F 1.ogg",
        "Mixdown/Alfaia meiao F 2.ogg",
        "Mixdown/Alfaia meiao F 3.ogg",
        "Mixdown/Alfaia meiao F 4.ogg",
        "Mixdown/Alfaia meiao F 5.ogg",
        "Mixdown/Alfaia meiao F 6.ogg"
      ],
      caseSensitive: true
    },
    {
      symbol: 'E', // Fort Left
      keys: ['E'],
      files: [
        "Mixdown/Alfaia meiao F 1.ogg",
        "Mixdown/Alfaia meiao F 2.ogg",
        "Mixdown/Alfaia meiao F 3.ogg",
        "Mixdown/Alfaia meiao F 4.ogg",
        "Mixdown/Alfaia meiao F 5.ogg",
        "Mixdown/Alfaia meiao F 6.ogg"
      ],
      caseSensitive: true
    },
    {
      symbol: 'd', // Faible Right
      keys: ['d'],
      files: [
        "Mixdown/Alfaia meiao faible 1.ogg",
        "Mixdown/Alfaia meiao faible 2.ogg",
        "Mixdown/Alfaia meiao faible 3.ogg",
        "Mixdown/Alfaia meiao faible 4.ogg"
      ],
      caseSensitive: true
    },
    {
      symbol: 'e', // Faible Left
      keys: ['e'],
      files: [
        "Mixdown/Alfaia meiao faible 1.ogg",
        "Mixdown/Alfaia meiao faible 2.ogg",
        "Mixdown/Alfaia meiao faible 3.ogg",
        "Mixdown/Alfaia meiao faible 4.ogg"
      ],
      caseSensitive: true
    },
    {
      symbol: 'X', // Aro (X/x)
      keys: ['X', 'x'],
      files: [
        "Mixdown/Alfaia meiao X 1.ogg",
        "Mixdown/Alfaia meiao X 2.ogg"
      ],
      caseSensitive: false
    },
    {
      symbol: 'C', // Click / Aro (Insensitive)
      keys: ['C', 'c'],
      files: [
        "Mixdown/Alfaia meiao C 1.ogg",
        "Mixdown/Alfaia meiao C 2.ogg"
      ],
      caseSensitive: false
    },
    {
      symbol: 'I', // Bacalhau (I/i)
      keys: ['I', 'i'],
      files: [
        "Mixdown/Alfaia meiao I 1.ogg",
        "Mixdown/Alfaia meiao I 2.ogg"
      ],
      caseSensitive: false
    },
    {
      symbol: 'B', // Barulho (B/b)
      keys: ['B', 'b'],
      files: ["Mixdown/Alfaia meiao B.ogg"],
      caseSensitive: false,
      isBarulho: true
    }
  ];
}

export const marcanteConfig: InstrumentAudioConfig = {
  id: 'marcante',
  name: 'Marcante (alfaia)',
  uiOrder: ['D', 'E', 'd', 'e', 'X', 'C', 'B', 'I'],
  leftHandedSupport: true,
  macroPitch: Math.pow(2, -3 / 12), // -3 semitones
  strokes: getAlfaiaStrokes()
};

export const meiaoConfig: InstrumentAudioConfig = {
  id: 'meiao',
  name: 'Meião (alfaia)',
  uiOrder: ['D', 'E', 'd', 'e', 'X', 'C', 'B', 'I'],
  leftHandedSupport: true,
  macroPitch: 1.0, // 0 semitones
  strokes: getAlfaiaStrokes()
};

export const repiqueConfig: InstrumentAudioConfig = {
  id: 'repique',
  name: 'Repique (alfaia)',
  uiOrder: ['D', 'E', 'd', 'e', 'X', 'C', 'B', 'I'],
  leftHandedSupport: true,
  macroPitch: Math.pow(2, 4 / 12), // +4 semitones
  strokes: getAlfaiaStrokes()
};
