/**
 * skinChorusCalculator.ts — Moteur d'Accordage Céleste Symétrique & Proportionnel (« Chœur de Peaux ») (< 115 lignes).
 * - Répartition symétrique fixe sur les N pistes du même rôle PRÉSENTES dans `allTracks` (triées par `track.id`).
 * - Invariance stricte Mute / Solo / Hidden / Tocar Junto : N et le rang ne dépendent jamais de l'état de sourdine.
 * - Verrouillage strict à `0.0 cents` sur `agbe`, `mineiro` et `apito` (et sur $N \le 1$, dont Gonguê unique).
 */

import { instrumentsConfig } from '../../data';
import { TrackGroup } from '../../types';
import { getDrumNaturalBaseHz } from '../../utils/audio/drumFundamentalRegistry';
import { DEFAULT_SIGNATURE_TUNINGS, LutherieDrumRole } from '../../utils/audio/lutherieFactoryPresets';

export const NON_CHORUS_INSTRUMENTS = new Set(['agbe', 'mineiro', 'apito', 'gongue']);

/** Calibrage cible en cents à `chorusAmount = 1.0` (`100 %`) sur la base Do Majeur (Gonguê verrouillé à 0 cent). */
export const SKIN_CHORUS_MAX_CENTS_BY_ROLE: Record<LutherieDrumRole, number> = {
  marcante: 20,
  meiao: 20,
  repique: 19,
  caixa: 16,
  tarol: 16,
  timbal: 18,
  gongue: 0,
};

const ASYMMETRIC_SLOTS_2 = [-0.92, 0.71] as const;
const ASYMMETRIC_SLOTS_3 = [-0.96, -0.11, 0.79] as const;
const ASYMMETRIC_SLOTS_4 = [-1.0, -0.29, 0.41, 0.86] as const;

export function getSymmetricSlotFactor(index: number, totalCount: number): number {
  if (totalCount <= 1 || index < 0 || index >= totalCount) return 0;
  if (totalCount === 2) return ASYMMETRIC_SLOTS_2[index];
  if (totalCount === 3) return ASYMMETRIC_SLOTS_3[index];
  if (totalCount === 4) return ASYMMETRIC_SLOTS_4[index];
  const f = -0.95 + (1.81 * index) / (totalCount - 1);
  return Math.abs(f) < 1e-9 ? 0 : f;
}

export function getRoleReferenceHz(instrumentId: string): number {
  const baseHz = getDrumNaturalBaseHz(instrumentId);
  const sigSt = (DEFAULT_SIGNATURE_TUNINGS as Record<string, number>)[instrumentId] ?? 0;
  return baseHz * Math.pow(2, sigSt / 12);
}

export function computeAdaptiveMaxChorusCents(
  instrumentId: string,
  tuningSemitones: number,
  chorusAmount: number
): number {
  if (NON_CHORUS_INSTRUMENTS.has(instrumentId) || !(instrumentId in SKIN_CHORUS_MAX_CENTS_BY_ROLE)) {
    return 0;
  }
  const safeAmount = Math.max(0, Math.min(1, Number.isFinite(chorusAmount) ? chorusAmount : 0.75));
  if (safeAmount <= 0) return 0;

  const roleMaxCents = SKIN_CHORUS_MAX_CENTS_BY_ROLE[instrumentId as LutherieDrumRole];
  const baseHz = getDrumNaturalBaseHz(instrumentId);
  const liveHz = baseHz * Math.pow(2, (Number(tuningSemitones) || 0) / 12);
  const refHz = getRoleReferenceHz(instrumentId);
  const ratioQuarter = Math.pow(Math.max(10, liveHz) / Math.max(10, refHz), 0.25);
  const freqScale = Math.max(0.72, Math.min(1.25, ratioQuarter));
  return roleMaxCents * freqScale * safeAmount;
}

function resolveTrackRoleId(track: Pick<TrackGroup, 'instrumentIdx'> & { instrumentId?: string }): string {
  if (typeof track.instrumentId === 'string' && track.instrumentId) return track.instrumentId;
  return instrumentsConfig[track.instrumentIdx]?.id ?? '';
}

export function getSortedRoleTracksInRoda(
  instrumentId: string,
  allTracks?: readonly TrackGroup[] | null
): TrackGroup[] {
  if (!allTracks || allTracks.length === 0) return [];
  const matching: TrackGroup[] = [];
  for (let i = 0; i < allTracks.length; i++) {
    const t = allTracks[i];
    if (!t || t.isBusFolder || t.isLinkFolder) continue;
    if (resolveTrackRoleId(t) === instrumentId) matching.push(t);
  }
  matching.sort((a, b) => {
    const na = Number(a.id), nb = Number(b.id);
    if (Number.isFinite(na) && Number.isFinite(nb) && na !== nb) return na - nb;
    return String(a.id).localeCompare(String(b.id));
  });
  return matching;
}

export function computeTrackSkinChorusCents(
  instrumentId: string,
  track: Pick<TrackGroup, 'id' | 'tuning'> | null | undefined,
  allTracks: readonly TrackGroup[] | null | undefined,
  effectiveTuningSemitones: number,
  chorusAmount = 0.75
): number {
  if (!track || track.id === undefined || track.id === null || NON_CHORUS_INSTRUMENTS.has(instrumentId)) {
    return 0;
  }
  const roleTracks = getSortedRoleTracksInRoda(instrumentId, allTracks);
  if (roleTracks.length <= 1) return 0;

  const targetIdStr = String(track.id);
  const idx = roleTracks.findIndex((t) => String(t.id) === targetIdStr);
  if (idx < 0) return 0;

  const slotFactor = getSymmetricSlotFactor(idx, roleTracks.length);
  if (slotFactor === 0) return 0;
  const maxCents = computeAdaptiveMaxChorusCents(instrumentId, effectiveTuningSemitones, chorusAmount);
  const cents = slotFactor * maxCents;
  return Object.is(cents, -0) ? 0 : cents;
}

export interface RoleChorusSpreadSummary {
  instrumentId: string;
  trackCount: number;
  liveHz: number;
  maxCents: number;
  maxHz: number;
}

export function computeRoleChorusSpreadSummary(
  instrumentId: string,
  tuningSemitones: number,
  trackCount: number,
  chorusAmount: number
): RoleChorusSpreadSummary {
  const liveHz = getDrumNaturalBaseHz(instrumentId) * Math.pow(2, (Number(tuningSemitones) || 0) / 12);
  if (trackCount < 2 || NON_CHORUS_INSTRUMENTS.has(instrumentId)) {
    return { instrumentId, trackCount, liveHz, maxCents: 0, maxHz: 0 };
  }
  const maxCents = computeAdaptiveMaxChorusCents(instrumentId, tuningSemitones, chorusAmount);
  const maxHz = liveHz * (Math.pow(2, maxCents / 1200) - 1);
  return { instrumentId, trackCount, liveHz, maxCents, maxHz };
}
