/**
 * sectionEnsembleLimits.ts — Quotas officiels d'escouade spatiale par piste (« La Place ») (< 100 lignes).
 * - `marcante` : 1..5 joueurs.
 * - `meiao`, `repique`, `caixa`, `tarol`, `timbal`, `gongue`, `agbe`, `mineiro` : 1..4 joueurs.
 * - `apito` et pistes `voice` (`puxador`, `coro`, `toada`) : 1 joueur max (pas de multiplication).
 */
import type { SectionPlayerPlacement } from '../types/store.types';

export const MAX_SECTION_PLAYERS = 5;

export const SECTION_ENSEMBLE_LIMITS: Readonly<Record<string, number>> = {
  marcante: 5,
  meiao: 4,
  repique: 4,
  caixa: 4,
  tarol: 4,
  timbal: 4,
  gongue: 4,
  agbe: 4,
  mineiro: 4,
  apito: 1,
  puxador: 1,
  coro: 1,
  toada: 1,
};

export const SKIN_DETUNE_INSTRUMENTS = new Set<string>([
  'marcante',
  'meiao',
  'repique',
  'caixa',
  'tarol',
  'timbal',
]);

export const SEMENTES_INSTRUMENTS = new Set<string>(['agbe', 'mineiro']);

export const DEFAULT_SOLO_PLAYER_PLACEMENT: Readonly<SectionPlayerPlacement> = {
  id: 'p1',
  x: 50,
  y: 90,
  detuneCents: 0,
};

const DETUNE_SPREAD_BY_COUNT: Readonly<Record<number, readonly number[]>> = {
  1: [0],
  2: [-3, 3],
  3: [-4, 0, 4],
  4: [-5, -2, 2, 5],
  5: [-6, -2, 0, 3, 6],
};

export function getMaxSectionPlayers(
  instrumentId?: string | null,
  instrumentType?: string | null
): number {
  const normId = (instrumentId || '').trim().toLowerCase();
  const normType = (instrumentType || '').trim().toLowerCase();
  if (normType === 'voice' || normId === 'puxador' || normId === 'coro' || normId === 'toada' || normId === 'apito') {
    return 1;
  }
  return SECTION_ENSEMBLE_LIMITS[normId] ?? 1;
}

export function isSectionEnsembleEligible(
  instrumentId?: string | null,
  instrumentType?: string | null
): boolean {
  return getMaxSectionPlayers(instrumentId, instrumentType) > 1;
}

export function resolveDefaultPlayerDetuneCents(
  playerIdx: number,
  totalPlayers: number,
  instrumentId?: string | null
): number {
  if (totalPlayers <= 1) return 0;
  const normId = (instrumentId || '').trim().toLowerCase();
  if (normId && !SKIN_DETUNE_INSTRUMENTS.has(normId)) return 0;
  const clampedCount = Math.max(1, Math.min(MAX_SECTION_PLAYERS, totalPlayers));
  const table = DETUNE_SPREAD_BY_COUNT[clampedCount] || DETUNE_SPREAD_BY_COUNT[5];
  return table[Math.max(0, Math.min(table.length - 1, playerIdx))] ?? 0;
}

export function isNeutralDefaultSectionPlayers(
  players?: readonly SectionPlayerPlacement[] | null
): boolean {
  if (!players || players.length === 0) return true;
  if (players.length > 1) return false;
  const p = players[0];
  return (
    Math.abs((Number.isFinite(p.x) ? p.x : 50) - 50) < 0.05 &&
    Math.abs((Number.isFinite(p.y) ? p.y : 90) - 90) < 0.05 &&
    (!p.detuneCents || Math.abs(p.detuneCents) < 0.05)
  );
}

export function sanitizeSectionPlayers(
  players: readonly SectionPlayerPlacement[] | undefined | null,
  instrumentId?: string | null,
  instrumentType?: string | null
): SectionPlayerPlacement[] | undefined {
  if (!players || !Array.isArray(players) || players.length === 0) return undefined;
  const maxN = getMaxSectionPlayers(instrumentId, instrumentType);
  if (maxN <= 1) return undefined;
  const sliced = players.slice(0, maxN);
  return sliced.map((p, idx) => ({
    id: typeof p.id === 'string' && p.id.trim() ? p.id : `p${idx + 1}`,
    x: Math.max(0, Math.min(100, Number.isFinite(p.x) ? p.x : 50)),
    y: Math.max(0, Math.min(100, Number.isFinite(p.y) ? p.y : 90)),
    detuneCents: typeof p.detuneCents === 'number' && Number.isFinite(p.detuneCents)
      ? (sliced.length <= 1 ? 0 : Math.max(-12, Math.min(12, p.detuneCents)))
      : resolveDefaultPlayerDetuneCents(idx, sliced.length, instrumentId),
  }));
}
