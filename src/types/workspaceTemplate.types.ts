import type { MasterFX } from './store.types';

export interface WorkspaceTemplateOptions {
  includeStructure: boolean;    // Estrutura do batuque & Bus (vínculos mestre/escravos, subgrupos)
  includeDisplayOrder: boolean; // Ordem da mesa de mixagem & rodaTrackOrder
  includeVolumePan: boolean;    // Níveis de volume & Panoramas
  includeEQ: boolean;           // Equalizações (bandas EQ / filtros Low-Cut, Master EQ)
  includeFX: boolean;           // Envios e retornos de efeitos (Reverb / Distorção, Master FX Rack)
}

export interface ApplyWorkspaceTemplateOptions extends WorkspaceTemplateOptions {
  removeExtraTracks: boolean;   // Retirar instrumentos ausentes do gabarito
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

export interface WorkspaceTemplateMasterEQ {
  low: number;
  mid: number;
  high: number;
  midFreqHz?: number;
  midQ?: 'wide' | 'narrow';
}

export interface WorkspaceTemplateMasterCompressor {
  threshold: number;
  ratio: number;
  attack?: number;
  release?: number;
  knee?: number;
  sidechainHpfHz?: number;
  mixPct?: number;
  makeupDb?: number;
}

export interface WorkspaceTemplateMasterSettings {
  masterVol?: number;
  masterEQ?: WorkspaceTemplateMasterEQ;
  masterCompressor?: WorkspaceTemplateMasterCompressor;
  reverbDecay?: number;
  masterReverbVol?: number;
  masterEffectsActive?: {
    compressor: boolean;
    reverb: boolean;
    disto: boolean;
  };
  isMasterMono?: boolean;
  masterFX?: MasterFX;
}

export interface WorkspaceTemplate {
  id: string; // 'tpl_local_...' ou ID Firestore
  templateKey?: 'street_parade' | 'wood_studio' | 'grand_stage' | string;
  name: string;
  nameFr?: string;
  namePt?: string;
  descriptionFr?: string;
  descriptionPt?: string;
  ownerId: string; // user.uid ou 'local'
  authorName?: string;
  createdAt: number;
  updatedAt: number;
  options: WorkspaceTemplateOptions;
  tracks: WorkspaceTemplateTrack[];
  rodaTrackOrder: number[];
  masterSettings?: WorkspaceTemplateMasterSettings;
}
