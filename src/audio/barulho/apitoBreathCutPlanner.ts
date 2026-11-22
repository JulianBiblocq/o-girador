/**
 * apitoBreathCutPlanner.ts — Pré-coupure « coup de langue » du sifflet long `L` d'Apito avant `c`/`C`/`L` (< 120 L).
 * Partagé entre Live AudioWorklet, Fallback Web Audio et Full Song / Baque Bounce Offline :
 * - Avant attaque (`c`, `C`, `w`, ou ré-attaque `L` non liée) : fondu `12 ms` amorcé à `t_next - preCutSec`
 *   avec `preCutSec = Math.min(0.044, stepDurationSec * 0.32)` -> silence complet `~32 ms` avant l'impact.
 * - Arrêt sur `/` ou case vide sans attaque immédiate : fondu sec `14 ms` + choke de sécurité `6 ms` anti-clic.
 */
import type { BarulhoLookaheadPoint } from './barulhoRampPlanner';

export const APITO_TONGUE_FADE_SEC = 0.012;
export const APITO_PRECUT_MAX_SEC = 0.044;
export const APITO_PRECUT_STEP_RATIO = 0.32;
export const APITO_MIN_ATTACK_BODY_SEC = 0.008;
export const APITO_NATURAL_STOP_FADE_SEC = 0.014;
export const APITO_SAFETY_CHOKE_SEC = 0.006;

export interface ApitoPreCutSpec {
  preCutSec: number;
  fadeStartSec: number;
  fadeDurationSec: number;
  fadeEndSec: number;
  silentBeforeAttackSec: number;
}

export interface ApitoPlannedCutEvent {
  trackId: number;
  fadeStartSec: number;
  fadeDurationSec: number;
  nextAttackSec: number;
}

export function isApitoSustainSymbol(sym: string): boolean {
  return sym === 'L' || sym === 'W' || sym === 'l';
}

export function isApitoAttackSymbol(sym: string): boolean {
  return sym === 'C' || sym === 'c' || sym === 'w' || sym === 'L' || sym === 'W';
}

function isSameLoopStepCoord(coordA?: number, coordB?: number, seqA?: number, seqB?: number): boolean {
  if (!coordA || !coordB || coordA <= 0 || coordB <= 0) return false;
  if (seqA !== undefined && seqB !== undefined && seqA === seqB) return false;
  return ((coordA - 1) & 0x7F) === ((coordB - 1) & 0x7F);
}

export function computeApitoPreCutSpec(
  lStartSec: number,
  nextAttackSec: number,
  stepDurationSec: number
): ApitoPreCutSpec {
  const safeStepDur = Math.max(0.020, Number.isFinite(stepDurationSec) ? stepDurationSec : 0.150);
  const preCutSec = Math.min(APITO_PRECUT_MAX_SEC, safeStepDur * APITO_PRECUT_STEP_RATIO);
  const minStart = lStartSec + APITO_MIN_ATTACK_BODY_SEC;
  const fadeStartSec = Math.max(minStart, nextAttackSec - preCutSec);
  const availBeforeHit = Math.max(APITO_SAFETY_CHOKE_SEC, nextAttackSec - fadeStartSec);
  const fadeDurationSec = Math.min(APITO_TONGUE_FADE_SEC, availBeforeHit);
  const fadeEndSec = fadeStartSec + fadeDurationSec;
  return {
    preCutSec,
    fadeStartSec,
    fadeDurationSec,
    fadeEndSec,
    silentBeforeAttackSec: Math.max(0, nextAttackSec - fadeEndSec),
  };
}

export function planApitoBreathCutsFromLookahead(
  points: readonly BarulhoLookaheadPoint[],
  defaultStepDurSec = 0.150
): ApitoPlannedCutEvent[] {
  const cuts: ApitoPlannedCutEvent[] = [];
  const activeByTrack = new Map<number, { startSec: number; originCoord?: number; seqId?: number }>();

  for (let i = 0; i < points.length; i++) {
    const pt = points[i];
    if (pt.instId !== 'apito') continue;
    const sym = pt.symbol;
    const active = activeByTrack.get(pt.trackId);

    if (sym === 'L' || sym === 'W') {
      if (active && isSameLoopStepCoord(active.originCoord, pt.originCoord, active.seqId, pt.seqId)) {
        active.originCoord = pt.originCoord;
        active.seqId = pt.seqId;
        continue;
      }
      if (active && pt.timeSec > active.startSec + 0.005) {
        const spec = computeApitoPreCutSpec(active.startSec, pt.timeSec, pt.stepDurationSec ?? defaultStepDurSec);
        cuts.push({ trackId: pt.trackId, fadeStartSec: spec.fadeStartSec, fadeDurationSec: spec.fadeDurationSec, nextAttackSec: pt.timeSec });
      }
      activeByTrack.set(pt.trackId, { startSec: pt.timeSec, originCoord: pt.originCoord, seqId: pt.seqId });
    } else if (sym === 'l') {
      if (!active) activeByTrack.set(pt.trackId, { startSec: pt.timeSec, originCoord: 0, seqId: pt.seqId });
    } else if (sym === 'C' || sym === 'c' || sym === 'w') {
      if (active && pt.timeSec > active.startSec + 0.005) {
        const spec = computeApitoPreCutSpec(active.startSec, pt.timeSec, pt.stepDurationSec ?? defaultStepDurSec);
        cuts.push({ trackId: pt.trackId, fadeStartSec: spec.fadeStartSec, fadeDurationSec: spec.fadeDurationSec, nextAttackSec: pt.timeSec });
      }
      activeByTrack.delete(pt.trackId);
    } else if (sym === '/' || sym === '.') {
      activeByTrack.delete(pt.trackId);
    }
  }
  return cuts;
}
