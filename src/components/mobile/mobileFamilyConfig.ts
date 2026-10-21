/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface MobileFamilyDef {
  id: 'alfaias' | 'caixas' | 'timbal' | 'gongue' | 'agbe' | 'toada';
  label: string;
  instrumentIds: string[];
  isToada?: boolean;
}

export const MOBILE_FAMILIES: MobileFamilyDef[] = [
  { id: 'alfaias', label: 'ALFAIAS', instrumentIds: ['marcante', 'meiao', 'repique'] },
  { id: 'caixas', label: 'CAIXAS', instrumentIds: ['caixa', 'tarol'] },
  { id: 'timbal', label: 'TIMBAL', instrumentIds: ['timbal'] },
  { id: 'gongue', label: 'GONGUÊ', instrumentIds: ['gongue'] },
  { id: 'agbe', label: 'AGBÊ', instrumentIds: ['agbe', 'mineiro'] },
  { id: 'toada', label: 'TOADA', instrumentIds: ['puxador', 'coro'], isToada: true },
];

export type MuteGroupId = 1 | 2 | 3 | 4;

export const ALL_MUTE_GROUP_IDS: MuteGroupId[] = [1, 2, 3, 4];
