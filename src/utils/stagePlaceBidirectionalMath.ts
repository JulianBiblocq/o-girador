/**
 * stagePlaceBidirectionalMath.ts — Miroir mathématique 1:1 `Console (Fader dB, Pan)` <-> `La Place 140°`
 * & Bulle d'Espace Vital anti-superposition (repos non-mutatif + répulsion douce au glisser) (< 128 lignes).
 */
import { CONE_MAX_RAD, CONE_MIN_RAD, CONE_SPAN_RAD } from '../components/wizard/wizardStageGeometry';
import { dbToFaderPosition, faderPositionToDb } from './audio-math/faderMath';

export const STAGE_MIN_DB = -18.0;
export const STAGE_MAX_DB = 6.0;
export const STAGE_MIN_RADIUS_NORM = 0.22;
export const STAGE_MAX_RADIUS_NORM = 0.94;
export const STAGE_ZERO_DB_RADIUS_NORM =
  STAGE_MIN_RADIUS_NORM + ((STAGE_MAX_DB - 0) / (STAGE_MAX_DB - STAGE_MIN_DB)) * (STAGE_MAX_RADIUS_NORM - STAGE_MIN_RADIUS_NORM);

const clamp = (v: number, lo: number, hi: number): number => (v < lo ? lo : v > hi ? hi : v);

export function panValToStageThetaRad(panVal: number): number {
  return Math.PI * 0.5 - (clamp(Number.isFinite(panVal) ? panVal : 0, -100, 100) / 100) * (CONE_SPAN_RAD * 0.5);
}

export function stageThetaRadToPanVal(thetaRad: number): number {
  const rawPan = ((Math.PI * 0.5 - clamp(thetaRad, CONE_MIN_RAD, CONE_MAX_RAD)) / (CONE_SPAN_RAD * 0.5)) * 100;
  const rounded = Math.round(clamp(rawPan, -100, 100));
  return Math.abs(rounded) <= 1 ? 0 : rounded;
}

export function dbToStageRadiusNorm(db: number): number {
  if (!Number.isFinite(db) || db <= STAGE_MIN_DB) return STAGE_MAX_RADIUS_NORM;
  const t = (STAGE_MAX_DB - clamp(db, STAGE_MIN_DB, STAGE_MAX_DB)) / (STAGE_MAX_DB - STAGE_MIN_DB);
  return STAGE_MIN_RADIUS_NORM + t * (STAGE_MAX_RADIUS_NORM - STAGE_MIN_RADIUS_NORM);
}

export function stageRadiusNormToDb(radiusNorm: number): number {
  const t = (clamp(radiusNorm, STAGE_MIN_RADIUS_NORM, STAGE_MAX_RADIUS_NORM) - STAGE_MIN_RADIUS_NORM) / (STAGE_MAX_RADIUS_NORM - STAGE_MIN_RADIUS_NORM);
  return Number((STAGE_MAX_DB - t * (STAGE_MAX_DB - STAGE_MIN_DB)).toFixed(2));
}

export function mixParamsToStagePointPx(panVal: number, faderDb: number, widthPx: number, heightPx: number) {
  const thetaRad = panValToStageThetaRad(panVal), radiusNorm = dbToStageRadiusNorm(faderDb), rPx = radiusNorm * heightPx;
  return { pxX: widthPx * 0.5 + rPx * Math.cos(thetaRad), pxY: heightPx - rPx * Math.sin(thetaRad), radiusNorm, thetaRad };
}

export function stagePointPxToMixParams(
  pxX: number, pxY: number, widthPx: number, heightPx: number,
  locks?: { lockPan?: boolean; lockedPanVal?: number; lockVol?: boolean; lockedFaderDb?: number }
) {
  const u = pxX - widthPx * 0.5, v = heightPx - pxY;
  let theta = v < 0 ? (u >= 0 ? CONE_MIN_RAD : CONE_MAX_RAD) : clamp(Math.atan2(v, u), CONE_MIN_RAD, CONE_MAX_RAD);
  let rNorm = clamp(Math.hypot(u, v) / Math.max(1, heightPx), STAGE_MIN_RADIUS_NORM, STAGE_MAX_RADIUS_NORM);
  if (locks?.lockPan && typeof locks.lockedPanVal === 'number') theta = panValToStageThetaRad(locks.lockedPanVal);
  if (locks?.lockVol && typeof locks.lockedFaderDb === 'number') rNorm = dbToStageRadiusNorm(locks.lockedFaderDb);
  const panVal = locks?.lockPan && typeof locks.lockedPanVal === 'number' ? locks.lockedPanVal : stageThetaRadToPanVal(theta);
  const faderDb = locks?.lockVol && typeof locks.lockedFaderDb === 'number' ? locks.lockedFaderDb : stageRadiusNormToDb(rNorm);
  const faderPos = Number(dbToFaderPosition(faderDb).toFixed(2)), rPx = rNorm * heightPx;
  return { panVal, faderDb, faderPos, pxX: widthPx * 0.5 + rPx * Math.cos(theta), pxY: heightPx - rPx * Math.sin(theta) };
}

export function clampPixelToStageCone(pxX: number, pxY: number, widthPx: number, heightPx: number) {
  const u = pxX - widthPx * 0.5, v = heightPx - pxY;
  const theta = v < 0 ? (u >= 0 ? CONE_MIN_RAD : CONE_MAX_RAD) : clamp(Math.atan2(v, u), CONE_MIN_RAD, CONE_MAX_RAD);
  const rPx = clamp(Math.hypot(u, v), STAGE_MIN_RADIUS_NORM * heightPx, STAGE_MAX_RADIUS_NORM * heightPx);
  return { pxX: widthPx * 0.5 + rPx * Math.cos(theta), pxY: heightPx - rPx * Math.sin(theta) };
}

export function resolveRestVisualPositions<T extends { id: string; pxX: number; pxY: number }>(
  pawns: readonly T[], minSepPx: number, widthPx: number, heightPx: number
): Array<T & { visualX: number; visualY: number }> {
  const pts = pawns.map((p) => ({ ...p, visualX: p.pxX, visualY: p.pxY }));
  if (pts.length <= 1 || minSepPx <= 0) return pts;
  for (let pass = 0; pass < 8; pass++) {
    for (let i = 0; i < pts.length; i++) {
      for (let j = i + 1; j < pts.length; j++) {
        let dx = pts[j].visualX - pts[i].visualX, dy = pts[j].visualY - pts[i].visualY, dist = Math.hypot(dx, dy);
        if (dist >= minSepPx) continue;
        if (dist < 0.5) {
          const a = ((j - i) * 2.3999632) % (Math.PI * 2);
          dx = Math.cos(a); dy = Math.sin(a) * 0.45; dist = Math.hypot(dx, dy);
        }
        const push = (minSepPx - dist) * 0.52, nx = dx / dist, ny = dy / dist;
        const ci = clampPixelToStageCone(pts[i].visualX - nx * push, pts[i].visualY - ny * push, widthPx, heightPx);
        const cj = clampPixelToStageCone(pts[j].visualX + nx * push, pts[j].visualY + ny * push, widthPx, heightPx);
        pts[i].visualX = ci.pxX; pts[i].visualY = ci.pxY; pts[j].visualX = cj.pxX; pts[j].visualY = cj.pxY;
      }
    }
  }
  return pts;
}

export function repelDraggedPawnFromNeighbors(
  targetX: number, targetY: number, neighbors: ReadonlyArray<{ pxX: number; pxY: number }>,
  minSepPx: number, widthPx: number, heightPx: number
): { pxX: number; pxY: number } {
  let x = targetX, y = targetY;
  for (let pass = 0; pass < 3; pass++) {
    for (const n of neighbors) {
      let dx = x - n.pxX, dy = y - n.pxY, d = Math.hypot(dx, dy);
      if (d >= minSepPx) continue;
      if (d < 0.5) { dx = x >= widthPx * 0.5 ? 1 : -1; dy = -0.25; d = Math.hypot(dx, dy); }
      const push = minSepPx - d;
      x += (dx / d) * push; y += (dy / d) * push;
    }
    const c = clampPixelToStageCone(x, y, widthPx, heightPx);
    x = c.pxX; y = c.pxY;
  }
  return { pxX: x, pxY: y };
}

export function faderPosToClampedStageDb(faderPos: number): number {
  const db = faderPositionToDb(faderPos);
  return !Number.isFinite(db) ? STAGE_MIN_DB : clamp(db, STAGE_MIN_DB, STAGE_MAX_DB);
}
