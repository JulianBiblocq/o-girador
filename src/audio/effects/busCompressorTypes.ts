/**
 * busCompressorTypes.ts — Contrat de types du Compresseur VCA de Bus (Zéro dépendance, < 70 lignes).
 * Partagé entre Store Zustand, Graphe Live (Worklet) et Bounce WAV hors-ligne.
 */

export type BusCompressorArchetypeId =
  | 'alfaias_glue'
  | 'caixas_carpet'
  | 'sementes_control'
  | 'toada_presence'
  | 'custom';

export type BusCompressorPresetArchetypeId = Exclude<BusCompressorArchetypeId, 'custom'>;

export interface BusCompressorSettings {
  /** `false` par défaut : préserve à 100 % le son des morceaux existants. */
  enabled: boolean;
  archetype: BusCompressorArchetypeId;
  /** -40..0 dBFS */
  thresholdDb: number;
  /** 1..10 */
  ratio: number;
  /** 1..50 ms */
  attackMs: number;
  /** 30..400 ms */
  releaseMs: number;
  /** 0..12 dB (défaut 6) */
  kneeDb: number;
  /** 20..250 Hz — filtre passe-haut du seul chemin de détection. */
  sidechainHpfHz: number;
  /** -6..12 dB (défaut 0) */
  makeupDb: number;
  /** 0..100 % (défaut 75) — mix parallèle zéro latence. */
  mixPct: number;
}

export type BusCompressorNumericKey = Exclude<keyof BusCompressorSettings, 'enabled' | 'archetype'>;

export const BUS_COMPRESSOR_RANGES: Readonly<Record<BusCompressorNumericKey, readonly [number, number]>> = {
  thresholdDb: [-40, 0],
  ratio: [1, 10],
  attackMs: [1, 50],
  releaseMs: [30, 400],
  kneeDb: [0, 12],
  sidechainHpfHz: [20, 250],
  makeupDb: [-6, 12],
  mixPct: [0, 100],
};

export const BUS_COMPRESSOR_NUMERIC_KEYS: readonly BusCompressorNumericKey[] = [
  'thresholdDb', 'ratio', 'attackMs', 'releaseMs', 'kneeDb', 'sidechainHpfHz', 'makeupDb', 'mixPct',
];

export const DEFAULT_BUS_COMPRESSOR_SETTINGS: Readonly<BusCompressorSettings> = {
  enabled: false,
  archetype: 'alfaias_glue',
  thresholdDb: -16,
  ratio: 3,
  attackMs: 22,
  releaseMs: 110,
  kneeDb: 6,
  sidechainHpfHz: 115,
  makeupDb: 0,
  mixPct: 75,
};

