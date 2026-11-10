import {
  STUDIO_REVERB_PRESETS, STUDIO_SATURATION_PRESETS,
  STUDIO_COMPRESSOR_PRESETS, STUDIO_EQ_PRESETS, StudioModulePreset,
} from './studioFxPresets';

export const STUDIO_FX_USER_PRESETS_STORAGE_KEY = 'girador_studio_fx_user_presets_v1';
export type StudioRackModuleKey = 'reverb' | 'saturation' | 'compressor' | 'eq';

export interface StudioUserPresetItem<T = Record<string, any>> {
  id: string; name: string; module: StudioRackModuleKey;
  createdAt: number; updatedAt: number; settings: T;
}

export type StudioUserPresetsStore = Record<StudioRackModuleKey, StudioUserPresetItem[]>;

const EMPTY_STORE: StudioUserPresetsStore = { reverb: [], saturation: [], compressor: [], eq: [] };
let memoryFallbackStore: StudioUserPresetsStore = { reverb: [], saturation: [], compressor: [], eq: [] };

function sanitizeSettingsObject(raw: any): Record<string, any> {
  if (!raw || typeof raw !== 'object') return {};
  const clean: Record<string, any> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (typeof v === 'number') { if (Number.isFinite(v)) clean[k] = v; }
    else if (typeof v === 'string' || typeof v === 'boolean') clean[k] = v;
  }
  return clean;
}

export function getFactoryPresetsForModule(module: StudioRackModuleKey): StudioModulePreset<any>[] {
  if (module === 'reverb') return STUDIO_REVERB_PRESETS;
  if (module === 'saturation') return STUDIO_SATURATION_PRESETS;
  if (module === 'compressor') return STUDIO_COMPRESSOR_PRESETS;
  return STUDIO_EQ_PRESETS;
}

export function isFactoryPresetId(module: StudioRackModuleKey, id: string): boolean {
  return getFactoryPresetsForModule(module).some(p => p.id === id);
}

export function loadStudioFxUserPresets(): StudioUserPresetsStore {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(STUDIO_FX_USER_PRESETS_STORAGE_KEY) : null;
    if (!raw) return {
      reverb: [...memoryFallbackStore.reverb], saturation: [...memoryFallbackStore.saturation],
      compressor: [...memoryFallbackStore.compressor], eq: [...memoryFallbackStore.eq],
    };
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return { ...EMPTY_STORE };
    const out: StudioUserPresetsStore = { reverb: [], saturation: [], compressor: [], eq: [] };
    (['reverb', 'saturation', 'compressor', 'eq'] as const).forEach((mod) => {
      const list = Array.isArray(parsed[mod]) ? parsed[mod] : [];
      out[mod] = list
        .filter((item: any) => item && typeof item.id === 'string' && typeof item.name === 'string' && !isFactoryPresetId(mod, item.id))
        .map((item: any) => ({
          id: String(item.id), name: String(item.name).trim() || 'Preset', module: mod,
          createdAt: Number.isFinite(item.createdAt) ? Number(item.createdAt) : Date.now(),
          updatedAt: Number.isFinite(item.updatedAt) ? Number(item.updatedAt) : Date.now(),
          settings: sanitizeSettingsObject(item.settings),
        }));
    });
    memoryFallbackStore = out;
    return out;
  } catch {
    return {
      reverb: [...memoryFallbackStore.reverb], saturation: [...memoryFallbackStore.saturation],
      compressor: [...memoryFallbackStore.compressor], eq: [...memoryFallbackStore.eq],
    };
  }
}

export function saveStudioFxUserPresets(store: StudioUserPresetsStore): void {
  memoryFallbackStore = {
    reverb: [...(store.reverb || [])], saturation: [...(store.saturation || [])],
    compressor: [...(store.compressor || [])], eq: [...(store.eq || [])],
  };
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STUDIO_FX_USER_PRESETS_STORAGE_KEY, JSON.stringify(memoryFallbackStore));
    }
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      window.dispatchEvent(new CustomEvent('girador-studio-user-presets-changed'));
    }
  } catch { /* ignore */ }
}

export function createStudioUserPreset(
  module: StudioRackModuleKey, name: string, rawSettings: Record<string, any>
): StudioUserPresetItem {
  const cleanName = name.trim() || 'Preset Studio';
  const now = Date.now();
  const id = `usr_${module}_${now}_${Math.random().toString(36).slice(2, 7)}`;
  const sanitized = sanitizeSettingsObject(rawSettings);
  delete sanitized.presetId; delete sanitized.compPresetId; delete sanitized.eqPresetId;

  const item: StudioUserPresetItem = { id, name: cleanName, module, createdAt: now, updatedAt: now, settings: sanitized };
  const current = loadStudioFxUserPresets();
  current[module] = [...current[module], item];
  saveStudioFxUserPresets(current);
  return item;
}

export function renameStudioUserPreset(
  module: StudioRackModuleKey, presetId: string, newName: string
): StudioUserPresetItem | null {
  if (isFactoryPresetId(module, presetId)) return null;
  const cleanName = newName.trim();
  if (!cleanName) return null;
  const current = loadStudioFxUserPresets();
  let updatedItem: StudioUserPresetItem | null = null;
  current[module] = current[module].map((item) => {
    if (item.id !== presetId) return item;
    updatedItem = { ...item, name: cleanName, updatedAt: Date.now() };
    return updatedItem;
  });
  if (updatedItem) saveStudioFxUserPresets(current);
  return updatedItem;
}

export function deleteStudioUserPreset(module: StudioRackModuleKey, presetId: string): boolean {
  if (isFactoryPresetId(module, presetId)) return false;
  const current = loadStudioFxUserPresets();
  const prevLen = current[module].length;
  current[module] = current[module].filter(item => item.id !== presetId);
  if (current[module].length === prevLen) return false;
  saveStudioFxUserPresets(current);
  return true;
}
