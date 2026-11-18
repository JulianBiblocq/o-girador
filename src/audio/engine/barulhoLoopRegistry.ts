/**
 * barulhoLoopRegistry.ts — Registre SSOT des Points de Boucle (`9 Barulhos B/b` + `Apito L`) (< 128 lignes).
 * - Isolation stricte des overrides `localStorage` (`ogirador_loop_lab_overrides_v1`) sous clés `${id}::studio` vs `${id}::legacy`.
 * - Fallback transparent d'`Apito (L)` sur `Mixdown/Apito W long.ogg` tant que `STUDIO_BANK_ENABLED.apito === false`.
 */
import { PendingStudioInstrumentId, STUDIO_BANK_ENABLED } from '../../universes/maracatu/instruments/studioBankRegistry';

export const LOOP_LAB_STORAGE_KEY = 'ogirador_loop_lab_overrides_v1';

export const LOOP_LAB_INSTRUMENTS = [
  'marcante', 'meiao', 'repique', 'gongue', 'caixa', 'tarol', 'timbal', 'agbe', 'mineiro', 'apito',
] as const;

export type LoopLabInstrumentId = (typeof LOOP_LAB_INSTRUMENTS)[number];
export type LoopBankTier = 'studio' | 'legacy';

export interface BarulhoLoopPointsMs {
  loopStartMs: number;
  loopEndMs: number;
  crossfadeMs: number;
  softEntryMs: number;
}

const STUDIO_ALFAIAS = new Set<string>(['marcante', 'meiao', 'repique']);

const FACTORY_DEFAULTS: Record<string, BarulhoLoopPointsMs> = {
  'marcante::studio': { loopStartMs: 240, loopEndMs: 2745, crossfadeMs: 110, softEntryMs: 420 },
  'meiao::studio': { loopStartMs: 310, loopEndMs: 2535, crossfadeMs: 110, softEntryMs: 480 },
  'repique::studio': { loopStartMs: 260, loopEndMs: 2765, crossfadeMs: 110, softEntryMs: 440 },
  'caixa::legacy': { loopStartMs: 240, loopEndMs: 8680, crossfadeMs: 110, softEntryMs: 450 },
  'tarol::legacy': { loopStartMs: 240, loopEndMs: 4665, crossfadeMs: 110, softEntryMs: 420 },
  'timbal::legacy': { loopStartMs: 280, loopEndMs: 5500, crossfadeMs: 110, softEntryMs: 460 },
  'gongue::legacy': { loopStartMs: 240, loopEndMs: 6375, crossfadeMs: 110, softEntryMs: 430 },
  'agbe::legacy': { loopStartMs: 240, loopEndMs: 5240, crossfadeMs: 110, softEntryMs: 430 },
  'mineiro::legacy': { loopStartMs: 240, loopEndMs: 5120, crossfadeMs: 110, softEntryMs: 430 },
  'apito::legacy': { loopStartMs: 220, loopEndMs: 835, crossfadeMs: 110, softEntryMs: 330 },
};

const FILE_PREFIX_MAP: Record<Exclude<LoopLabInstrumentId, 'marcante' | 'meiao' | 'repique' | 'apito'>, string> = {
  caixa: 'Caixa', tarol: 'Tarol', timbal: 'Timbal', gongue: 'Gongue', agbe: 'Agbe', mineiro: 'Mineiro',
};

let registryVersion = 1;
const listeners = new Set<(instId: LoopLabInstrumentId) => void>();

export function getLoopRegistryVersion(): number { return registryVersion; }

export function subscribeLoopLabRegistry(cb: (instId: LoopLabInstrumentId) => void): () => void {
  listeners.add(cb);
  return () => { listeners.delete(cb); };
}

export function getActiveLoopBankTier(instId: LoopLabInstrumentId, studioFlagsOverride?: Partial<Record<PendingStudioInstrumentId, boolean>>): LoopBankTier {
  if (STUDIO_ALFAIAS.has(instId)) return 'studio';
  const k = instId as PendingStudioInstrumentId;
  return (studioFlagsOverride && k in studioFlagsOverride ? Boolean(studioFlagsOverride[k]) : Boolean(STUDIO_BANK_ENABLED[k])) ? 'studio' : 'legacy';
}

export function buildLoopOverrideKey(instId: LoopLabInstrumentId, tier?: LoopBankTier): string {
  return `${instId}::${tier ?? getActiveLoopBankTier(instId)}`;
}

export function resolveLoopSampleFilePath(instId: LoopLabInstrumentId, studioFlagsOverride?: Partial<Record<PendingStudioInstrumentId, boolean>>): string {
  if (instId === 'marcante' || instId === 'meiao' || instId === 'repique') return `Mixdown/Alfaia ${instId} B.ogg`;
  if (instId === 'apito') return getActiveLoopBankTier('apito', studioFlagsOverride) === 'studio' ? 'Mixdown/Apito L.ogg' : 'Mixdown/Apito W long.ogg';
  return `Mixdown/${FILE_PREFIX_MAP[instId]} B.ogg`;
}

export function resolveLoopInstrumentFromPath(path: string): LoopLabInstrumentId | null {
  if (!path) return null;
  const norm = path.trim().toLowerCase();
  const alf = norm.match(/alfaia\s+(marcante|meiao|repique)\s+b\.(?:ogg|m4a|wav)/);
  if (alf) return alf[1] as LoopLabInstrumentId;
  const std = norm.match(/(?:^|\/)(caixa|tarol|timbal|gongue|agbe|mineiro)\s+b\.(?:ogg|m4a|wav)/);
  if (std) return std[1] as LoopLabInstrumentId;
  if (/apito\s+(?:l|w\s+long)\.(?:ogg|m4a|wav)/.test(norm)) return 'apito';
  return null;
}

export function sanitizeLoopPointsForDuration(raw: BarulhoLoopPointsMs, totalDurationMs?: number): BarulhoLoopPointsMs {
  const step5 = (v: number) => Math.round((Number(v) || 0) / 5) * 5;
  const crossfadeMs = Math.max(20, Math.min(220, step5(raw.crossfadeMs || 110)));
  const maxEnd = totalDurationMs && totalDurationMs > 120 ? Math.max(90, Math.floor((totalDurationMs - 10) / 5) * 5) : 30000;
  const minSpan = crossfadeMs + 35;
  let loopStartMs = Math.max(15, Math.min(maxEnd - minSpan, step5(raw.loopStartMs)));
  let loopEndMs = Math.max(loopStartMs + minSpan, Math.min(maxEnd, step5(raw.loopEndMs)));
  if (loopEndMs > maxEnd) { loopEndMs = maxEnd; loopStartMs = Math.max(15, loopEndMs - minSpan); }
  const softEntryMs = Math.max(loopStartMs, Math.min(Math.max(loopStartMs, loopEndMs - crossfadeMs - 10), step5(raw.softEntryMs)));
  return { loopStartMs, loopEndMs, crossfadeMs, softEntryMs };
}

export function loadAllLoopLabOverrides(): Record<string, BarulhoLoopPointsMs> {
  if (typeof localStorage === 'undefined') return {};
  try {
    const parsed = JSON.parse(localStorage.getItem(LOOP_LAB_STORAGE_KEY) || '{}');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch { return {}; }
}

function writeOverridesMap(map: Record<string, BarulhoLoopPointsMs>, changedId: LoopLabInstrumentId): void {
  try { if (typeof localStorage !== 'undefined') localStorage.setItem(LOOP_LAB_STORAGE_KEY, JSON.stringify(map)); } catch { /* ignore */ }
  registryVersion++;
  listeners.forEach((cb) => { try { cb(changedId); } catch { /* ignore */ } });
}

export function getFactoryBarulhoLoopPoints(instId: LoopLabInstrumentId, tier?: LoopBankTier, fallbackAnalyzed?: BarulhoLoopPointsMs): BarulhoLoopPointsMs {
  return FACTORY_DEFAULTS[buildLoopOverrideKey(instId, tier)] ?? fallbackAnalyzed ?? { loopStartMs: 240, loopEndMs: 2600, crossfadeMs: 110, softEntryMs: 420 };
}

export function getEffectiveBarulhoLoopPoints(instId: LoopLabInstrumentId, totalDurationMs?: number, tier?: LoopBankTier, fallbackAnalyzed?: BarulhoLoopPointsMs): BarulhoLoopPointsMs {
  const base = loadAllLoopLabOverrides()[buildLoopOverrideKey(instId, tier)] ?? getFactoryBarulhoLoopPoints(instId, tier, fallbackAnalyzed);
  return sanitizeLoopPointsForDuration(base, totalDurationMs);
}

export function setBarulhoLoopOverride(instId: LoopLabInstrumentId, spec: BarulhoLoopPointsMs, totalDurationMs?: number, tier?: LoopBankTier): BarulhoLoopPointsMs {
  const clean = sanitizeLoopPointsForDuration(spec, totalDurationMs);
  const map = loadAllLoopLabOverrides();
  map[buildLoopOverrideKey(instId, tier)] = clean;
  writeOverridesMap(map, instId);
  return clean;
}

export function resetBarulhoLoopOverride(instId: LoopLabInstrumentId, tier?: LoopBankTier): void {
  const map = loadAllLoopLabOverrides();
  delete map[buildLoopOverrideKey(instId, tier)];
  writeOverridesMap(map, instId);
}
