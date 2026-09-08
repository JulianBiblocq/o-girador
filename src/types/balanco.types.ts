/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface BalancoPreset {
  id: string;
  name: string;
  ownerId: string;
  groupId?: string | null;
  authorName?: string;
  visibility: 'private' | 'mestre_group' | 'admin_global' | 'public';
  packId?: string | null;
  division: 16 | 32;
  offsets: number[]; // Ratios de décalage par pas (ex: [0, 8, -29, -58] pour Maracatu 16 pas)
  isFactory?: boolean;
  createdAt?: number;
  updatedAt?: number;
}
