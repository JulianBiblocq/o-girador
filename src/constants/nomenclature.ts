/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * O-Girador - Modular Instrument Nomenclature Constants & Resolvers
 */

import { 
  StyleId, 
  MaracatuRoleKey, 
  NomenclaturePreset, 
  GroupNomenclatureData 
} from '../types/nomenclature.types';

/**
 * Default fallback names for Maracatu de Baque Virado.
 * Used for solo users, anonymous visitors, or groups without custom setup.
 */
export const DEFAULT_MARACATU_NOMENCLATURE: Record<MaracatuRoleKey, string> = {
  alfaia_grave: 'Marcante',
  alfaia_medio: 'Meião',
  alfaia_agudo: 'Repique',
  caixa_baixo: 'Caixa',
  caixa_alto: 'Tarol',
  gongue: 'Gonguê',
  agbe: 'Agbê',
  mineiro: 'Mineiro',
  timbal: 'Timbal',
  apito: 'Apito',
  puxador: 'Puxador',
  coro: 'Coro',
  toada: 'Toada',
};

/**
 * Standard default alias for the current active musical style
 */
export const DEFAULT_NOMENCLATURE = DEFAULT_MARACATU_NOMENCLATURE;

/**
 * Pre-configured cultural presets available in the ecosystem
 */
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

/**
 * Maps legacy sequencer technical IDs (used in audio sample paths & presets)
 * to the immutable inter-app role keys.
 */
export const LEGACY_ID_TO_ROLE: Record<string, MaracatuRoleKey> = {
  marcante: 'alfaia_grave',
  meiao: 'alfaia_medio',
  repique: 'alfaia_agudo',
  caixa: 'caixa_baixo',
  tarol: 'caixa_alto',
  gongue: 'gongue',
  agbe: 'agbe',
  mineiro: 'mineiro',
  timbal: 'timbal',
  apito: 'apito',
  puxador: 'puxador',
  coro: 'coro',
  toada: 'toada',
};

/**
 * Reverse mapping from role key to legacy audio engine ID
 */
export const ROLE_TO_LEGACY_ID: Record<MaracatuRoleKey, string> = {
  alfaia_grave: 'marcante',
  alfaia_medio: 'meiao',
  alfaia_agudo: 'repique',
  caixa_baixo: 'caixa',
  caixa_alto: 'tarol',
  gongue: 'gongue',
  agbe: 'agbe',
  mineiro: 'mineiro',
  timbal: 'timbal',
  apito: 'apito',
  puxador: 'puxador',
  coro: 'coro',
  toada: 'toada',
};

/**
 * Position-based mapping for tracks referencing instrumentsConfig[0..12]
 */
export const INSTRUMENT_INDEX_TO_ROLE: MaracatuRoleKey[] = [
  'alfaia_grave', // 0 (marcante)
  'alfaia_medio', // 1 (meiao)
  'alfaia_agudo', // 2 (repique)
  'caixa_baixo',  // 3 (caixa)
  'caixa_alto',   // 4 (tarol)
  'gongue',       // 5
  'agbe',         // 6
  'mineiro',      // 7
  'timbal',       // 8
  'apito',        // 9
  'puxador',      // 10
  'coro',         // 11
  'toada',        // 12
];

/**
 * Safely parses the group nomenclature field from Firestore.
 * Supports:
 *  1. Nested by style: { maracatu: { alfaia_grave: "Marcante", ... } }
 *  2. Flat legacy format: { alfaia_grave: "Marcante", ... }
 */
export function normalizeGroupNomenclature(
  rawNomenclature: any,
  style: StyleId = 'maracatu'
): Partial<Record<MaracatuRoleKey, string>> {
  if (!rawNomenclature || typeof rawNomenclature !== 'object') {
    return {};
  }

  // Case 1: Multi-style dictionary { maracatu: { ... }, capoeira: { ... } }
  if (rawNomenclature[style] && typeof rawNomenclature[style] === 'object') {
    const styleObj = rawNomenclature[style];
    const cleaned: Partial<Record<MaracatuRoleKey, string>> = {};
    for (const [k, v] of Object.entries(styleObj)) {
      if (typeof v === 'string' && v.trim().length > 0) {
        cleaned[k as MaracatuRoleKey] = v.trim();
      }
    }
    return cleaned;
  }

  // Case 2: Flat backwards-compatible dictionary { alfaia_grave: "..." }
  const flatResult: Partial<Record<MaracatuRoleKey, string>> = {};
  for (const role of INSTRUMENT_INDEX_TO_ROLE) {
    const val = rawNomenclature[role];
    if (typeof val === 'string' && val.trim().length > 0) {
      flatResult[role] = val.trim();
    }
  }

  return flatResult;
}

/**
 * Resolves the display label of an instrument or track in constant time O(1).
 * 
 * Hierarchy:
 *  1. track.customName (if non-empty project override)
 *  2. groupNomenclature[roleKey] (association preference)
 *  3. DEFAULT_NOMENCLATURE[roleKey] (application default)
 *  4. Fallback string
 */
export function resolveInstrumentLabel(
  target: number | string | { instrumentIdx?: number; customName?: string; id?: any } | null | undefined,
  nomenclature?: Partial<Record<MaracatuRoleKey, string>> | null,
  style: StyleId = 'maracatu'
): string {
  if (target === null || target === undefined) {
    return 'Piste';
  }

  // Level 1: Project-specific track override (customName)
  if (typeof target === 'object') {
    if (target.customName && typeof target.customName === 'string' && target.customName.trim().length > 0) {
      return target.customName.trim();
    }
    if (typeof target.instrumentIdx === 'number') {
      return resolveInstrumentLabel(target.instrumentIdx, nomenclature, style);
    }
    if (typeof target.id === 'string') {
      return resolveInstrumentLabel(target.id, nomenclature, style);
    }
  }

  // Resolve immutable role key
  let roleKey: MaracatuRoleKey | undefined;
  if (typeof target === 'number') {
    roleKey = INSTRUMENT_INDEX_TO_ROLE[target];
  } else if (typeof target === 'string') {
    roleKey = (LEGACY_ID_TO_ROLE[target] as MaracatuRoleKey) || (target as MaracatuRoleKey);
  }

  if (!roleKey) {
    return typeof target === 'string' ? target : `Piste ${target}`;
  }

  // Level 2: Group Custom Nomenclature
  if (nomenclature && nomenclature[roleKey] && nomenclature[roleKey]!.trim().length > 0) {
    return nomenclature[roleKey]!.trim();
  }

  // Level 3: Default application fallback
  if (DEFAULT_NOMENCLATURE[roleKey]) {
    return DEFAULT_NOMENCLATURE[roleKey];
  }

  return typeof target === 'string' ? target : `Piste ${target}`;
}
