export type AoVivoMobileFamily = 'alfaia' | 'caixa' | 'tarol' | 'gongue' | 'timbal' | 'agbe' | 'mineiro';
export type AoVivoInstrumentFamily = AoVivoMobileFamily;

export interface InstrumentMobileOffset {
  offsetY: number;
  offsetX: number;
  scaleMult: number;
  spreadDeltaPx: number;
  reachDeltaY: number;
}

const MOBILE_STORAGE_KEY = 'og_aovivo_mobile_offsets_v2';

export const ZERO_MOBILE_OFFSET: InstrumentMobileOffset = { offsetY: 0, offsetX: 0, scaleMult: 1, spreadDeltaPx: 0, reachDeltaY: 0 };

export const DEFAULT_AO_VIVO_MOBILE_OFFSETS: Record<AoVivoInstrumentFamily, InstrumentMobileOffset> = {
  alfaia: { offsetY: 42, offsetX: 0, scaleMult: 1.34, spreadDeltaPx: 0, reachDeltaY: 0 },
  caixa: { offsetY: 70, offsetX: 0, scaleMult: 1.4, spreadDeltaPx: 32, reachDeltaY: 0 },
  tarol: { offsetY: 70, offsetX: 0, scaleMult: 1.4, spreadDeltaPx: 32, reachDeltaY: 0 },
  gongue: { offsetY: 0, offsetX: -200, scaleMult: 1, spreadDeltaPx: 0, reachDeltaY: 0 },
  timbal: { offsetY: -36, offsetX: 0, scaleMult: 1.16, spreadDeltaPx: -120, reachDeltaY: -64 },
  agbe: { offsetY: 0, offsetX: 0, scaleMult: 1.14, spreadDeltaPx: 0, reachDeltaY: 0 },
  mineiro: { offsetY: 0, offsetX: 0, scaleMult: 1.42, spreadDeltaPx: 0, reachDeltaY: 0 },
};

export const DEFAULT_MOBILE_OFFSETS = DEFAULT_AO_VIVO_MOBILE_OFFSETS;

function loadMobileOffsets(): Record<AoVivoMobileFamily, InstrumentMobileOffset> {
  const out: Record<AoVivoMobileFamily, InstrumentMobileOffset> = {
    alfaia: { ...DEFAULT_AO_VIVO_MOBILE_OFFSETS.alfaia },
    caixa: { ...DEFAULT_AO_VIVO_MOBILE_OFFSETS.caixa },
    tarol: { ...DEFAULT_AO_VIVO_MOBILE_OFFSETS.tarol },
    gongue: { ...DEFAULT_AO_VIVO_MOBILE_OFFSETS.gongue },
    timbal: { ...DEFAULT_AO_VIVO_MOBILE_OFFSETS.timbal },
    agbe: { ...DEFAULT_AO_VIVO_MOBILE_OFFSETS.agbe },
    mineiro: { ...DEFAULT_AO_VIVO_MOBILE_OFFSETS.mineiro },
  };
  try {
    if (typeof window === 'undefined' || !window.localStorage) return out;
    const raw = window.localStorage.getItem(MOBILE_STORAGE_KEY);
    if (!raw) return out;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return out;
    (Object.keys(out) as AoVivoMobileFamily[]).forEach((fam) => {
      if (parsed[fam] && typeof parsed[fam] === 'object') {
        out[fam] = { ...out[fam], ...parsed[fam] };
      }
    });
  } catch {
    // ignore storage errors
  }
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
  } catch {
    // ignore
  }
  listeners.forEach((fn) => fn());
}

export function resolveMobileFamily(instIdOrFam: string | null | undefined): AoVivoMobileFamily {
  const id = (instIdOrFam || '').toLowerCase();
  if (id === 'caixa') return 'caixa';
  if (id === 'tarol') return 'tarol';
  if (id === 'gongue') return 'gongue';
  if (id === 'timbal') return 'timbal';
  if (id === 'agbe') return 'agbe';
  if (id === 'mineiro') return 'mineiro';
  return 'alfaia';
}

export function isMobileViewport(): boolean {
  return typeof window !== 'undefined' && window.innerWidth < 768;
}

export function getEffectiveMobileOffset(instIdOrFam: string | null | undefined): InstrumentMobileOffset {
  if (!isMobileViewport()) return ZERO_MOBILE_OFFSET;
  return MOBILE_OFFSETS[resolveMobileFamily(instIdOrFam)];
}

export function updateMobileOffset(fam: AoVivoMobileFamily, patch: Partial<InstrumentMobileOffset>): void {
  Object.assign(MOBILE_OFFSETS[fam], patch);
  saveAndNotify();
}

export function resetMobileOffsets(fam?: AoVivoMobileFamily): void {
  if (fam) {
    MOBILE_OFFSETS[fam] = { ...DEFAULT_AO_VIVO_MOBILE_OFFSETS[fam] };
  } else {
    (Object.keys(DEFAULT_AO_VIVO_MOBILE_OFFSETS) as AoVivoMobileFamily[]).forEach((k) => {
      MOBILE_OFFSETS[k] = { ...DEFAULT_AO_VIVO_MOBILE_OFFSETS[k] };
    });
  }
  saveAndNotify();
}
