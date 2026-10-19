/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Presets historiques Mestre - Partie 1 (< 140 lignes).
 */
import { PaperPreset } from '../../types/paperWorkshop.types';
import { expandSequenceString } from './paperScoreEngine';

const S0 = Array(16).fill(0);

export const PRESET_CONVENCAO_1: PaperPreset = {
  id: 'convencao_1',
  name: 'Convenção 1 (Estrela Brilhante)',
  bpm: 96,
  timeSig: '4/4',
  totalMeasures: 18,
  linkedAlfaias: true,
  pupitres: ['al', 'cx', 'gg', 'ab'],
  patterns: {
    'Luanda': {
      al: ['D',0,0,0, 0,0,0,0, 'e','D',0,0, 'e','D',0,0],
      cx: ['D','D','e','D', 'D','e','D','e', 'd','D','e','D', 'D','e','D','e'],
      gg: ['G',0,'A',0, 'G',0,'A',0, 'G','A',0,'A', 'G',0,'A',0],
      ab: ['E',0,'d','e', 'D',0,'e','d', 'E',0,'d','e', 'D',0,'e','d'],
    },
    'Partie A_M1': {
      al: [0,'D',0,'d', 'E',0,'D',0, 0,'D',0,'d', 'E',0,0,'D'],
      cx: ['D','D','e','D', 'D','e','D','e', 'd','D','e','D', 'D','e','d','E'],
      gg: [0,'G',0,0, 'G',0,'G',0, 0,'G',0,0, 'G',0,0,'G'],
      ab: ['E',0,'d','e', 'D',0,'e','d', 'E',0,'d','e', 'D',0,0,'E'],
    },
    'Partie A_M2': {
      al: ['E',0,0,'D', 'E',0,0,0, 0,'D',0,'d', 'E',0,0,0],
      cx: ['D','e','d','E', 'D','e','D','e', 'd','D','e','D', 'D','e','D','e'],
      gg: ['G',0,0,'G', 'G',0,0,0, 0,'G',0,'G', 'G',0,0,0],
      ab: ['D',0,0,'E', 'D',0,0,0, 0,'E',0,'D', 'E',0,0,0],
    },
    'Partie A suite': {
      al: ['D',0,0,0, 'D',0,0,0, 0,'D',0,'d', 'E',0,0,0],
      cx: [0,0,'F',0, 0,0,'F',0, 0,0,0,0, 0,0,'F',0],
      gg: ['G',0,0,0, 'G',0,0,0, 0,'G',0,'G', 'G',0,0,0],
      ab: ['D',0,0,0, 'E',0,0,0, 0,'D',0,'E', 'D',0,0,0],
    },
    'Ijexa': {
      al: ['D',0,0,'D', 'E',0,0,0, 0,'D',0,'d', 'E',0,0,0],
      cx: ['D','D','e','D', 'D','e','D','e', 'd','D','e','D', 'D','e','D','e'],
      gg: [0,'G',0,0, 'G',0,'G',0, 0,'G',0,0, 0,0,'G',0],
      ab: ['E',0,'d','e', 'D',0,'e','d', 'E',0,'d','e', 'D',0,'e','d'],
    },
    'Ijexa TR_M1': {
      al: ['D',0,0,'D', 'E',0,0,0, 0,'D',0,'d', 'E','D','E','D'],
      cx: ['D','D','e','D', 'D','e','D','e', 'd','D','e','D', 'D','E','D','E'],
      gg: [0,'G',0,0, 'G',0,'G',0, 0,'G',0,'G', 'G','G','G','G'],
      ab: ['E',0,'d','e', 'D',0,'e','d', 'E',0,'d','e', 'D','E','D','E'],
    },
    'Ijexa TR_M2': {
      al: [0,'D','E','D', 'E',0,'D','E', 'D','E',0,0, 0,0,0,0],
      cx: [0,'D','E','D', 'E',0,'D','E', 'D','E',0,'F', 0,0,0,0],
      gg: [0,'G','G','G', 'G',0,'G','G', 'G','G',0,0, 0,0,0,0],
      ab: [0,'E','D','E', 'D',0,'E','D', 'E','D',0,0, 0,0,0,0],
    },
  },
  sequenceString: 'Luanda x4 | Partie A_M1 | Partie A_M2 | Partie A suite | Ijexa | Ijexa TR_M1 | Ijexa TR_M2 | Ijexa | Partie A_M1 | Partie A_M2 | Partie A suite | Luanda x4',
  defaultSequence: ['Luanda','Luanda','Luanda','Luanda', 'Partie A_M1','Partie A_M2','Partie A suite', 'Ijexa', 'Ijexa TR_M1','Ijexa TR_M2', 'Ijexa', 'Partie A_M1','Partie A_M2','Partie A suite', 'Luanda','Luanda','Luanda','Luanda'],
};

const deNorteSeqStr = 'Silence | Intro x8 | Pause | ||: Trouxe | Parada | Pause | Luanda x3 | Trovao | Luanda x3 | Trovao | Martelo x7 | Fim Martelo | Pause :|| x2';

export const PRESET_DE_NORTE_A_SUL: PaperPreset = {
  id: 'de_norte_a_sul',
  name: 'De norte a sul',
  bpm: 92,
  timeSig: '4/4',
  totalMeasures: 50,
  linkedAlfaias: true,
  pupitres: ['al', 'cx', 'gg', 'ab'],
  patterns: {
    'Silence': { al: S0, cx: S0, gg: S0, ab: S0 },
    'Intro': {
      al: ['C',0,0,0, 'C',0,0,0, 'C',0,0,0, 'C',0,0,0],
      cx: ['C',0,0,0, 'C',0,0,0, 'C',0,0,0, 'C',0,0,0],
      gg: S0, ab: S0,
    },
    'Trouxe': {
      al: S0,
      cx: ['D','D','e','D', 'D','e','D','e', 'd','D','e','D', 'D','e','R','e'],
      gg: ['G',0,'A',0, 'G',0,'A',0, 'G','A',0,'A', 'G',0,'A',0],
      ab: S0,
    },
    'Parada': {
      al: ['D',0,0,'D', 'e','D',0,'d', 'e','D',0,'d', 'e',0,'D','E'],
      cx: ['D','D','e','D', 'D','D','e','D', 'D','D','e','D', 'D','e','D','e'],
      gg: ['G',0,0,'A', 'G','A',0,'A', 'G','A',0,'A', 'G',0,'A','A'],
      ab: ['E',0,'d','e', 'D',0,'e','d', 'E',0,'d','e', 'D',0,'e','d'],
    },
    'Pause': {
      al: ['D',0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
      cx: ['D',0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
      gg: ['G',0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
      ab: ['E',0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
    },
    'Luanda': PRESET_CONVENCAO_1.patterns['Luanda'],
    'Trovao': {
      al: ['e',0,'D',0, 'e',0,'D',0, 'e','D',0,'d', 'e',0,'D',0],
      cx: ['d','e','D','e', 'd','e','D','e', 'd','D','e','D', 'D','e','R','e'],
      gg: [0,0,'A',0, 'G',0,'A',0, 'G','A',0,'A', 'G',0,'A',0],
      ab: ['E',0,'d','e', 'D',0,'e','d', 'E',0,'d','e', 'D',0,'e','d'],
    },
    'Martelo': {
      al: ['e','D',0,'d', 'E',0,'D',0, 'e','D',0,'d', 'E',0,0,0],
      cx: ['D','D','e','D', 'D','e','D','e', 'd','D','e','D', 'D','e','R','e'],
      gg: [0,'G',0,0, 'G',0,'G',0, 0,'G',0,0, 'G',0,'G',0],
      ab: ['E',0,'d','e', 'D',0,'e','d', 'E',0,'d','e', 'D',0,'e','d'],
    },
    'Fim Martelo': {
      al: ['e','D',0,'d', 'E',0,'D',0, 'e','D',0,'d', 'E',0,'D',0],
      cx: ['D','D','e','D', 'D','e','D','e', 'D','D','e','D', 'D',0,'E',0],
      gg: [0,'G',0,0, 'G',0,'G',0, 0,'G',0,0, 'G',0,'G',0],
      ab: ['E',0,'d','e', 'D',0,'e','d', 'E',0,'d','e', 'E',0,'D',0],
    },
  },
  sequenceString: deNorteSeqStr,
  defaultSequence: expandSequenceString(deNorteSeqStr),
};
