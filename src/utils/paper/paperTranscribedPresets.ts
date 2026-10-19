/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Point d'accès unifié aux 4 Presets authentiques du Mestre (< 50 lignes).
 */
import { PaperPreset } from '../../types/paperWorkshop.types';
import { PRESET_CONVENCAO_1, PRESET_DE_NORTE_A_SUL } from './paperPresetsPart1';
import { PRESET_TEM_MACAIBA, PRESET_ARUANDA } from './paperPresetsPart2';

export { PRESET_CONVENCAO_1, PRESET_DE_NORTE_A_SUL } from './paperPresetsPart1';
export { PRESET_TEM_MACAIBA, PRESET_ARUANDA } from './paperPresetsPart2';

export const ALL_PAPER_PRESETS: PaperPreset[] = [
  PRESET_CONVENCAO_1,
  PRESET_DE_NORTE_A_SUL,
  PRESET_TEM_MACAIBA,
  PRESET_ARUANDA,
];

export const getPaperPresetById = (id: string): PaperPreset | undefined => {
  return ALL_PAPER_PRESETS.find((p) => p.id === id);
};
