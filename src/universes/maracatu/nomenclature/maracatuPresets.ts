/**
 * 
 * O-Girador - Maracatu Cultural Nomenclature Presets
 */

import { NomenclaturePreset } from '../../../types/nomenclature.types';

export const PRESET_NOMENCLATURES: NomenclaturePreset[] = [
  {
    id: 'traditional_baque_virado',
    name: 'Baque Virado Traditionnel',
    description: 'Nomenclature standard de Recife (Marcante, Meião, Repique, Caixa, Tarol)',
    style: 'maracatu',
    mapping: {
      alfaia_grave: 'Marcante',
      alfaia_medio: 'Meião',
      alfaia_agudo: 'Repique',
      caixa_baixo: 'Caixa',
      caixa_alto: 'Tarol',
    },
  },
  {
    id: 'candomble_ketu',
    name: 'Tradition Candomblé / Tambores',
    description: 'Nomenclature rituelle des tambours (Rum, Rumpi, Lé)',
    style: 'maracatu',
    mapping: {
      alfaia_grave: 'Rum',
      alfaia_medio: 'Rumpi',
      alfaia_agudo: 'Lé',
      caixa_baixo: 'Caixa',
      caixa_alto: 'Tarol',
      gongue: 'Agogô',
    },
  },
  {
    id: 'universal_function',
    name: 'Organologique & Fonctionnel',
    description: 'Désignation par registre sonore (Grave, Médium, Aigu)',
    style: 'maracatu',
    mapping: {
      alfaia_grave: 'Alfaia Grave',
      alfaia_medio: 'Alfaia Médium',
      alfaia_agudo: 'Alfaia Aiguë',
      caixa_baixo: 'Caisse Basse',
      caixa_alto: 'Caisse Haute',
    },
  },
];
