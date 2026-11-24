import { isAoVivoMobileEditActive } from './aoVivoConfigStorage';

export type AoVivoMobileFamily = 'alfaia' | 'caixa' | 'tarol' | 'gongue' | 'timbal' | 'agbe' | 'mineiro';
export type AoVivoInstrumentFamily = AoVivoMobileFamily;

export interface InstrumentMobileOffset {
  offsetY: number;
  offsetX: number;
  scaleMult: number;
  spreadDeltaPx: number;
  reachDeltaY: number;
}

const MOBILE_STORAGE_KEY = 'og_aovivo_mobile_offsets_v5';

export const ZERO_MOBILE_OFFSET: InstrumentMobileOffset = { offsetY: 0, offsetX: 0, scaleMult: 1, spreadDeltaPx: 0, reachDeltaY: 0 };

export const DEFAULT_AO_VIVO_MOBILE_OFFSETS: Record<AoVivoInstrumentFamily, InstrumentMobileOffset> = {
  alfaia: {
    offsetY: 18,
    offsetX: -2,
    scaleMult: 1.34,
    spreadDeltaPx: -20,
    reachDeltaY: 74,
  },
  caixa: {
    offsetY: 10,
    offsetX: 0,
    scaleMult: 1.4,
    spreadDeltaPx: -14,
    reachDeltaY: 76,
  },
  tarol: {
    offsetY: 10,
    offsetX: 0,
    scaleMult: 1.4,
    spreadDeltaPx: -14,
    reachDeltaY: 76,
  },
  gongue: {
    offsetY: 0,
    offsetX: -200,
    scaleMult: 1,
    spreadDeltaPx: 0,
    reachDeltaY: 0,
  },
  timbal: {
    offsetY: -158,
    offsetX: 0,
    scaleMult: 1.16,
    spreadDeltaPx: -120,
    reachDeltaY: 2,
  },
  agbe: {
    offsetY: 0,
    offsetX: 0,
    scaleMult: 1.14,
    spreadDeltaPx: 0,
    reachDeltaY: 0,
  },
  mineiro: {
    offsetY: 0,
    offsetX: 0,
    scaleMult: 1.42,
    spreadDeltaPx: 0,
    reachDeltaY: 0,
  },
};

export const DEFAULT_MOBILE_OFFSETS = DEFAULT_AO_VIVO_MOBILE_OFFSETS;

const ALL_MOBILE_FAMILIES: AoVivoMobileFamily[] = ['alfaia', 'caixa', 'tarol', 'gongue', 'timbal', 'agbe', 'mineiro'];

function loadMobileOffsets(): Record<AoVivoMobileFamily, InstrumentMobileOffset> {
  const out = {} as Record<AoVivoMobileFamily, InstrumentMobileOffset>;
  ALL_MOBILE_FAMILIES.forEach((fam) => { out[fam] = { ...DEFAULT_AO_VIVO_MOBILE_OFFSETS[fam] }; });
  try {
    if (typeof window === 'undefined' || !window.localStorage) return out;
    const raw = window.localStorage.getItem(MOBILE_STORAGE_KEY);
    if (!raw) return out;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return out;
    ALL_MOBILE_FAMILIES.forEach((fam) => {
      if (parsed[fam] && typeof parsed[fam] === 'object') out[fam] = { ...out[fam], ...parsed[fam] };
    });
  } catch { /* ignore storage errors */ }
  return out;
}

export const MOBILE_OFFSETS: Record<AoVivoMobileFamily, InstrumentMobileOffset> = loadMobileOffsets();

const listeners = new Set<() => void>();

export function subscribeMobileOffsets(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function saveAndNotify(): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(MOBILE_STORAGE_KEY, JSON.stringify(MOBILE_OFFSETS));
    }
  } catch { /* ignore */ }
  listeners.forEach((fn) => fn());
}

export function resolveNullableMobileFamily(instIdOrFam: string | null | undefined): AoVivoMobileFamily | null {
  const id = String(instIdOrFam || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (['marcante', 'meiao', 'repique', 'alfaia', 'alfaia_grave', 'alfaia_medio', 'alfaia_agudo'].includes(id)) return 'alfaia';
  if (ALL_MOBILE_FAMILIES.includes(id as AoVivoMobileFamily)) return id as AoVivoMobileFamily;
  return null;
}

export const resolveMobileFamily = (instIdOrFam: string | null | undefined): AoVivoMobileFamily =>
  resolveNullableMobileFamily(instIdOrFam) ?? 'alfaia';

export const isMobileViewport = (): boolean => typeof window !== 'undefined' && window.innerWidth < 768;

export function getEffectiveMobileOffset(instIdOrFam: string | null | undefined): InstrumentMobileOffset {
  if (!isMobileViewport() && !isAoVivoMobileEditActive()) return ZERO_MOBILE_OFFSET;
  const fam = resolveNullableMobileFamily(instIdOrFam);
  return fam ? MOBILE_OFFSETS[fam] : ZERO_MOBILE_OFFSET;
}

export function updateMobileOffset(fam: AoVivoMobileFamily, patch: Partial<InstrumentMobileOffset>): void {
  Object.assign(MOBILE_OFFSETS[fam], patch);
  saveAndNotify();
}

export function resetMobileOffsets(fam?: AoVivoMobileFamily): void {
  if (fam) Object.assign(MOBILE_OFFSETS[fam], DEFAULT_AO_VIVO_MOBILE_OFFSETS[fam]);
  else ALL_MOBILE_FAMILIES.forEach((k) => Object.assign(MOBILE_OFFSETS[k], DEFAULT_AO_VIVO_MOBILE_OFFSETS[k]));
  saveAndNotify();
}
