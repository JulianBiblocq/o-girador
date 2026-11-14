/**
 * busCompressorUserPresets.ts — Presets utilisateur Niveau 1 du Compresseur de Bus (< 125 lignes).
 * Persistance `localStorage` versionnée (`girador_bus_comp_user_presets_v1`) + repli mémoire Node/SSR,
 * validation défensive via `busCompressorSanitizer` (`0 NaN`, bornage strict) et immutabilité des 4 archétypes d'usine.
 */
import { useSequencerStore } from '../../stores/useSequencerStore';
import { BUS_COMPRESSOR_ARCHETYPES } from './busCompressorArchetypes';
import { sanitizeBusCompressorSettings } from './busCompressorSanitizer';
import { DEFAULT_BUS_COMPRESSOR_SETTINGS, type BusCompressorPresetArchetypeId, type BusCompressorSettings } from './busCompressorTypes';

export const BUS_COMP_USER_PRESETS_STORAGE_KEY = 'girador_bus_comp_user_presets_v1';
export const BUS_COMP_USER_PRESETS_EVENT = 'girador-bus-user-presets-changed';
const PRESET_SCHEMA_VERSION = 1;

export type BusCompressorUserPresetParams = Omit<BusCompressorSettings, 'enabled' | 'archetype'>;

export interface BusCompressorUserPreset {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  params: BusCompressorUserPresetParams;
}

let memoryFallbackPresets: BusCompressorUserPreset[] = [];

export function isFactoryBusArchetypeId(id: string): id is BusCompressorPresetArchetypeId {
  return Object.prototype.hasOwnProperty.call(BUS_COMPRESSOR_ARCHETYPES, id);
}

const isReservedId = (id: string): boolean => id === 'custom' || isFactoryBusArchetypeId(id);
const clonePreset = (p: BusCompressorUserPreset): BusCompressorUserPreset => ({ ...p, params: { ...p.params } });

function extractSanitizedParams(raw: Partial<BusCompressorSettings> | null | undefined): BusCompressorUserPresetParams {
  const s = sanitizeBusCompressorSettings(raw, DEFAULT_BUS_COMPRESSOR_SETTINGS);
  return {
    thresholdDb: s.thresholdDb, ratio: s.ratio, attackMs: s.attackMs, releaseMs: s.releaseMs,
    kneeDb: s.kneeDb, sidechainHpfHz: s.sidechainHpfHz, makeupDb: s.makeupDb, mixPct: s.mixPct,
  };
}

function persistUserPresets(next: BusCompressorUserPreset[]): void {
  memoryFallbackPresets = next.map(clonePreset);
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(BUS_COMP_USER_PRESETS_STORAGE_KEY, JSON.stringify({ version: PRESET_SCHEMA_VERSION, items: memoryFallbackPresets }));
    }
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      window.dispatchEvent(new CustomEvent(BUS_COMP_USER_PRESETS_EVENT));
    }
  } catch { /* Navigation privée / quota plein : repli mémoire conservé */ }
}

export function loadBusCompressorUserPresets(): BusCompressorUserPreset[] {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(BUS_COMP_USER_PRESETS_STORAGE_KEY) : null;
    if (!raw) return memoryFallbackPresets.map(clonePreset);
    const parsed = JSON.parse(raw);
    const rawItems = Array.isArray(parsed) ? parsed : (Array.isArray(parsed?.items) ? parsed.items : []);
    const sanitized: BusCompressorUserPreset[] = rawItems
      .filter((it: any) => it && typeof it.id === 'string' && !isReservedId(it.id) && typeof it.name === 'string' && it.name.trim().length > 0)
      .map((it: any) => ({
        id: String(it.id),
        name: String(it.name).trim().slice(0, 32),
        createdAt: Number.isFinite(it.createdAt) ? Number(it.createdAt) : Date.now(),
        updatedAt: Number.isFinite(it.updatedAt) ? Number(it.updatedAt) : Date.now(),
        params: extractSanitizedParams(it.params ?? it.settings),
      }));
    memoryFallbackPresets = sanitized;
    return sanitized.map(clonePreset);
  } catch {
    return memoryFallbackPresets.map(clonePreset);
  }
}

export function createBusCompressorUserPreset(
  name: string,
  rawSettings: Partial<BusCompressorSettings> | null | undefined
): BusCompressorUserPreset | null {
  if (typeof name !== 'string' || !name.trim()) return null;
  const now = Date.now();
  const item: BusCompressorUserPreset = {
    id: `usr_buscomp_${now}_${Math.random().toString(36).slice(2, 7)}`,
    name: name.trim().slice(0, 32), createdAt: now, updatedAt: now,
    params: extractSanitizedParams(rawSettings),
  };
  persistUserPresets([...loadBusCompressorUserPresets(), item]);
  return clonePreset(item);
}

export function renameBusCompressorUserPreset(presetId: string, newName: string): BusCompressorUserPreset | null {
  if (!presetId || isReservedId(presetId) || typeof newName !== 'string' || !newName.trim()) return null;
  const cleanName = newName.trim().slice(0, 32);
  let updated: BusCompressorUserPreset | null = null;
  const next = loadBusCompressorUserPresets().map((it) => {
    if (it.id !== presetId) return it;
    updated = { ...it, name: cleanName, updatedAt: Date.now(), params: { ...it.params } };
    return updated;
  });
  if (updated) persistUserPresets(next);
  return updated ? clonePreset(updated) : null;
}

export function deleteBusCompressorUserPreset(presetId: string): boolean {
  if (!presetId || isReservedId(presetId)) return false;
  const current = loadBusCompressorUserPresets();
  const next = current.filter((it) => it.id !== presetId);
  if (next.length === current.length) return false;
  persistUserPresets(next);
  return true;
}

export function applyBusCompressorUserPreset(busTrackId: number, presetId: string): boolean {
  if (!Number.isFinite(busTrackId) || !presetId || isReservedId(presetId)) return false;
  const found = loadBusCompressorUserPresets().find((it) => it.id === presetId);
  if (!found) return false;
  useSequencerStore.getState().updateBusCompressor(busTrackId, { ...extractSanitizedParams(found.params), enabled: true, archetype: 'custom' });
  return true;
}
