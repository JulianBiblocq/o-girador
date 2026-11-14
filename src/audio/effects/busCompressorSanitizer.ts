/**
 * busCompressorSanitizer.ts — Bornage défensif (zéro NaN) des réglages du Compresseur de Bus (< 90 lignes).
 */
import {
  BUS_COMPRESSOR_NUMERIC_KEYS,
  BUS_COMPRESSOR_RANGES,
  DEFAULT_BUS_COMPRESSOR_SETTINGS,
  type BusCompressorArchetypeId,
  type BusCompressorSettings,
} from './busCompressorTypes';
import type { BusCompressorDspParams } from '../worklet/bus-compressor/busCompressorDspState';

const VALID_ARCHETYPES: ReadonlySet<BusCompressorArchetypeId> = new Set<BusCompressorArchetypeId>([
  'alfaias_glue', 'caixas_carpet', 'sementes_control', 'toada_presence', 'custom',
]);

export function clampFinite(value: unknown, min: number, max: number, fallback: number): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return Math.max(min, Math.min(max, fallback));
  return Math.max(min, Math.min(max, n));
}

/** Normalise un objet potentiellement partiel / corrompu (Firestore, import JSON) en réglages valides. */
export function sanitizeBusCompressorSettings(
  raw: Partial<BusCompressorSettings> | null | undefined,
  base: BusCompressorSettings = DEFAULT_BUS_COMPRESSOR_SETTINGS
): BusCompressorSettings {
  const src = raw ?? {};
  const out: BusCompressorSettings = {
    ...base,
    enabled: typeof src.enabled === 'boolean' ? src.enabled : base.enabled,
    archetype: src.archetype && VALID_ARCHETYPES.has(src.archetype) ? src.archetype : base.archetype,
  };
  for (const key of BUS_COMPRESSOR_NUMERIC_KEYS) {
    const [min, max] = BUS_COMPRESSOR_RANGES[key];
    out[key] = clampFinite(src[key], min, max, base[key]);
  }
  return out;
}

/**
 * Fusionne un patch borné sur des réglages courants.
 * Passe `archetype: 'custom'` dès qu'un paramètre fin change hors sélection explicite d'archétype.
 */
export function mergeBusCompressorPatch(
  current: BusCompressorSettings,
  patch: Partial<BusCompressorSettings>
): BusCompressorSettings {
  const next = sanitizeBusCompressorSettings({ ...current, ...patch }, current);
  const explicitArchetype = patch.archetype !== undefined && VALID_ARCHETYPES.has(patch.archetype);
  if (!explicitArchetype) {
    const fineChanged = BUS_COMPRESSOR_NUMERIC_KEYS.some((k) => patch[k] !== undefined && next[k] !== current[k]);
    if (fineChanged) next.archetype = 'custom';
  }
  return next;
}

/** Projection réglages Store -> paramètres DSP (Live Worklet & Bounce hors-ligne partagent la même source). */
export function toBusCompressorDspParams(
  settings: Partial<BusCompressorSettings> | undefined,
  disableFx: boolean
): BusCompressorDspParams {
  const s = sanitizeBusCompressorSettings(settings ?? { enabled: false });
  return {
    enabled: Boolean(settings) && s.enabled, thresholdDb: s.thresholdDb, ratio: s.ratio, attackMs: s.attackMs,
    releaseMs: s.releaseMs, kneeDb: s.kneeDb, sidechainHpfHz: s.sidechainHpfHz, makeupDb: s.makeupDb,
    mixPct: s.mixPct, ecoBypass: disableFx,
  };
}
