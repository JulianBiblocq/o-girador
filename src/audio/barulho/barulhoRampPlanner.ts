/**
 * barulhoRampPlanner.ts — Planificateur de rampes musicales multi-pas (`b ... b`, `/ ... .`)
 * et encodage des coordonnées d'origine `(measureIdx, stepIdx)` pour Barulho (< 120 lignes).
 */

export const DEFAULT_BARULHO_FADEIN_SEC = 0.140;
export const DEFAULT_BARULHO_FADEOUT_SEC = 0.450;
export const DEFAULT_BARULHO_DOT_STOP_SEC = 0.035;
export const BARULHO_RETRIGGER_CHOKE_SEC = 0.020;
export const BARULHO_LEGATO_VEL_RAMP_SEC = 0.060;

export interface BarulhoLookaheadPoint {
  trackId: number;
  timeSec: number;
  symbol: string;
  velocity: number;
}

export interface SoftBarulhoRampSpec {
  rampSec: number;
  targetVelocity: number;
}

/**
 * Encode de manière injective (> 0, sans perte en Float32) la position `(measureIdx, stepIdx, isSecondStroke)`
 * afin de distinguer le rebouclage d'une mesure sur le même pas `B` d'un 2e `B` volontaire ailleurs.
 */
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

/**
 * Pour un `b` à l'index `currentIndex` :
 * - S'il est suivi d'un 2e `b` sur la même piste (même mesure ou mesure suivante),
 *   étire le Fade-In sur la durée exacte `nextTimeSec - currentTimeSec` vers la vélocité cible du 2e `b`.
 * - Sinon, utilise le Fade-In par défaut (`140 ms`).
 */
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
    if (next.symbol === 'b') {
      return {
        rampSec: Math.max(DEFAULT_BARULHO_DOT_STOP_SEC, dt),
        targetVelocity: next.velocity > 0 ? next.velocity : cur.velocity,
      };
    }
    break;
  }

  return { rampSec: DEFAULT_BARULHO_FADEIN_SEC, targetVelocity: cur.velocity };
}

/**
 * Pour un `/` à l'index `currentIndex` :
 * - S'il est suivi d'un `.` ou d'une frappe franche (tout symbole hors `b`),
 *   étire le Fade-Out de `100 %` à `0 %` sur toute la durée exacte entre `/` et ce point de fermeture.
 * - S'il n'est suivi d'aucun `.` ni frappe avant la fin (ou d'un `b` de relance), applique `450 ms`.
 */
export function resolveSlashFadeOutRampSec(
  points: readonly BarulhoLookaheadPoint[],
  currentIndex: number
): number {
  const cur = points[currentIndex];
  if (!cur) return DEFAULT_BARULHO_FADEOUT_SEC;

  for (let j = currentIndex + 1; j < points.length; j++) {
    const next = points[j];
    if (next.trackId !== cur.trackId) continue;
    const dt = next.timeSec - cur.timeSec;
    if (dt <= 0.005) continue;
    if (next.symbol === '/') continue;
    if (next.symbol === 'b') return DEFAULT_BARULHO_FADEOUT_SEC;
    return Math.max(DEFAULT_BARULHO_DOT_STOP_SEC, dt);
  }

  return DEFAULT_BARULHO_FADEOUT_SEC;
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
