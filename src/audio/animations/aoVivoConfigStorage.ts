const STORAGE_PREFIX = 'og_aovivo_cfg_v6_';

export type AoVivoStorageKey = 'alfaia' | 'caixa' | 'gongue' | 'timbal' | 'agbe' | 'mineiro';

let isAoVivoLabOpen = false;
const labOpenListeners = new Set<() => void>();

export function getIsAoVivoLabOpen(): boolean {
  return isAoVivoLabOpen;
}

export function setIsAoVivoLabOpen(open: boolean): void {
  if (isAoVivoLabOpen === open) return;
  isAoVivoLabOpen = open;
  labOpenListeners.forEach((fn) => fn());
}

export function subscribeAoVivoLabOpen(fn: () => void): () => void {
  labOpenListeners.add(fn);
  return () => labOpenListeners.delete(fn);
}

export function loadPersistedAoVivoConfig<T extends Record<string, any>>(
  key: AoVivoStorageKey,
  defaults: T
): T {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return cloneConfig(defaults);
    const raw = window.localStorage.getItem(STORAGE_PREFIX + key);
    if (!raw) return cloneConfig(defaults);
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return cloneConfig(defaults);
    const merged: any = { ...defaults, ...parsed };
    for (const k of Object.keys(defaults)) {
      const defVal = (defaults as any)[k];
      if (defVal && typeof defVal === 'object' && !Array.isArray(defVal)) {
        merged[k] = { ...defVal, ...(parsed[k] || {}) };
      }
    }
    if ('posePreview' in merged) merged.posePreview = 'auto';
    if ('previewMode' in merged) merged.previewMode = 'auto';
    if ('speedMultiplier' in merged) merged.speedMultiplier = 1;
    return merged as T;
  } catch {
    return cloneConfig(defaults);
  }
}

export function savePersistedAoVivoConfig(
  key: AoVivoStorageKey,
  cfg: Record<string, any>
): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    window.localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(cfg));
  } catch {
    // ignore storage quota errors
  }
}

export function clearPersistedAoVivoConfig(key: AoVivoStorageKey): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    window.localStorage.removeItem(STORAGE_PREFIX + key);
  } catch {
    // ignore
  }
}

function cloneConfig<T extends Record<string, any>>(obj: T): T {
  const out: any = { ...obj };
  for (const k of Object.keys(obj)) {
    const v = obj[k];
    if (v && typeof v === 'object' && !Array.isArray(v)) out[k] = { ...v };
  }
  return out;
}
