/**
 * Point d'accès unifié aux Presets authentiques du Mestre (< 50 lignes).
 */
import { PaperPreset } from '../../types/paperWorkshop.types';
import { PRESET_CONVENCAO_1, PRESET_DE_NORTE_A_SUL } from './paperPresetsPart1';
import { PRESET_TEM_MACAIBA, PRESET_ARUANDA, PRESET_ETUDE_CAIXA } from './paperPresetsPart2';
import { PRESET_BASES_TRADITIONNELLES } from './paperPresetsPart3';
import { PRESET_PORTO_RICO } from '../paperPresetPortoRico';

export { PRESET_CONVENCAO_1, PRESET_DE_NORTE_A_SUL } from './paperPresetsPart1';
export { PRESET_TEM_MACAIBA, PRESET_ARUANDA, PRESET_ETUDE_CAIXA } from './paperPresetsPart2';
export { PRESET_BASES_TRADITIONNELLES } from './paperPresetsPart3';
export { PRESET_PORTO_RICO } from '../paperPresetPortoRico';

export const ALL_PAPER_PRESETS: PaperPreset[] = [
  PRESET_CONVENCAO_1,
  PRESET_DE_NORTE_A_SUL,
  PRESET_TEM_MACAIBA,
  PRESET_ARUANDA,
  PRESET_ETUDE_CAIXA,
  PRESET_BASES_TRADITIONNELLES,
  PRESET_PORTO_RICO,
];

export const getPaperPresetById = (id: string): PaperPreset | undefined => {
  return ALL_PAPER_PRESETS.find((p) => p.id === id);
};
