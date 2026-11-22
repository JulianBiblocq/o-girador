/**
 * sectionStagePresets.ts — Géométrie polaire 140° et dispositions rapides en 1 clic pour « La Place » (< 130 lignes).
 */
import type { SectionPlayerPlacement } from '../types/store.types';
import {
  getMaxSectionPlayers, isNeutralDefaultSectionPlayers, resolveDefaultPlayerDetuneCents,
} from '../constants/sectionEnsembleLimits';
import { computePlayerCombinedPan, MAX_ACOUSTIC_PAN } from '../audio/spatial/sectionSpatialAcoustics';
import { CONE_MAX_RAD, CONE_MIN_RAD } from '../components/wizard/wizardStageGeometry';
import { faderPositionToDb } from './audio-math/faderMath';

export type SectionStageLayoutPreset = 'arc' | 'column' | 'quincunx';

const ROLE_DEFAULT_ANCHOR: Readonly<Record<string, { x: number; y: number }>> = {
  marcante: { x: 36, y: 40 }, meiao: { x: 50, y: 36 }, repique: { x: 64, y: 40 },
  caixa: { x: 42, y: 56 }, tarol: { x: 58, y: 56 }, gongue: { x: 50, y: 76 },
  agbe: { x: 36, y: 70 }, mineiro: { x: 64, y: 70 }, timbal: { x: 44, y: 74 },
};

export function clampNormalizedPointToCone(rawX: number, rawY: number, boxW = 248, boxH = 184): { x: number; y: number } {
  const pxX = (Math.max(0, Math.min(100, rawX)) / 100) * boxW, pxY = (Math.max(0, Math.min(100, rawY)) / 100) * boxH;
  const u = pxX - boxW * 0.5, v = boxH - pxY;
  const theta = v < 0 ? (u >= 0 ? CONE_MIN_RAD : CONE_MAX_RAD) : Math.max(CONE_MIN_RAD, Math.min(CONE_MAX_RAD, Math.atan2(v, u)));
  const r = Math.max(18, Math.min(boxH * 0.94, Math.hypot(u, v)));
  const outX = ((r * Math.cos(theta) + boxW * 0.5) / boxW) * 100, outY = ((boxH - r * Math.sin(theta)) / boxH) * 100;
  return { x: Math.round(Math.max(4, Math.min(96, outX)) * 10) / 10, y: Math.round(Math.max(6, Math.min(94, outY)) * 10) / 10 };
}

export function buildSectionPresetLayout(
  preset: SectionStageLayoutPreset, count: number, instrumentId: string,
  existingIds?: readonly string[], existingPlayers?: readonly SectionPlayerPlacement[]
): SectionPlayerPlacement[] {
  const n = Math.max(1, Math.min(getMaxSectionPlayers(instrumentId), count));
  const anchor = ROLE_DEFAULT_ANCHOR[instrumentId] || { x: 50, y: 56 };

  return Array.from({ length: n }, (_, k) => {
    let rawX = anchor.x, rawY = anchor.y;
    if (n === 1) {
      rawX = preset === 'column' ? 50 : anchor.x;
      rawY = preset === 'column' ? 76 : anchor.y;
    } else if (preset === 'arc') {
      const spanRad = Math.min((Math.PI * 2) / 3, 0.38 * n), theta = Math.PI * 0.5 + spanRad * (0.5 - k / (n - 1));
      const radiusPct = Math.max(42, Math.min(78, 100 - anchor.y));
      rawX = 50 + radiusPct * 0.85 * Math.cos(theta);
      rawY = 100 - radiusPct * Math.sin(theta);
    } else if (preset === 'column') {
      rawX = 50; rawY = 84 - (k / (n - 1)) * Math.min(56, (n - 1) * 15);
    } else {
      rawX = 50 + (k % 2 === 0 ? -1 : 1) * (14 + Math.floor(k / 2) * 4);
      rawY = 82 - k * 13;
    }
    const pt = clampNormalizedPointToCone(rawX, rawY), prevVol = existingPlayers?.[k]?.volumeVal;
    return {
      id: existingIds?.[k] || `${instrumentId}_p${k + 1}`, x: pt.x, y: pt.y,
      panVal: Math.max(-100, Math.min(100, Math.round((pt.x - 50) * 2))),
      ...(typeof prevVol === 'number' && Number.isFinite(prevVol) ? { volumeVal: prevVol } : {}),
      detuneCents: resolveDefaultPlayerDetuneCents(k, n, instrumentId),
    };
  });
}

export function resizeSectionPlayers(
  current: readonly SectionPlayerPlacement[] | undefined, targetCount: number, instrumentId: string
): SectionPlayerPlacement[] | undefined {
  const nextCount = Math.max(1, Math.min(getMaxSectionPlayers(instrumentId), targetCount));
  if (nextCount === 1) {
    if (!current || current.length === 0 || isNeutralDefaultSectionPlayers(current)) return undefined;
    const p0 = current[0];
    return [{
      id: p0.id || `${instrumentId}_p1`, x: p0.x, y: p0.y, detuneCents: 0,
      ...(p0.volumeVal !== undefined ? { volumeVal: p0.volumeVal } : {}),
      ...(p0.panVal !== undefined ? { panVal: p0.panVal } : {}),
    }];
  }
  if (!current || current.length === 0 || isNeutralDefaultSectionPlayers(current)) {
    return buildSectionPresetLayout('arc', nextCount, instrumentId);
  }
  if (nextCount <= current.length) {
    return current.slice(0, nextCount).map((p, idx) => ({ ...p, detuneCents: resolveDefaultPlayerDetuneCents(idx, nextCount, instrumentId) }));
  }
  const arcFallback = buildSectionPresetLayout('arc', nextCount, instrumentId);
  return Array.from({ length: nextCount }, (_, idx) => {
    const base = current[idx] ?? arcFallback[idx];
    return { ...base, id: base.id || `${instrumentId}_p${idx + 1}`, detuneCents: resolveDefaultPlayerDetuneCents(idx, nextCount, instrumentId) };
  });
}

export function formatPlayerAcousticReadout(
  x: number, _y: number, trackPanVal?: number | null, playerVolVal?: number, playerPanVal?: number, lang = 'pt'
): string {
  const pan = computePlayerCombinedPan(x, trackPanVal, playerPanVal);
  const pct = Math.round(Math.abs(pan / MAX_ACOUSTIC_PAN) * 100);
  const leftPrefix = lang === 'fr' ? 'G' : 'E';
  const panStr = pct <= 2 ? 'C' : pan < 0 ? `${leftPrefix}${pct}` : `D${pct}`;
  const db = faderPositionToDb(playerVolVal ?? 75);
  return `${panStr} • ${!Number.isFinite(db) ? '-∞' : `${db >= 0 ? '+' : ''}${db.toFixed(1)} dB`}`;
}
