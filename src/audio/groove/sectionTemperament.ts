/**
 * sectionTemperament.ts — Tempérament Automatique Déterministe de Section Zéro-Phase (< 120 lignes).
 * - Rang 0 (piste maîtresse ou 1re piste du pupitre) : `0.0 ms` d'étalement et `100 %` (`1.0`) du Balanço.
 * - Rang k >= 1 : cône de phase constructive strict sans « fla » (`<= 0.40 ms` sur Caixa/Tarol,
 *   `<= 0.80 ms` sur Alfaias/Timbal/Gonguê, `8..16 ms` sur shakers Sementes), adhérence Balanço `[0.95, 1.05]`.
 */

import { SEMENTES_INSTRUMENTS } from '../../constants/sectionEnsembleLimits';
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

function resolveSpreadWindowSec(instrumentId?: string): { minSec: number; spanSec: number } {
  const norm = (instrumentId || '').trim().toLowerCase();
  if (SEMENTES_INSTRUMENTS.has(norm)) return { minSec: 0.0080, spanSec: 0.0080 };
  if (norm === 'caixa' || norm === 'tarol') return { minSec: 0.00010, spanSec: 0.00028 };
  return { minSec: 0.00018, spanSec: 0.00060 };
}

export function computePartnerTemperament(
  rank: number,
  trackId: number | string,
  instrumentId?: string
): SectionTrackTemperament {
  if (rank <= 0) return NEUTRAL_SECTION_TEMPERAMENT;
  const h = hashTrackIdNorm(trackId);
  const { minSec, spanSec } = resolveSpreadWindowSec(instrumentId);

  // Séquence de Weyl (nombre d'or) par rang + micro-signature bornée par trackId -> 0 collision
  const basePos = (rank * GOLDEN_CONJUGATE) % 1;
  const microNudge = (h - 0.5) * 0.05;
  const u = Math.max(0, Math.min(1, basePos + microNudge));
  const attackSpreadSec = Number((minSec + u * spanSec).toFixed(6));

  const sign = rank % 2 === 1 ? -1 : 1;
  const mag = 0.016 + (((rank * 0.38196601125 + h * 0.24) % 1) * 0.034);
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

  for (const [instIdx, group] of byInstrumentIdx.entries()) {
    const instId = instrumentsConfig[instIdx]?.id;
    const masterIdx = group.findIndex((t) => t.isLinkMaster === true);
    const ordered = masterIdx > 0
      ? [group[masterIdx], ...group.slice(0, masterIdx), ...group.slice(masterIdx + 1)]
      : group;

    for (let rank = 0; rank < ordered.length; rank++) {
      const t = ordered[rank];
      map.set(Number(t.id), rank === 0 ? NEUTRAL_SECTION_TEMPERAMENT : computePartnerTemperament(rank, t.id, instId));
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
