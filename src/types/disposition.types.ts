/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface PlacedInstrumentConfig {
  instrumentType: string;
  x: number; // Position relative en % (0 - 100)
  y: number; // Position relative en % (0 - 100)
}

export type DispositionVisibility = 'private' | 'mestre_group' | 'admin_global' | 'public';

export interface DispositionPreset {
  id: string;
  name: string;
  ownerId: string;
  authorId: string;
  authorName?: string;
  groupId?: string | null;
  visibility: DispositionVisibility;
  instruments: PlacedInstrumentConfig[];
  hasToada?: boolean;
  createdAt: number;
  updatedAt: number;
}
