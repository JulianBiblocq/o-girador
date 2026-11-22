/**
 * sectionSpatialAcoustics.ts — Traduction acoustique 2D « La Place » Zéro-GC (< 130 lignes).
 * Parité stricte Worklet SOA + Fallback Web Audio + Export WAV Offline.
 */
import type { SectionPlayerPlacement, TrackGroup } from '../../types/store.types';
import {
  getMaxSectionPlayers,
  isNeutralDefaultSectionPlayers,
  resolveDefaultPlayerDetuneCents,
  SEMENTES_INSTRUMENTS,
  SKIN_DETUNE_INSTRUMENTS,
} from '../../constants/sectionEnsembleLimits';

export const MAX_ACOUSTIC_PAN = 0.72;
export const MAX_CONE_DEPTH_DB = -8.5;
const SEMENTES_ANTI_COMB_SEC = [0, 0.011, 0.019, 0.027, 0.034] as const;

export interface SectionPlayerAcousticSpec {
  playerIdx: number;
  x: number;
  y: number;
  pan: number;
  distDb: number;
  gainScalar: number;
  gainL: number;
  gainR: number;
  baseDelaySec: number;
  detuneCents: number;
  pitchMul: number;
}

export interface SectionSpatialProfile {
  isNeutralSolo: boolean;
  storedCount: number;
  synthesizedCount: number;
  energyComp: number;
  players: SectionPlayerAcousticSpec[];
}

const clamp = (v: number, lo: number, hi: number): number => (v < lo ? lo : v > hi ? hi : v);

export function computePlayerDistanceDb(y: number): number {
  const safeY = clamp(Number.isFinite(y) ? y : 90, 0, 100);
  return safeY >= 95 ? 0 : MAX_CONE_DEPTH_DB * ((95 - safeY) / 95);
}

export function computePlayerCombinedPan(x: number, trackPanVal?: number | null): number {
  const safeX = clamp(Number.isFinite(x) ? x : 50, 0, 100);
  const xPan = ((safeX - 50) / 50) * MAX_ACOUSTIC_PAN;
  const rawTrim = Number.isFinite(trackPanVal as number) ? Number(trackPanVal) : 0;
  const normTrim = Math.abs(rawTrim) <= 1 && rawTrim !== 0 ? rawTrim : clamp(rawTrim, -100, 100) / 100;
  return clamp(xPan + normTrim * MAX_ACOUSTIC_PAN, -MAX_ACOUSTIC_PAN, MAX_ACOUSTIC_PAN);
}

export function computeConstantPowerPanGains(pan: number): { gainL: number; gainR: number } {
  const theta = (clamp(pan, -MAX_ACOUSTIC_PAN, MAX_ACOUSTIC_PAN) + 1) * (Math.PI * 0.25);
  return { gainL: Math.SQRT2 * Math.cos(theta), gainR: Math.SQRT2 * Math.sin(theta) };
}

export function computeDeterministicStrokeJitterSec(
  trackId: number,
  playerIdx: number,
  stepSeed: number,
  synthesizedCount: number
): number {
  if (synthesizedCount <= 1) return 0;
  let h = (Math.imul((trackId | 0) + 17, 374761393) ^ Math.imul(playerIdx + 1, 668265263) ^ Math.imul((stepSeed | 0) + 3, 2147483647)) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
  return ((((h ^ (h >>> 16)) >>> 0) / 4294967295) * 2 - 1) * 0.0025;
}

export function resolveTrackSectionSpatialProfile(
  track: Pick<TrackGroup, 'sectionPlayers' | 'panVal' | 'pan'> | null | undefined,
  instrumentId: string,
  isEcoMode = false,
  panValOverride?: number | null
): SectionSpatialProfile {
  const normInst = (instrumentId || '').trim().toLowerCase();
  const maxAllowed = getMaxSectionPlayers(normInst);
  const rawPlayers = track?.sectionPlayers;

  if (maxAllowed <= 1 || isNeutralDefaultSectionPlayers(rawPlayers)) {
    return {
      isNeutralSolo: true, storedCount: 1, synthesizedCount: 1, energyComp: 1.0,
      players: [{ playerIdx: 0, x: 50, y: 90, pan: 0, distDb: 0, gainScalar: 1, gainL: 1, gainR: 1, baseDelaySec: 0, detuneCents: 0, pitchMul: 1 }],
    };
  }

  const bounded = rawPlayers!.slice(0, maxAllowed);
  const storedCount = bounded.length;
  const synthLimit = isEcoMode ? Math.min(storedCount, 2) : storedCount;
  const activeSlice = bounded.slice(0, synthLimit);
  const trimPan = panValOverride !== undefined ? panValOverride : (track?.panVal ?? track?.pan ?? 0);

  const rawGains = new Float64Array(synthLimit);
  let maxG = 0;
  for (let k = 0; k < synthLimit; k++) {
    const g = Math.pow(10, computePlayerDistanceDb(activeSlice[k].y) / 20);
    rawGains[k] = g;
    if (g > maxG) maxG = g;
  }

  let normSumSq = 0;
  const denom = maxG > 1e-6 ? maxG : 1;
  for (let k = 0; k < synthLimit; k++) { const w = rawGains[k] / denom; normSumSq += w * w; }
  const energyComp = synthLimit <= 1 ? 1.0 : 1 / Math.pow(Math.max(1, normSumSq), 0.38);
  const isSementes = SEMENTES_INSTRUMENTS.has(normInst), isSkin = SKIN_DETUNE_INSTRUMENTS.has(normInst);

  const players: SectionPlayerAcousticSpec[] = activeSlice.map((p, k) => {
    const safeX = clamp(Number.isFinite(p.x) ? p.x : 50, 0, 100), safeY = clamp(Number.isFinite(p.y) ? p.y : 90, 0, 100);
    const distDb = computePlayerDistanceDb(safeY), pan = computePlayerCombinedPan(safeX, trimPan);
    const { gainL: pL, gainR: pR } = computeConstantPowerPanGains(pan);
    const gainScalar = rawGains[k] * energyComp, depthRatio = safeY >= 95 ? 0 : (100 - safeY) / 100;
    const baseDelaySec = isSementes && synthLimit >= 2
      ? (SEMENTES_ANTI_COMB_SEC[k] ?? 0.027) + depthRatio * 0.008
      : depthRatio * 0.011 + (synthLimit > 1 && k > 0 ? (k / (synthLimit - 1)) * 0.004 : 0);
    const cents = synthLimit <= 1 || !isSkin ? 0 : (typeof p.detuneCents === 'number' && Number.isFinite(p.detuneCents) ? clamp(p.detuneCents, -12, 12) : resolveDefaultPlayerDetuneCents(k, synthLimit, normInst));
    return {
      playerIdx: k, x: safeX, y: safeY, pan, distDb, gainScalar,
      gainL: gainScalar * pL, gainR: gainScalar * pR, baseDelaySec,
      detuneCents: cents, pitchMul: cents === 0 ? 1.0 : Math.pow(2, cents / 1200),
    };
  });

  return { isNeutralSolo: false, storedCount, synthesizedCount: synthLimit, energyComp, players };
}
