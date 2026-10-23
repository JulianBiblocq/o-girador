/**
 * 
 * O Girador - Timbal Secondary Stroke Mappings (P, F, V, C, B)
 */

import { StrokeMapping } from './types';

export const timbalSecondaryStrokes: StrokeMapping[] = [
  {
    symbol: 'P', // Fermé Forte (Main Forte)
    keys: ['P'],
    files: [
      "Mixdown/Timbal P 1.ogg",
      "Mixdown/Timbal P 2.ogg",
      "Mixdown/Timbal P 3.ogg",
      "Mixdown/Timbal P 4.ogg"
    ],
    caseSensitive: true
  },
  {
    symbol: 'p', // Fermé Faible (Main Faible)
    keys: ['p'],
    files: [
      "Mixdown/Timbal P 1.ogg",
      "Mixdown/Timbal P 2.ogg",
      "Mixdown/Timbal P 3.ogg",
      "Mixdown/Timbal P 4.ogg"
    ],
    caseSensitive: true
  },
  {
    symbol: 'F', // Fla ouvert (Deux mains)
    keys: ['F', 'f'],
    files: [
      "Mixdown/Timbal F 1.ogg",
      "Mixdown/Timbal F 2.ogg",
      "Mixdown/Timbal F 3.ogg",
      "Mixdown/Timbal F 4.ogg"
    ],
    caseSensitive: false
  },
  {
    symbol: 'V', // Fla slap (Deux mains)
    keys: ['V', 'v'],
    files: [
      "Mixdown/Timbal V 1.ogg",
      "Mixdown/Timbal V 2.ogg",
      "Mixdown/Timbal V 3.ogg",
      "Mixdown/Timbal V 4.ogg"
    ],
    caseSensitive: false
  },
  {
    symbol: 'C', // Clap (Deux mains)
    keys: ['C', 'c'],
    files: [
      "Mixdown/Timbal C 1.ogg",
      "Mixdown/Timbal C 2.ogg"
    ],
    caseSensitive: false
  },
  {
    symbol: 'B', // Barulho (Fatras)
    keys: ['B', 'b'],
    files: ["Mixdown/Timbal B.ogg"],
    caseSensitive: false,
    isBarulho: true
  }
];
