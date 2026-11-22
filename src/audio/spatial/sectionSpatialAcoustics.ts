/**
 * sectionSpatialAcoustics.ts — Traduction acoustique 2D « La Place » Zéro-Phase & Zéro-GC (< 140 lignes).
 * - Fader = 100 % maître du volume (`MAX_CONE_DEPTH_DB = 0`, 0 dB caché sur Y).
 * - Cône de phase constructive strict : `<= 0.40 ms` Caixa/Tarol, `<= 0.80 ms` Alfaias/Timbal/Gonguê, 0 retard lié à Y.
 * - Compensation énergétique `1 / sqrt(N)` à volume nominal + trim individuel `volumeVal` / `panVal` du Mini-Mixeur.
 */
import type { SectionPlayerPlacement, TrackGroup } from '../../types/store.types';
import {
  getMaxSectionPlayers,
  isNeutralDefaultSectionPlayers,
  MAX_SQUAD_DETUNE_CENTS,
  resolveDefaultPlayerDetuneCents,
  SEMENTES_INSTRUMENTS,
  SKIN_DETUNE_INSTRUMENTS,
} from '../../constants/sectionEnsembleLimits';
import { faderPositionToGain } from '../../utils/audio-math/faderMath';

export const MAX_ACOUSTIC_PAN = 0.72;
export const MAX_CONE_DEPTH_DB = 0;
const SEMENTES_ANTI_COMB_SEC = [0, 0.011, 0.019, 0.027, 0.034] as const;
const SNARE_DRUMS = new Set<string>(['caixa', 'tarol']);

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

export function computePlayerDistanceDb(_y: number): number {
  return 0;
}

export function computePlayerCombinedPan(x: number, trackPanVal?: number | null, playerPanVal?: number | null): number {
  const basePct = typeof playerPanVal === 'number' && Number.isFinite(playerPanVal)
    ? clamp(playerPanVal, -100, 100)
    : (clamp(Number.isFinite(x) ? x : 50, 0, 100) - 50) * 2;
  const rawTrim = Number.isFinite(trackPanVal as number) ? Number(trackPanVal) : 0;
  const trimPct = Math.abs(rawTrim) <= 1 && rawTrim !== 0 ? rawTrim * 100 : clamp(rawTrim, -100, 100);
  const combinedPct = clamp(basePct + trimPct, -100, 100);
  return (combinedPct / 100) * MAX_ACOUSTIC_PAN;
}

export function computeConstantPowerPanGains(pan: number): { gainL: number; gainR: number } {
  const theta = (clamp(pan, -MAX_ACOUSTIC_PAN, MAX_ACOUSTIC_PAN) + 1) * (Math.PI * 0.25);
  return { gainL: Math.SQRT2 * Math.cos(theta), gainR: Math.SQRT2 * Math.sin(theta) };
}

export function computeDeterministicStrokeJitterSec(
  trackId: number,
  playerIdx: number,
  stepSeed: number,
  synthesizedCount: number,
  instrumentId?: string
): number {
  if (synthesizedCount <= 1 || playerIdx <= 0) return 0;
  let h = (Math.imul((trackId | 0) + 17, 374761393) ^ Math.imul(playerIdx + 1, 668265263) ^ Math.imul((stepSeed | 0) + 3, 2147483647)) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
  const norm = (instrumentId || '').trim().toLowerCase();
  const maxJitter = SEMENTES_INSTRUMENTS.has(norm) ? 0.0012 : (SNARE_DRUMS.has(norm) ? 0.00006 : 0.00008);
  return ((((h ^ (h >>> 16)) >>> 0) / 4294967295) * 2 - 1) * maxJitter;
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

  const energyComp = synthLimit <= 1 ? 1.0 : 1 / Math.sqrt(synthLimit);
  const isSementes = SEMENTES_INSTRUMENTS.has(normInst);
  const isSkin = SKIN_DETUNE_INSTRUMENTS.has(normInst);
  const maxConeDelaySec = SNARE_DRUMS.has(normInst) ? 0.00032 : 0.00068;

  const players: SectionPlayerAcousticSpec[] = activeSlice.map((p: SectionPlayerPlacement, k: number) => {
    const safeX = clamp(Number.isFinite(p.x) ? p.x : 50, 0, 100);
    const safeY = clamp(Number.isFinite(p.y) ? p.y : 90, 0, 100);
    const pan = computePlayerCombinedPan(safeX, trimPan, p.panVal);
    const { gainL: pL, gainR: pR } = computeConstantPowerPanGains(pan);
    const playerVolGain = typeof p.volumeVal === 'number' && Number.isFinite(p.volumeVal) ? faderPositionToGain(p.volumeVal) : 1.0;
    const gainScalar = playerVolGain * energyComp;
    const baseDelaySec = isSementes && synthLimit >= 2
      ? (SEMENTES_ANTI_COMB_SEC[k] ?? 0.027)
      : (synthLimit > 1 && k > 0 ? (k / (synthLimit - 1)) * maxConeDelaySec : 0);
    const cents = synthLimit <= 1 || !isSkin
      ? 0
      : (typeof p.detuneCents === 'number' && Number.isFinite(p.detuneCents)
        ? clamp(p.detuneCents, -MAX_SQUAD_DETUNE_CENTS, MAX_SQUAD_DETUNE_CENTS)
        : resolveDefaultPlayerDetuneCents(k, synthLimit, normInst));
    return {
      playerIdx: k, x: safeX, y: safeY, pan, distDb: 0, gainScalar,
      gainL: gainScalar * pL, gainR: gainScalar * pR, baseDelaySec,
      detuneCents: cents, pitchMul: cents === 0 ? 1.0 : Math.pow(2, cents / 1200),
    };
  });

  return { isNeutralSolo: false, storedCount, synthesizedCount: synthLimit, energyComp, players };
}
