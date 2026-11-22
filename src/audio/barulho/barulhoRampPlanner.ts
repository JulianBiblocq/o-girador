/**
 * barulhoRampPlanner.ts — Planificateur de rampes musicales multi-pas (`b ... b`, `l ... l` Apito, `/ ... .`)
 * et encodage des coordonnées d'origine `(measureIdx, stepIdx)` pour Barulho (< 120 lignes).
 * - Isolé strictement : `l` n'est considéré comme rampe douce bouclée QUE si `instId === 'apito'` (jamais sur `mineiro`).
 */

export const DEFAULT_BARULHO_FADEIN_SEC = 0.140;
export const DEFAULT_BARULHO_FADEOUT_SEC = 0.450;
export const DEFAULT_BARULHO_DOT_STOP_SEC = 0.035;
export const BARULHO_RETRIGGER_CHOKE_SEC = 0.020;
export const BARULHO_LEGATO_VEL_RAMP_SEC = 0.060;

export interface BarulhoLookaheadPoint {
  trackId: number;
  instId?: string;
  timeSec: number;
  symbol: string;
  velocity: number;
  stepDurationSec?: number;
  originCoord?: number;
  seqId?: number;
}

export interface SoftBarulhoRampSpec {
  rampSec: number;
  targetVelocity: number;
}

export function isSoftLoopLookaheadPoint(pt: Pick<BarulhoLookaheadPoint, 'instId' | 'symbol'>): boolean {
  return pt.symbol === 'b' || (pt.instId === 'apito' && pt.symbol === 'l');
}

export function packBarulhoOriginCoord(
  measureIdx: number,
  stepIdx: number,
  isSecondStroke = false
): number {
  const m = Math.max(0, measureIdx | 0) & 0x7FF;
  const s = Math.max(0, stepIdx | 0) & 0x3F;
  const sub = isSecondStroke ? 1 : 0;
  return ((m << 7) | (s << 1) | sub) + 1;
}

export function resolveSoftBarulhoRampSpec(
  points: readonly BarulhoLookaheadPoint[],
  currentIndex: number
): SoftBarulhoRampSpec {
  const cur = points[currentIndex];
  if (!cur) return { rampSec: DEFAULT_BARULHO_FADEIN_SEC, targetVelocity: 0.7 };

  for (let j = currentIndex + 1; j < points.length; j++) {
    const next = points[j];
    if (next.trackId !== cur.trackId) continue;
    const dt = next.timeSec - cur.timeSec;
    if (dt <= 0.005) continue;
    if (isSoftLoopLookaheadPoint(next)) {
      return {
        rampSec: Math.max(DEFAULT_BARULHO_DOT_STOP_SEC, dt),
        targetVelocity: next.velocity > 0 ? next.velocity : cur.velocity,
      };
    }
    break;
  }

  return { rampSec: DEFAULT_BARULHO_FADEIN_SEC, targetVelocity: cur.velocity };
}

export function resolveSlashFadeOutRampSec(
  points: readonly BarulhoLookaheadPoint[],
  currentIndex: number
): number {
  const cur = points[currentIndex];
  if (!cur) return DEFAULT_BARULHO_FADEOUT_SEC;
  const fallbackSec = cur.instId === 'apito' ? 0.014 : DEFAULT_BARULHO_FADEOUT_SEC;

  for (let j = currentIndex + 1; j < points.length; j++) {
    const next = points[j];
    if (next.trackId !== cur.trackId) continue;
    const dt = next.timeSec - cur.timeSec;
    if (dt <= 0.005) continue;
    if (next.symbol === '/') continue;
    if (isSoftLoopLookaheadPoint(next)) return fallbackSec;
    if (cur.instId === 'apito' && next.symbol !== '.') return 0.014;
    return Math.max(cur.instId === 'apito' ? 0.014 : DEFAULT_BARULHO_DOT_STOP_SEC, dt);
  }

  return fallbackSec;
}

export function findBarulhoLookaheadIndex(
  pts: readonly BarulhoLookaheadPoint[] | undefined,
  trackId: number,
  approxSec: number,
  symbol: string
): number {
  if (!pts) return -1;
  let bestIdx = -1;
  let bestDiff = 0.025;
  for (let i = 0; i < pts.length; i++) {
    const pt = pts[i];
    const diff = Math.abs(pt.timeSec - approxSec);
    if (pt.trackId === trackId && pt.symbol === symbol && diff < bestDiff) {
      bestDiff = diff;
      bestIdx = i;
    }
  }
  return bestIdx;
}
