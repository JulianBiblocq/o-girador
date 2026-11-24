const STORAGE_PREFIX = 'og_aovivo_cfg_v7_';
const MOBILE_STORAGE_PREFIX = 'og_aovivo_mobile_cfg_v2_';

export type AoVivoStorageKey = 'alfaia' | 'caixa' | 'gongue' | 'timbal' | 'agbe' | 'mineiro';
export type AoVivoMobileConfigKey = 'alfaia' | 'caixa' | 'tarol' | 'gongue' | 'timbal' | 'agbe' | 'mineiro';
export type AoVivoLabPreviewFamily = AoVivoMobileConfigKey;

let isAoVivoLabOpen = false;
let aoVivoLabPreviewFamily: AoVivoLabPreviewFamily | null = null;
let labForceMobileEdit = false;
const labOpenListeners = new Set<() => void>();
const labPreviewListeners = new Set<() => void>();
const targetModeListeners = new Set<() => void>();

const checkNarrowViewport = (): boolean => typeof window !== 'undefined' && window.innerWidth < 768;
let lastKnownNarrow = checkNarrowViewport();

if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
  window.addEventListener('resize', () => {
    const nowNarrow = checkNarrowViewport();
    if (nowNarrow !== lastKnownNarrow) {
      lastKnownNarrow = nowNarrow;
      targetModeListeners.forEach((fn) => fn());
    }
  });
}

export function getIsAoVivoLabOpen(): boolean { return isAoVivoLabOpen; }

export function setIsAoVivoLabOpen(open: boolean): void {
  if (isAoVivoLabOpen === open) return;
  const hadForcedMobile = isAoVivoLabOpen && labForceMobileEdit;
  isAoVivoLabOpen = open;
  if (!open) {
    labForceMobileEdit = false;
    if (aoVivoLabPreviewFamily !== null) {
      aoVivoLabPreviewFamily = null;
      labPreviewListeners.forEach((fn) => fn());
    }
  }
  labOpenListeners.forEach((fn) => fn());
  if (!open && hadForcedMobile) targetModeListeners.forEach((fn) => fn());
}

export function subscribeAoVivoLabOpen(fn: () => void): () => void {
  labOpenListeners.add(fn);
  return () => labOpenListeners.delete(fn);
}

export function getAoVivoLabPreviewFamily(): AoVivoLabPreviewFamily | null {
  return isAoVivoLabOpen ? aoVivoLabPreviewFamily : null;
}

export function setAoVivoLabPreviewFamily(fam: AoVivoLabPreviewFamily | null): void {
  if (aoVivoLabPreviewFamily === fam) return;
  aoVivoLabPreviewFamily = fam;
  labPreviewListeners.forEach((fn) => fn());
}

export function subscribeAoVivoLabPreview(fn: () => void): () => void {
  labPreviewListeners.add(fn);
  return () => labPreviewListeners.delete(fn);
}

export function isAoVivoMobileEditActive(): boolean {
  return isAoVivoLabOpen && labForceMobileEdit;
}

export function setAoVivoMobileEditForced(forced: boolean): void {
  if (labForceMobileEdit === forced) return;
  labForceMobileEdit = forced;
  targetModeListeners.forEach((fn) => fn());
}

export function isAoVivoMobileProfileActive(): boolean {
  return checkNarrowViewport() || (isAoVivoLabOpen && labForceMobileEdit);
}

export function syncAoVivoViewportProfile(): void {
  lastKnownNarrow = checkNarrowViewport();
  targetModeListeners.forEach((fn) => fn());
}

export function subscribeAoVivoTargetMode(fn: () => void): () => void {
  targetModeListeners.add(fn);
  return () => targetModeListeners.delete(fn);
}

const isPlainObj = (v: unknown): v is Record<string, any> => Boolean(v) && typeof v === 'object' && !Array.isArray(v);

export function cloneAoVivoConfig<T extends Record<string, any>>(obj: T): T {
  const out: any = { ...obj };
  for (const k of Object.keys(obj)) {
    if (isPlainObj(obj[k])) out[k] = cloneAoVivoConfig(obj[k]);
  }
  return out;
}

export function deepAssignAoVivoConfig<T extends Record<string, any>>(target: T, source: Record<string, any>): void {
  for (const k of Object.keys(source)) {
    const sv = source[k], tv = (target as any)[k];
    if (isPlainObj(sv)) {
      if (isPlainObj(tv)) deepAssignAoVivoConfig(tv, sv);
      else (target as any)[k] = cloneAoVivoConfig(sv);
    } else (target as any)[k] = sv;
  }
}

function loadFromFullKey<T extends Record<string, any>>(fullKey: string, defaults: T, baseOverrides?: Record<string, any>): T {
  const merged = cloneAoVivoConfig(defaults);
  if (baseOverrides) deepAssignAoVivoConfig(merged, baseOverrides);
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = window.localStorage.getItem(fullKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (isPlainObj(parsed)) deepAssignAoVivoConfig(merged, parsed);
      }
    }
  } catch { /* ignore */ }
  if ('posePreview' in merged) (merged as any).posePreview = 'auto';
  if ('previewMode' in merged) (merged as any).previewMode = 'auto';
  if ('speedMultiplier' in merged) (merged as any).speedMultiplier = 1;
  return merged;
}

export const loadPersistedAoVivoConfig = <T extends Record<string, any>>(key: AoVivoStorageKey, defaults: T): T =>
  loadFromFullKey(STORAGE_PREFIX + key, defaults);
export const loadPersistedMobileStrokeConfig = <T extends Record<string, any>>(fam: AoVivoMobileConfigKey, defaults: T, overrides?: Record<string, any>): T =>
  loadFromFullKey(MOBILE_STORAGE_PREFIX + fam, defaults, overrides);

const saveFullKey = (fullKey: string, cfg: Record<string, any>): void => {
  try { if (typeof window !== 'undefined' && window.localStorage) window.localStorage.setItem(fullKey, JSON.stringify(cfg)); } catch { /* ignore */ }
};
const clearFullKey = (fullKey: string): void => {
  try { if (typeof window !== 'undefined' && window.localStorage) window.localStorage.removeItem(fullKey); } catch { /* ignore */ }
};

export const savePersistedAoVivoConfig = (key: AoVivoStorageKey, cfg: Record<string, any>): void => saveFullKey(STORAGE_PREFIX + key, cfg);
export const clearPersistedAoVivoConfig = (key: AoVivoStorageKey): void => clearFullKey(STORAGE_PREFIX + key);
export const savePersistedMobileStrokeConfig = (fam: AoVivoMobileConfigKey, cfg: Record<string, any>): void => saveFullKey(MOBILE_STORAGE_PREFIX + fam, cfg);
export const clearPersistedMobileStrokeConfig = (fam: AoVivoMobileConfigKey): void => clearFullKey(MOBILE_STORAGE_PREFIX + fam);
