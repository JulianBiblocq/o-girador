/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Données statiques des 5 familles rythmiques du Dictionnaire (< 140 lignes).
 */
import { PaperStepValue } from '../../types/paperWorkshop.types';

export interface DictVariation {
  varIndex: number;
  pupitre: string;
  name: string;
  steps: PaperStepValue[];
}

export interface DictItem {
  id: string;
  name: string;
  family: 'bases_paradas' | 'luanda' | 'igarassu' | 'ijexa' | 'aruanda';
  description?: string;
  patterns: Record<string, PaperStepValue[]>;
  variations?: DictVariation[];
}

export const DICTIONARY_ITEMS: DictItem[] = [
  // 1. BASES & PARADAS
  {
    id: 'base_alfaia',
    name: 'Alfaia Base (Standard)',
    family: 'bases_paradas',
    patterns: { al: ['D', 0, 0, 0, 0, 0, 0, 0, 'e', 'D', 0, 0, 'e', 'D', 0, 0] },
    variations: [
      { varIndex: 1, pupitre: 'al', name: 'Al Double Retour', steps: ['D', 0, 0, 0, 'e', 'D', 0, 0, 'e', 'D', 0, 0, 'e', 'D', 0, 0] },
      { varIndex: 2, pupitre: 'al', name: 'Al Salto', steps: ['D', 0, 0, 'D', 0, 0, 'D', 0, 'e', 'D', 0, 0, 'e', 'D', 0, 0] },
    ]
  },
  {
    id: 'base_caixa',
    name: 'Caixa Base (Maracatu)',
    family: 'bases_paradas',
    patterns: { cx: ['D', 'D', 'e', 'D', 'D', 'e', 'D', 'e', 'd', 'D', 'e', 'D', 'D', 'e', 'D', 'e'] },
    variations: [
      { varIndex: 1, pupitre: 'cx', name: 'Cx Rouffade', steps: ['D', 'D', 'e', 'D', 'D', 'e', 'D', 'e', 'R', 'D', 'e', 'D', 'D', 'e', 'D', 'e'] },
      { varIndex: 2, pupitre: 'cx', name: 'Cx Flam', steps: ['F', 'D', 'e', 'D', 'D', 'e', 'D', 'e', 'd', 'D', 'e', 'D', 'D', 'e', 'd', 'E'] }
    ]
  },
  {
    id: 'base_gongue',
    name: 'Gonguê Base (Aberto / Fechado)',
    family: 'bases_paradas',
    patterns: { gg: ['G', 0, 'A', 0, 'G', 0, 'A', 0, 'G', 'A', 0, 'A', 'G', 0, 'A', 0] }
  },
  {
    id: 'base_agbe',
    name: 'Agbê / Abê Base',
    family: 'bases_paradas',
    patterns: { ab: ['E', 0, 'd', 'e', 'D', 0, 'e', 'd', 'E', 0, 'd', 'e', 'D', 0, 'e', 'd'] }
  },
  {
    id: 'base_mineiro',
    name: 'Mineiro Base (Pousser/Tirer)',
    family: 'bases_paradas',
    patterns: { mi: ['P', 0, 'T', 0, 'P', 0, 'T', 0, 'P', 0, 'T', 0, 'P', 0, 'T', 0] }
  },
  {
    id: 'parada_1',
    name: 'Parada 1 (Coupure Standard)',
    family: 'bases_paradas',
    patterns: {
      al: ['D', 0, 'D', 0, 'D', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      cx: ['D', 0, 'D', 0, 'D', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      gg: ['G', 0, 'G', 0, 'G', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      ab: ['E', 0, 'D', 0, 'E', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    }
  },
  {
    id: 'par_2',
    name: 'PAR 2 (Appel Double Coup)',
    family: 'bases_paradas',
    patterns: {
      al: ['D', 'D', 0, 0, 'D', 'D', 0, 0, 'D', 0, 'D', 0, 'D', 0, 0, 0],
      cx: ['D', 'D', 0, 0, 'D', 'D', 0, 0, 'D', 0, 'D', 0, 'D', 0, 0, 0],
      gg: ['G', 'G', 0, 0, 'G', 'G', 0, 0, 'G', 0, 'G', 0, 'G', 0, 0, 0],
      ab: ['E', 'D', 0, 0, 'E', 'D', 0, 0, 'E', 0, 'D', 0, 'E', 0, 0, 0]
    }
  },
  {
    id: 'tremer_1',
    name: 'Tremer 1 (Roulement)',
    family: 'bases_paradas',
    patterns: {
      al: ['B', 'B', 'B', 'B', 'B', 'B', 'B', 'B', 'D', 0, 'D', 0, 'D', 0, 0, 0],
      cx: ['R', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'D', 0, 'D', 0, 'D', 0, 0, 0],
      gg: ['G', 'G', 'G', 'G', 'G', 'G', 'G', 'G', 'G', 0, 'G', 0, 'G', 0, 0, 0],
      ab: ['S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'E', 0, 'D', 0, 'E', 0, 0, 0]
    }
  },
  // 2. LUANDA
  {
    id: 'luanda_partie_a',
    name: 'Luanda Partie A',
    family: 'luanda',
    patterns: {
      al: [0, 'D', 0, 'd', 'E', 0, 'D', 0, 0, 'D', 0, 'd', 'E', 0, 0, 'D'],
      cx: ['D', 'D', 'e', 'D', 'D', 'e', 'D', 'e', 'd', 'D', 'e', 'D', 'D', 'e', 'd', 'E'],
      gg: [0, 'G', 0, 0, 'G', 0, 'G', 0, 0, 'G', 0, 0, 'G', 0, 0, 'G'],
      ab: ['E', 0, 'd', 'e', 'D', 0, 'e', 'd', 'E', 0, 'd', 'e', 'D', 0, 0, 'E']
    },
    variations: [
      { varIndex: 1, pupitre: 'al', name: 'Al Var 1 Double Retour', steps: ['D', 0, 0, 0, 'e', 'D', 0, 0, 'e', 'D', 0, 0, 'e', 'D', 0, 0] },
      { varIndex: 2, pupitre: 'al', name: 'Al Var 2 Salto', steps: ['D', 0, 0, 'D', 0, 0, 'D', 0, 'e', 'D', 0, 0, 'e', 'D', 0, 0] },
      { varIndex: 3, pupitre: 'al', name: 'Al Var 3 Martelo Sync', steps: ['D', 0, 0, 'D', 0, 'D', 0, 'D', 0, 0, 'D', 0, 0, 'D', 0, 0] },
      { varIndex: 4, pupitre: 'al', name: 'Al Var 4 Barulho', steps: ['D', 'B', 0, 'B', 'D', 'B', 0, 0, 'e', 'D', 0, 0, 'e', 'D', 0, 0] },
      { varIndex: 5, pupitre: 'al', name: 'Al Var 5 Bacalhau', steps: ['D', 0, 0, 'I', 0, 'D', 0, 'I', 'e', 'D', 0, 0, 'e', 'D', 0, 0] },
      { varIndex: 1, pupitre: 'cx', name: 'Cx Var 1 Roulement', steps: ['D', 'D', 'e', 'D', 'D', 'e', 'D', 'e', 'R', 'D', 'e', 'D', 'D', 'e', 'D', 'e'] },
      { varIndex: 2, pupitre: 'cx', name: 'Cx Var 2 Flam Final', steps: ['D', 'D', 'e', 'D', 'D', 'e', 'D', 'e', 'd', 'D', 'e', 'D', 'D', 'e', 'F', 0] }
    ]
  },
  {
    id: 'luanda_partie_a_suite',
    name: 'Luanda Partie A suite',
    family: 'luanda',
    patterns: {
      al: ['D', 0, 0, 0, 'D', 0, 0, 0, 0, 'D', 0, 'd', 'E', 0, 0, 0],
      cx: [0, 0, 'F', 0, 0, 0, 'F', 0, 0, 0, 0, 0, 0, 0, 'F', 0],
      gg: ['G', 0, 0, 0, 'G', 0, 0, 0, 0, 'G', 0, 'G', 'G', 0, 0, 0],
      ab: ['D', 0, 0, 0, 'E', 0, 0, 0, 0, 'D', 0, 'E', 'D', 0, 0, 0]
    }
  },
  {
    id: 'luanda_pr',
    name: 'Luanda PR (Pont Relance)',
    family: 'luanda',
    patterns: {
      al: ['D', 0, 0, 'D', 0, 'D', 0, 0, 'e', 'D', 0, 0, 'e', 'D', 0, 'D'],
      cx: ['D', 'e', 'D', 'e', 'D', 'e', 'D', 'e', 'D', 'e', 'D', 'e', 'D', 'e', 'D', 'e'],
      gg: ['G', 0, 'A', 0, 'G', 0, 'A', 0, 'G', 'A', 0, 'A', 'G', 0, 'A', 0]
    }
  },
  // 3. IGARASSU
  {
    id: 'igarassu',
    name: 'Igarassu',
    family: 'igarassu',
    patterns: {
      al: ['D', 0, 0, 'I', 0, 'D', 0, 'I', 'D', 0, 0, 'I', 'D', 0, 0, 0],
      cx: ['D', 'D', 'e', 'D', 'D', 'e', 'D', 'e', 'd', 'D', 'e', 'D', 'D', 'e', 'D', 'e'],
      gg: ['G', 0, 'A', 0, 'G', 0, 'A', 0, 'G', 'G', 0, 'A', 'G', 0, 'A', 0],
      ab: ['E', 0, 'd', 'e', 'D', 0, 'e', 'd', 'E', 0, 'd', 'e', 'D', 0, 'e', 'd']
    },
    variations: [
      { varIndex: 1, pupitre: 'al', name: 'Al Var 1 Double Coup', steps: ['D', 0, 0, 'I', 0, 'D', 0, 'I', 'D', 'D', 0, 'I', 'D', 0, 0, 0] },
      { varIndex: 2, pupitre: 'al', name: 'Al Var 2 Inversion', steps: ['D', 0, 'I', 0, 'D', 0, 'I', 0, 'D', 0, 0, 'I', 'D', 0, 0, 0] },
      { varIndex: 1, pupitre: 'cx', name: 'Cx Var 1 Syncopée', steps: ['D', 'e', 'D', 'e', 'D', 'e', 'd', 'e', 'D', 'e', 'D', 'e', 'D', 'e', 'd', 'e'] }
    ]
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
      ab: ['E', 0, 'd', 'e', 'D', 0, 'e', 'd', 'E', 0, 'd', 'e', 'D', 0, 'e', 'd']
    },
    variations: [
      { varIndex: 1, pupitre: 'al', name: 'Al Var 1 Balance', steps: ['D', 0, 0, 'D', 'E', 0, 'D', 0, 0, 'D', 0, 'd', 'E', 0, 0, 0] },
      { varIndex: 2, pupitre: 'al', name: 'Al Var 2 Doubles', steps: ['D', 0, 'd', 'D', 'E', 0, 0, 0, 0, 'D', 0, 'd', 'E', 0, 0, 0] }
    ]
  },
  // 5. ARUANDA
  {
    id: 'aruanda_1',
    name: 'Aruanda 1er',
    family: 'aruanda',
    patterns: {
      al: ['D', 0, 0, 'D', 0, 'D', 0, 'D', 0, 0, 'D', 0, 0, 'D', 0, 0],
      cx: ['D', 'e', 'D', 'e', 'D', 'e', 'd', 'e', 'D', 'e', 'D', 'e', 'D', 'e', 'd', 'e'],
      gg: ['G', 0, 'A', 0, 'G', 0, 'A', 0, 'G', 0, 'A', 0, 'G', 0, 'A', 0]
    },
    variations: [
      { varIndex: 1, pupitre: 'al', name: 'Al Var 1 Sautée', steps: ['D', 0, 0, 'D', 0, 'D', 0, 0, 'D', 0, 'D', 0, 0, 'D', 0, 0] },
      { varIndex: 2, pupitre: 'al', name: 'Al Var 2 Contretemps', steps: [0, 'D', 0, 'D', 0, 'D', 0, 'D', 0, 0, 'D', 0, 0, 'D', 0, 0] }
    ]
  }
];
