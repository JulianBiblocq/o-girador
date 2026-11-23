/**
 * snareSympathyPlanner.ts — Sympathie acoustique maîtrisée des brins de Caixa / Tarol sur les coups forts d'Alfaia (< 110 lignes).
 * - Maximum 1 seule voix sympathique (`e_min`, `-31 dB` modulé par `rodaBreathingAmount / 0.75`, decay ~80 ms, délai `+3.5..5.5 ms`).
 * - Verrou 1 : coupé à `0` dès que `effectiveRodaBreathingAmount <= 0` (`A Oficina` / `[ Avant / Après ]`).
 * - Verrou 2 : exige une piste Caixa/Tarol réellement audible (`!getEffectiveMuteState`, respectant tout Solo `[S]` Alfaia !).
 */

import { instrumentsConfig } from '../../data';
import { computeEffectiveMuteStatePro } from '../../stores/helpers/trackSoloProHelpers';
import type { TrackGroup } from '../../types';
import type { BarulhoLookaheadPoint } from '../barulho/barulhoRampPlanner';
import { NOMINAL_STUDIO_STEP_VEL } from '../worklet/processor/workletEnvelopeMath';

export const SNARE_SYMPATHY_MINUS_31DB_GAIN = 0.0281838293; // 10^(-31 / 20)
export const SNARE_SYMPATHY_MIN_ALFAIA_VEL = 0.68;
export const SNARE_SYMPATHY_COLLISION_WINDOW_SEC = 0.020;

export function isSympathyTriggeringAlfaiaHit(
  instrumentId: string,
  strokeSymbol: string,
  rawVelocity: number
): boolean {
  if (instrumentId !== 'marcante' && instrumentId !== 'meiao') return false;
  if (strokeSymbol !== 'D' && strokeSymbol !== 'E') return false;
  const normVel = rawVelocity > 3.0 ? rawVelocity / 100 : rawVelocity;
  return Number.isFinite(normVel) && normVel >= SNARE_SYMPATHY_MIN_ALFAIA_VEL;
}

export interface SympathySnareCandidate {
  track: TrackGroup;
  instId: 'caixa' | 'tarol';
}

export function resolveAudibleSympathySnareTrack(
  tracks: readonly TrackGroup[],
  effectiveBreathingAmount: number,
  soloPatternPlayId: number | null = null,
  extraMuteCheck?: (trackId: number) => boolean
): SympathySnareCandidate | null {
  if (!Number.isFinite(effectiveBreathingAmount) || effectiveBreathingAmount <= 0) {
    return null;
  }
  if (!tracks || tracks.length === 0) return null;

  const mutTracks = tracks as TrackGroup[];
  let fallbackTarol: SympathySnareCandidate | null = null;

  for (let i = 0; i < tracks.length; i++) {
    const t = tracks[i];
    if (!t || t.isBusFolder || t.isLinkFolder) continue;
    const inst = instrumentsConfig[t.instrumentIdx];
    const id = inst?.id;
    if (id !== 'caixa' && id !== 'tarol') continue;

    if (soloPatternPlayId !== null) {
      const ownsSoloPattern = Array.isArray(t.patterns) && t.patterns.some((p) => p.id === soloPatternPlayId);
      if (!ownsSoloPattern) continue;
    } else {
      if (computeEffectiveMuteStatePro(mutTracks, t.id)) continue;
      if (extraMuteCheck && extraMuteCheck(t.id)) continue;
    }

    if (id === 'caixa') return { track: t, instId: 'caixa' };
    if (!fallbackTarol) fallbackTarol = { track: t, instId: 'tarol' };
  }

  return fallbackTarol;
}

export function hasNearbySnareStrokeInWindow(
  lookaheadPoints: readonly BarulhoLookaheadPoint[] | undefined,
  snareTrackId: number,
  timeSec: number,
  windowSec = SNARE_SYMPATHY_COLLISION_WINDOW_SEC
): boolean {
  if (!lookaheadPoints || lookaheadPoints.length === 0) return false;
  for (let i = 0; i < lookaheadPoints.length; i++) {
    const pt = lookaheadPoints[i];
    if (pt.trackId !== snareTrackId) continue;
    const dt = pt.timeSec - timeSec;
    if (dt > windowSec) break;
    if (Math.abs(dt) <= windowSec && pt.symbol !== '/' && pt.symbol !== '.') {
      return true;
    }
  }
  return false;
}

export function computeSympathyAirDelaySec(alfaiaTrackId: number, stepSeed: number): number {
  const h = (((Math.imul((alfaiaTrackId | 0) + 19, 2654435761) ^ Math.imul((stepSeed | 0) + 5, 1597334677)) >>> 0) % 1000) / 1000;
  return 0.0035 + h * 0.0020; // [3.5 ms .. 5.5 ms]
}

export function computeSympathyStrokeBaseGain(
  alfaiaVelocity: number,
  effectiveBreathingAmount: number
): { velocity: number; baseGain: number } {
  if (effectiveBreathingAmount <= 0) return { velocity: 0, baseGain: 0 };
  const normVel = alfaiaVelocity > 3.0 ? alfaiaVelocity / 100 : alfaiaVelocity;
  const breathingScale = Math.max(0, Math.min(1.5, effectiveBreathingAmount / 0.75));
  const velExcitation = Math.max(0.85, Math.min(1.20, normVel / NOMINAL_STUDIO_STEP_VEL));
  return {
    velocity: NOMINAL_STUDIO_STEP_VEL,
    baseGain: SNARE_SYMPATHY_MINUS_31DB_GAIN * breathingScale * velExcitation,
  };
}
