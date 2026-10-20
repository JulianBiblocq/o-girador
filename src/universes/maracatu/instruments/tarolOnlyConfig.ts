/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * O Girador - Tarol Instrument Audio Configuration
 */

import { InstrumentAudioConfig } from './types';

export const tarolConfig: InstrumentAudioConfig = {
  id: 'tarol',
  name: 'Tarol',
  uiOrder: ['D', 'E', 'd', 'e', 'X', 'C', 'B', 'F', 'R', 'r'],
  leftHandedSupport: true,
  strokes: [
    {
      symbol: 'D', // Fort Right
      keys: ['D'],
      files: [
        "Mixdown/Tarol F1.ogg",
        "Mixdown/Tarol F 2.ogg",
        "Mixdown/Tarol F 3.ogg",
        "Mixdown/Tarol F 4.ogg"
      ],
      caseSensitive: true
    },
    {
      symbol: 'E', // Fort Left
      keys: ['E'],
      files: [
        "Mixdown/Tarol F1.ogg",
        "Mixdown/Tarol F 2.ogg",
        "Mixdown/Tarol F 3.ogg",
        "Mixdown/Tarol F 4.ogg"
      ],
      caseSensitive: true
    },
    {
      symbol: 'd', // Faible Right
      keys: ['d'],
      files: [
        "Mixdown/Tarol faible 1.ogg",
        "Mixdown/Tarol faible 2.ogg",
        "Mixdown/Tarol faible 3.ogg",
        "Mixdown/Tarol faible 4.ogg"
      ],
      caseSensitive: true
    },
    {
      symbol: 'e', // Faible Left
      keys: ['e'],
      files: [
        "Mixdown/Tarol faible 1.ogg",
        "Mixdown/Tarol faible 2.ogg",
        "Mixdown/Tarol faible 3.ogg",
        "Mixdown/Tarol faible 4.ogg"
      ],
      caseSensitive: true
    },
    {
      symbol: 'R', // Rufada Right (R)
      keys: ['R'],
      files: [
        "Mixdown/Tarol R 1.ogg",
        "Mixdown/Tarol R 2.ogg"
      ],
      caseSensitive: true
    },
    {
      symbol: 'r', // Rufada Left (r)
      keys: ['r'],
      files: [
        "Mixdown/Tarol R 1.ogg",
        "Mixdown/Tarol R 2.ogg"
      ],
      caseSensitive: true
    },
    {
      symbol: 'F', // Fla (F/f)
      keys: ['F', 'f'],
      files: [
        "Mixdown/Tarol Fla 1.ogg",
        "Mixdown/Tarol Fla 2.ogg"
      ],
      caseSensitive: false
    },
    {
      symbol: 'X', // Aro (X/x)
      keys: ['X', 'x'],
      files: ["Mixdown/Tarol X.ogg"],
      caseSensitive: false
    },
    {
      symbol: 'C', // Click (C/c)
      keys: ['C', 'c'],
      files: [
        "Mixdown/Tarol C 1.ogg",
        "Mixdown/Tarol C 2.ogg"
      ],
      caseSensitive: false
    },
    {
      symbol: 'B', // Barulho (B/b)
      keys: ['B', 'b'],
      files: ["Mixdown/Tarol B.ogg"],
      caseSensitive: false,
      isBarulho: true
    }
  ]
};
