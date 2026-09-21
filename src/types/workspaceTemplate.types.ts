/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { MasterFX } from './store.types';

export interface WorkspaceTemplateOptions {
  includeStructure: boolean;    // Estrutura do batuque & Bus (links mestre/escravos, subgrupos)
  includeDisplayOrder: boolean; // Ordem da mesa de mixagem & rodaTrackOrder
  includeVolumePan: boolean;    // Níveis de volume & Panoramas
  includeEQ: boolean;           // Equalizações (bandas EQ / filtros Low-Cut, Master EQ)
  includeFX: boolean;           // Envios e retornos de efeitos (Reverb / Distorção, Master FX Rack)
}

export interface WorkspaceTemplateTrack {
  id: number;
  instrumentIdx: number;
  customName?: string;
  isBusFolder?: boolean;
  isLinkFolder?: boolean;
  isLinkMaster?: boolean;
  busId?: string;
  linkedToTrackId?: string;
  volumeVal?: number;
  pan?: number;
  panVal?: number;
  eqBands?: {
    low: { f: number; g: number };
    mid: { f: number; g: number; q?: 'wide' | 'narrow' };
    high: { f: number; g: number };
  };
  lowCut?: boolean;
  reverbVal?: number;
  fxSends?: { reverb: number; distortion: number };
}

export interface WorkspaceTemplateMasterSettings {
  masterVol?: number;
  masterEQ?: { low: number; mid: number; high: number };
  masterCompressor?: { threshold: number; ratio: number };
  reverbDecay?: number;
  masterReverbVol?: number;
  masterFX?: MasterFX;
}

export interface WorkspaceTemplate {
  id: string; // 'tpl_local_...' ou ID Firestore
  name: string;
  ownerId: string; // user.uid ou 'local'
  authorName?: string;
  createdAt: number;
  updatedAt: number;
  options: WorkspaceTemplateOptions;
  tracks: WorkspaceTemplateTrack[];
  rodaTrackOrder: number[];
  masterSettings?: WorkspaceTemplateMasterSettings;
}
