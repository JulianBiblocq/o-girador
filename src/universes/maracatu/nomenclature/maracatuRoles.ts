/**
 * 
 * O-Girador - Maracatu Role Definitions & Mappings
 */

import { MaracatuRoleKey } from '../../../types/nomenclature.types';

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

export const DEFAULT_NOMENCLATURE = DEFAULT_MARACATU_NOMENCLATURE;

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

export const INSTRUMENT_INDEX_TO_ROLE: MaracatuRoleKey[] = [
  'alfaia_grave',
  'alfaia_medio',
  'alfaia_agudo',
  'caixa_baixo',
  'caixa_alto',
  'gongue',
  'agbe',
  'mineiro',
  'timbal',
  'apito',
  'puxador',
  'coro',
  'toada',
];

export const MARACATU_SHORT_CODES: Record<string, MaracatuRoleKey | string> = {
  MC: 'alfaia_grave',
  MD: 'alfaia_medio',
  RP: 'alfaia_agudo',
  CX: 'caixa_baixo',
  GB: 'caixa_alto',
  TR: 'caixa_alto',
  AB: 'agbe',
  AG: 'gongue',
  GG: 'gongue',
  AT: 'atabaque',
  MN: 'mineiro',
  TB: 'timbal',
  AP: 'apito',
  PX: 'puxador',
  CR: 'coro',
  TD: 'toada',
};

export function resolveInstrumentRoleKey(target: unknown): MaracatuRoleKey | undefined {
  if (target === null || target === undefined) return undefined;
  if (typeof target === 'number') return INSTRUMENT_INDEX_TO_ROLE[target];
  if (typeof target === 'string') {
    const upper = target.trim().toUpperCase();
    if (MARACATU_SHORT_CODES[upper] && (MARACATU_SHORT_CODES[upper] in ROLE_TO_LEGACY_ID)) {
      return MARACATU_SHORT_CODES[upper] as MaracatuRoleKey;
    }
    const lower = target.trim().toLowerCase();
    return LEGACY_ID_TO_ROLE[lower] || (lower as MaracatuRoleKey);
  }
  if (typeof target === 'object' && target !== null) {
    const obj = target as { instrumentRoleKey?: string; instrumentIdx?: number; id?: string };
    if (obj.instrumentRoleKey) return resolveInstrumentRoleKey(obj.instrumentRoleKey);
    if (typeof obj.instrumentIdx === 'number') return resolveInstrumentRoleKey(obj.instrumentIdx);
    if (obj.id) return resolveInstrumentRoleKey(obj.id);
  }
  return undefined;
}

export function getCompatibleTargetFamilies(roleKey: MaracatuRoleKey): string[] {
  switch (roleKey) {
    case 'alfaia_grave':
    case 'alfaia_medio':
    case 'alfaia_agudo':
      return ['alfaia', 'percussion'];
    case 'caixa_baixo':
    case 'caixa_alto':
      return ['caixa', 'snare', 'percussion'];
    case 'gongue':
    case 'agbe':
    case 'mineiro':
      return ['iron', 'shaker', 'percussion'];
    case 'puxador':
    case 'coro':
    case 'toada':
      return ['vocal', 'voice'];
    default:
      return ['percussion'];
  }
}
