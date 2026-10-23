/**
 * 
 * O-Girador - Nomenclature Normalizers & Label Resolvers
 */

import { StyleId, MaracatuRoleKey } from '../../../types/nomenclature.types';
import {
  DEFAULT_NOMENCLATURE,
  INSTRUMENT_INDEX_TO_ROLE,
  LEGACY_ID_TO_ROLE,
} from './maracatuRoles';

export function normalizeLegacyStrokeCode(stroke: string): string {
  if (!stroke) return '';
  if (stroke === 'r') return 'R';
  return stroke;
}

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
