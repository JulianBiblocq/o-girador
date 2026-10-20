/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * O Girador - Agbê Audio Configuration
 */

import { InstrumentAudioConfig } from './types';

export const agbeConfig: InstrumentAudioConfig = {
  id: 'agbe',
  name: 'Agbê',
  uiOrder: ['E', 'D', 'e', 'd', 'S', 'V', 'B'],
  leftHandedSupport: false,
  strokes: [
    {
      symbol: 'E', // Fort Gauche
      keys: ['E'],
      files: [
        "Mixdown/Agbe F E 1.ogg",
        "Mixdown/Agbe F E 2.ogg",
        "Mixdown/Agbe F E 3.ogg",
        "Mixdown/Agbe F E 4.ogg"
      ],
      caseSensitive: true
    },
    {
      symbol: 'D', // Fort Droite
      keys: ['D'],
      files: [
        "Mixdown/Agbe F D 1.ogg",
        "Mixdown/Agbe F D 2.ogg",
        "Mixdown/Agbe F D 3.ogg",
        "Mixdown/Agbe F D 4.ogg"
      ],
      caseSensitive: true
    },
    {
      symbol: 'e', // Faible Gauche
      keys: ['e'],
      files: [
        "Mixdown/Agbe f 1.ogg",
        "Mixdown/Agbe f 2.ogg",
        "Mixdown/Agbe f 3.ogg",
        "Mixdown/Agbe f 4.ogg"
      ],
      caseSensitive: true
    },
    {
      symbol: 'd', // Faible Droite
      keys: ['d'],
      files: [
        "Mixdown/Agbe f 1.ogg",
        "Mixdown/Agbe f 2.ogg",
        "Mixdown/Agbe f 3.ogg",
        "Mixdown/Agbe f 4.ogg"
      ],
      caseSensitive: true
    },
    {
      symbol: 'S', // Salto / Saut (Insensitive)
      keys: ['S', 's'],
      files: [
        "Mixdown/Agbe S 1.ogg",
        "Mixdown/Agbe S 2.ogg"
      ],
      caseSensitive: false
    },
    {
      symbol: 'V', // Volta / Atterrissage (Insensitive)
      keys: ['V', 'v'],
      files: [
        "Mixdown/Agbe A 1.ogg",
        "Mixdown/Agbe A 2.ogg"
      ],
      caseSensitive: false
    },
    {
      symbol: 'B', // Barulho (Insensitive)
      keys: ['B', 'b'],
      files: ["Mixdown/Agbe B.ogg"],
      caseSensitive: false,
      isBarulho: true
    }
  ]
};
