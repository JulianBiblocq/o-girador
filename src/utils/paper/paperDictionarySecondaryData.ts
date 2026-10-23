/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Données statiques complémentaires du Dictionnaire (Igarassu, Ijexá, Aruanda) (< 100 lignes).
 */
import { DictItem } from '../../types/paperDictionary.types';

export const SECONDARY_DICTIONARY_ITEMS: DictItem[] = [
  // 3. IGARASSU
  {
    id: 'igarassu',
    name: 'Igarassu',
    family: 'igarassu',
    patterns: {
      al: ['D', 0, 0, 'I', 0, 'D', 0, 'I', 'D', 0, 0, 'I', 'D', 0, 0, 0],
      cx: ['D', 'D', 'e', 'D', 'D', 'e', 'D', 'e', 'd', 'D', 'e', 'D', 'D', 'e', 'D', 'e'],
      gg: ['G', 0, 'A', 0, 'G', 0, 'A', 0, 'G', 'G', 0, 'A', 'G', 0, 'A', 0],
      ab: ['E', 0, 'd', 'e', 'D', 0, 'e', 'd', 'E', 0, 'd', 'e', 'D', 0, 'e', 'd'],
    },
    variations: [
      { varIndex: 1, pupitre: 'al', name: 'Al Var 1 Double Coup', steps: ['D', 0, 0, 'I', 0, 'D', 0, 'I', 'D', 'D', 0, 'I', 'D', 0, 0, 0] },
      { varIndex: 2, pupitre: 'al', name: 'Al Var 2 Inversion', steps: ['D', 0, 'I', 0, 'D', 0, 'I', 0, 'D', 0, 0, 'I', 'D', 0, 0, 0] },
      { varIndex: 1, pupitre: 'cx', name: 'Cx Var 1 Syncopée', steps: ['D', 'e', 'D', 'e', 'D', 'e', 'd', 'e', 'D', 'e', 'D', 'e', 'D', 'e', 'd', 'e'] },
    ],
  },
  // 4. IJEXÁ
  {
    id: 'ijexa',
    name: 'Ijexá',
    family: 'ijexa',
    patterns: {
      al: ['D', 0, 0, 'D', 'E', 0, 0, 0, 0, 'D', 0, 'd', 'E', 0, 0, 0],
      cx: ['D', 'D', 'e', 'D', 'D', 'e', 'D', 'e', 'd', 'D', 'e', 'D', 'D', 'e', 'D', 'e'],
      gg: [0, 'G', 0, 0, 'G', 0, 'G', 0, 0, 'G', 0, 0, 0, 0, 'G', 0],
      ab: ['E', 0, 'd', 'e', 'D', 0, 'e', 'd', 'E', 0, 'd', 'e', 'D', 0, 'e', 'd'],
    },
    variations: [
      { varIndex: 1, pupitre: 'al', name: 'Al Var 1 Balance', steps: ['D', 0, 0, 'D', 'E', 0, 'D', 0, 0, 'D', 0, 'd', 'E', 0, 0, 0] },
      { varIndex: 2, pupitre: 'al', name: 'Al Var 2 Doubles', steps: ['D', 0, 'd', 'D', 'E', 0, 0, 0, 0, 'D', 0, 'd', 'E', 0, 0, 0] },
    ],
  },
  // 5. ARUANDA
  {
    id: 'aruanda_1',
    name: 'Aruanda 1er',
    family: 'aruanda',
    patterns: {
      al: ['D', 0, 0, 'D', 0, 'D', 0, 'D', 0, 0, 'D', 0, 0, 'D', 0, 0],
      cx: ['D', 'e', 'D', 'e', 'D', 'e', 'd', 'e', 'D', 'e', 'D', 'e', 'D', 'e', 'd', 'e'],
      gg: ['G', 0, 'A', 0, 'G', 0, 'A', 0, 'G', 0, 'A', 0, 'G', 0, 'A', 0],
    },
    variations: [
      { varIndex: 1, pupitre: 'al', name: 'Al Var 1 Sautée', steps: ['D', 0, 0, 'D', 0, 'D', 0, 0, 'D', 0, 'D', 0, 0, 'D', 0, 0] },
      { varIndex: 2, pupitre: 'al', name: 'Al Var 2 Contretemps', steps: [0, 'D', 0, 'D', 0, 'D', 0, 'D', 0, 0, 'D', 0, 0, 'D', 0, 0] },
    ],
  },
];
