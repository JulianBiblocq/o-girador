/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * O Girador - Caixa Instrument Audio Configuration
 */

import { InstrumentAudioConfig } from './types';

export const caixaConfig: InstrumentAudioConfig = {
  id: 'caixa',
  name: 'Caixa',
  uiOrder: ['D', 'E', 'd', 'e', 'X', 'C', 'B', 'F', 'R', 'r'],
  leftHandedSupport: true,
  strokes: [
    {
      symbol: 'D', // Fort Right
      keys: ['D'],
      files: [
        "Mixdown/Caixa F 1.ogg",
        "Mixdown/Caixa F 2.ogg",
        "Mixdown/Caixa F 3.ogg",
        "Mixdown/Caixa F 4.ogg"
      ],
      caseSensitive: true
    },
    {
      symbol: 'E', // Fort Left
      keys: ['E'],
      files: [
        "Mixdown/Caixa F 1.ogg",
        "Mixdown/Caixa F 2.ogg",
        "Mixdown/Caixa F 3.ogg",
        "Mixdown/Caixa F 4.ogg"
      ],
      caseSensitive: true
    },
    {
      symbol: 'd', // Faible Right
      keys: ['d'],
      files: [
        "Mixdown/Caixa faible 1.ogg",
        "Mixdown/Caixa faible 2.ogg",
        "Mixdown/Caixa faible 3.ogg",
        "Mixdown/Caixa faible 4.ogg"
      ],
      caseSensitive: true
    },
    {
      symbol: 'e', // Faible Left
      keys: ['e'],
      files: [
        "Mixdown/Caixa faible 1.ogg",
        "Mixdown/Caixa faible 2.ogg",
        "Mixdown/Caixa faible 3.ogg",
        "Mixdown/Caixa faible 4.ogg"
      ],
      caseSensitive: true
    },
    {
      symbol: 'R', // Rufada Right (R)
      keys: ['R'],
      files: [
        "Mixdown/Caixa R 1.ogg",
        "Mixdown/Caixa R 2.ogg"
      ],
      caseSensitive: true
    },
    {
      symbol: 'r', // Rufada Left (r)
      keys: ['r'],
      files: [
        "Mixdown/Caixa R 1.ogg",
        "Mixdown/Caixa R 2.ogg"
      ],
      caseSensitive: true
    },
    {
      symbol: 'F', // Fla (F/f)
      keys: ['F', 'f'],
      files: [
        "Mixdown/Caixa Fla 1.ogg",
        "Mixdown/Caixa Fla 2.ogg"
      ],
      caseSensitive: false
    },
    {
      symbol: 'X', // Aro (X/x)
      keys: ['X', 'x'],
      files: ["Mixdown/Caixa X.ogg"],
      caseSensitive: false
    },
    {
      symbol: 'C', // Click / Baguettes
      keys: ['C', 'c'],
      files: [
        "Mixdown/Caixa C 1.ogg",
        "Mixdown/Caixa C 2.ogg"
      ],
      caseSensitive: false
    },
    {
      symbol: 'B', // Barulho (B/b)
      keys: ['B', 'b'],
      files: ["Mixdown/Caixa B.ogg"],
      caseSensitive: false,
      isBarulho: true
    }
  ]
};
