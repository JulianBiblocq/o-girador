/**
 * sectionTemperament.ts — Tempérament Automatique Déterministe de Section (« Effet Vraie Troupe ») (< 95 lignes).
 * - Regroupement par rôle d'instrument physique (`instrumentIdx`), indépendant des fûts d'autres rôles liés à un dossier.
 * - Rang 0 (piste maîtresse ou 1re piste du pupitre) : `0.0 ms` d'étalement et `100 %` (`1.0`) du Balanço.
 * - Rang k >= 1 : étalement déterministe sans collision dans `[+2.5 ms, +6.5 ms]` et adhérence Balanço `[0.95, 1.05]`
 *   équilibrée autour de `1.00`, en parité stricte Live Worklet SOA + Main Thread + Bounce WAV.
 */

import { instrumentsConfig } from '../../data';
import { TrackGroup } from '../../types';

export interface SectionTrackTemperament {
  rank: number;
  attackSpreadSec: number;
  balancoAdherence: number;
}

export const NEUTRAL_SECTION_TEMPERAMENT: SectionTrackTemperament = {
  rank: 0,
  attackSpreadSec: 0,
  balancoAdherence: 1.0,
};

const MIN_SPREAD_SEC = 0.0025; // +2.5 ms
const MAX_SPREAD_SEC = 0.0065; // +6.5 ms
const SPREAD_SPAN_SEC = MAX_SPREAD_SEC - MIN_SPREAD_SEC; // 4.0 ms
const GOLDEN_CONJUGATE = 0.6180339887498949;

function hashTrackIdNorm(trackId: number | string): number {
  const s = String(trackId);
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 997) / 997;
}

export function computePartnerTemperament(rank: number, trackId: number | string): SectionTrackTemperament {
  if (rank <= 0) return NEUTRAL_SECTION_TEMPERAMENT;
  const h = hashTrackIdNorm(trackId);

  // Séquence de Weyl (nombre d'or) par rang + micro-signature bornée par trackId -> 0 collision entre partenaires
  const basePos = (rank * GOLDEN_CONJUGATE) % 1;
  const microNudge = (h - 0.5) * 0.05;
  const u = Math.max(0, Math.min(1, basePos + microNudge));
  const attackSpreadSec = Number((MIN_SPREAD_SEC + u * SPREAD_SPAN_SEC).toFixed(6));

  // Modulation équilibrée [0.95 .. 1.05] alternant sous / sur 1.00 selon la parité du rang
  const sign = rank % 2 === 1 ? -1 : 1;
  const mag = 0.016 + (((rank * 0.38196601125 + h * 0.24) % 1) * 0.034); // [0.016 .. 0.050]
  const balancoAdherence = Number(Math.max(0.95, Math.min(1.05, 1.0 + sign * mag)).toFixed(5));

  return { rank, attackSpreadSec, balancoAdherence };
}

export function computeSectionTemperamentMap(tracks: readonly TrackGroup[]): Map<number, SectionTrackTemperament> {
  const map = new Map<number, SectionTrackTemperament>();
  const byInstrumentIdx = new Map<number, TrackGroup[]>();

  for (let i = 0; i < tracks.length; i++) {
    const t = tracks[i];
    if (!t || t.isBusFolder || t.isLinkFolder) continue;
    const numId = Number(t.id);
    if (!Number.isFinite(numId)) continue;
    const inst = instrumentsConfig[t.instrumentIdx];
    if (!inst || inst.type === 'voice') {
      map.set(numId, NEUTRAL_SECTION_TEMPERAMENT);
      continue;
    }
    let group = byInstrumentIdx.get(t.instrumentIdx);
    if (!group) {
      group = [];
      byInstrumentIdx.set(t.instrumentIdx, group);
    }
    group.push(t);
  }

  for (const group of byInstrumentIdx.values()) {
    const masterIdx = group.findIndex((t) => t.isLinkMaster === true);
    const ordered = masterIdx > 0
      ? [group[masterIdx], ...group.slice(0, masterIdx), ...group.slice(masterIdx + 1)]
      : group;

    for (let rank = 0; rank < ordered.length; rank++) {
      const t = ordered[rank];
      map.set(Number(t.id), rank === 0 ? NEUTRAL_SECTION_TEMPERAMENT : computePartnerTemperament(rank, t.id));
    }
  }

  return map;
}

export function resolveTrackSectionTemperament(
  track: TrackGroup | null | undefined,
  tracks?: readonly TrackGroup[]
): SectionTrackTemperament {
  if (!track || track.id === undefined || track.id === null) return NEUTRAL_SECTION_TEMPERAMENT;
  if (!tracks || tracks.length === 0) return NEUTRAL_SECTION_TEMPERAMENT;
  return computeSectionTemperamentMap(tracks).get(Number(track.id)) ?? NEUTRAL_SECTION_TEMPERAMENT;
}
