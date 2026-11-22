/**
 * sectionStagePresets.ts — Géométrie polaire 120° et dispositions rapides en 1 clic pour « La Place » (< 120 lignes).
 */
import type { SectionPlayerPlacement } from '../types/store.types';
import {
  getMaxSectionPlayers,
  isNeutralDefaultSectionPlayers,
  resolveDefaultPlayerDetuneCents,
} from '../constants/sectionEnsembleLimits';
import { computePlayerCombinedPan, computePlayerDistanceDb } from '../audio/spatial/sectionSpatialAcoustics';

export type SectionStageLayoutPreset = 'arc' | 'column' | 'quincunx';

const ROLE_DEFAULT_ANCHOR: Readonly<Record<string, { x: number; y: number }>> = {
  marcante: { x: 36, y: 40 },
  meiao: { x: 50, y: 36 },
  repique: { x: 64, y: 40 },
  caixa: { x: 42, y: 56 },
  tarol: { x: 58, y: 56 },
  gongue: { x: 50, y: 76 },
  agbe: { x: 36, y: 70 },
  mineiro: { x: 64, y: 70 },
  timbal: { x: 44, y: 74 },
};

export function clampNormalizedPointToCone(
  rawX: number,
  rawY: number,
  boxW = 248,
  boxH = 184
): { x: number; y: number } {
  const pxX = (Math.max(0, Math.min(100, rawX)) / 100) * boxW;
  const pxY = (Math.max(0, Math.min(100, rawY)) / 100) * boxH;
  const u = pxX - boxW * 0.5;
  const v = boxH - pxY;
  let r = Math.hypot(u, v);
  let theta = Math.atan2(v, u);
  if (v < 0) theta = u >= 0 ? Math.PI / 6 : (5 * Math.PI) / 6;
  else theta = Math.max(Math.PI / 6, Math.min((5 * Math.PI) / 6, theta));
  r = Math.max(18, Math.min(boxH * 0.94, r));
  const outX = ((r * Math.cos(theta) + boxW * 0.5) / boxW) * 100;
  const outY = ((boxH - r * Math.sin(theta)) / boxH) * 100;
  return {
    x: Math.round(Math.max(4, Math.min(96, outX)) * 10) / 10,
    y: Math.round(Math.max(6, Math.min(94, outY)) * 10) / 10,
  };
}

export function buildSectionPresetLayout(
  preset: SectionStageLayoutPreset,
  count: number,
  instrumentId: string,
  existingIds?: readonly string[]
): SectionPlayerPlacement[] {
  const maxN = getMaxSectionPlayers(instrumentId);
  const n = Math.max(1, Math.min(maxN, count));
  const anchor = ROLE_DEFAULT_ANCHOR[instrumentId] || { x: 50, y: 56 };

  return Array.from({ length: n }, (_, k) => {
    let rawX = anchor.x;
    let rawY = anchor.y;

    if (n === 1) {
      rawX = preset === 'column' ? 50 : anchor.x;
      rawY = preset === 'column' ? 76 : anchor.y;
    } else if (preset === 'arc') {
      const spanRad = Math.min((Math.PI * 5) / 9, 0.34 * n);
      const t = n === 1 ? 0.5 : k / (n - 1);
      const theta = Math.PI * 0.5 + spanRad * (0.5 - t);
      const radiusPct = Math.max(42, Math.min(78, 100 - anchor.y));
      rawX = 50 + radiusPct * 0.82 * Math.cos(theta);
      rawY = 100 - radiusPct * Math.sin(theta);
    } else if (preset === 'column') {
      const t = k / (n - 1);
      rawX = 50;
      rawY = 84 - t * Math.min(56, (n - 1) * 15);
    } else {
      // Quinconce rue : rangs décalés gauche / droite du cortège
      const side = k % 2 === 0 ? -1 : 1;
      const spreadX = 13 + Math.floor(k / 2) * 3;
      rawX = 50 + side * spreadX;
      rawY = 82 - k * 13;
    }

    const pt = clampNormalizedPointToCone(rawX, rawY);
    return {
      id: existingIds?.[k] || `${instrumentId}_p${k + 1}`,
      x: pt.x,
      y: pt.y,
      detuneCents: resolveDefaultPlayerDetuneCents(k, n, instrumentId),
    };
  });
}

export function resizeSectionPlayers(
  current: readonly SectionPlayerPlacement[] | undefined,
  targetCount: number,
  instrumentId: string
): SectionPlayerPlacement[] | undefined {
  const maxN = getMaxSectionPlayers(instrumentId);
  const nextCount = Math.max(1, Math.min(maxN, targetCount));

  if (nextCount === 1) {
    if (!current || current.length === 0 || isNeutralDefaultSectionPlayers(current)) return undefined;
    return [{ id: current[0].id || `${instrumentId}_p1`, x: current[0].x, y: current[0].y, detuneCents: 0 }];
  }

  if (!current || current.length === 0 || isNeutralDefaultSectionPlayers(current)) {
    return buildSectionPresetLayout('arc', nextCount, instrumentId);
  }

  if (nextCount <= current.length) {
    return current.slice(0, nextCount).map((p, idx) => ({
      ...p,
      detuneCents: resolveDefaultPlayerDetuneCents(idx, nextCount, instrumentId),
    }));
  }

  const arcFallback = buildSectionPresetLayout('arc', nextCount, instrumentId);
  return Array.from({ length: nextCount }, (_, idx) => {
    const base = current[idx] ?? arcFallback[idx];
    return {
      id: base.id || `${instrumentId}_p${idx + 1}`,
      x: base.x,
      y: base.y,
      detuneCents: resolveDefaultPlayerDetuneCents(idx, nextCount, instrumentId),
    };
  });
}

export function formatPlayerAcousticReadout(x: number, y: number, trackPanVal?: number | null): string {
  const pan = computePlayerCombinedPan(x, trackPanVal);
  const db = computePlayerDistanceDb(y);
  const pct = Math.round(Math.abs(pan / 0.72) * 100);
  const panStr = pct <= 2 ? 'C' : pan < 0 ? `L${pct}` : `R${pct}`;
  const dbStr = db >= -0.05 ? '0.0 dB' : `${db.toFixed(1)} dB`;
  return `${panStr} • ${dbStr}`;
}
