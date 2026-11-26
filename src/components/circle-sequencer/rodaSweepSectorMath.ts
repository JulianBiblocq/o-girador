/**
 * rodaSweepSectorMath.ts — Plan géométrique pur de découpe sectorielle `sweep6h` (< 90 lignes).
 * - Désactive automatiquement le fondu sectoriel si `currTimeSig !== neighborTimeSig` (bascule nette à 12h).
 * - Place le rayon 12h à `-0.030` tour (dans le creux avant le Temps 1) et entoure le balai d'une fenêtre `2w + pad`.
 */
import { normalizeTimeSig } from '../../utils/rodaTimeSigGeometry';

export const SWEEP_FADE_WIDTH_P = 0.045;
export const STAMP_ANGULAR_PAD_P = 0.031;
export const TWELVE_H_GAP_P = -0.030;

export interface SweepSectorPlan {
  mode: 'single' | 'sweepNext' | 'sweepPrev';
  sweepRatio: number | null;
  wedgeStartP: number;
  wedgeEndP: number;
  leadStartAngle: number;
  leadEndAngle: number;
  trailStartAngle: number;
  trailEndAngle: number;
  wedgeStartAngle: number;
  wedgeEndAngle: number;
}

const pToRad = (p: number): number => -Math.PI / 2 + p * Math.PI * 2;

export function isNormalizedPInWedge(p: number, wedgeStartP: number, wedgeEndP: number, extraPad = STAMP_ANGULAR_PAD_P): boolean {
  const lo = wedgeStartP - extraPad, hi = wedgeEndP + extraPad;
  const wrappedNeg = p > 0.94 ? p - 1 : p;
  return (p >= lo && p <= hi) || (wrappedNeg >= lo && wrappedNeg <= hi);
}

export function computeSweepSectorPlan(params: {
  isPlayheadActive: boolean;
  playheadRatio: number;
  rodaSweepMode?: 'sweep6h' | 'fullMeasure';
  currTimeSig: string;
  nextTimeSig: string;
  prevTimeSig: string;
  hasPrevMeasure: boolean;
  isNextSlotReady: boolean;
  isPrevSlotReady: boolean;
}): SweepSectorPlan {
  const { isPlayheadActive, playheadRatio, rodaSweepMode, currTimeSig, nextTimeSig, prevTimeSig, hasPrevMeasure, isNextSlotReady, isPrevSlotReady } = params;
  const single: SweepSectorPlan = {
    mode: 'single', sweepRatio: null, wedgeStartP: 0, wedgeEndP: 0,
    leadStartAngle: 0, leadEndAngle: 0, trailStartAngle: 0, trailEndAngle: 0, wedgeStartAngle: 0, wedgeEndAngle: 0,
  };
  if (!isPlayheadActive || rodaSweepMode === 'fullMeasure' || playheadRatio < 0) return single;

  const cSig = normalizeTimeSig(currTimeSig);
  const r = ((playheadRatio % 1) + 1) % 1;
  const pMin = TWELVE_H_GAP_P, pMax = 1 + TWELVE_H_GAP_P;

  if (r >= 0.5) {
    if (cSig !== normalizeTimeSig(nextTimeSig) || !isNextSlotReady) return single;
    const sweepP = r - 0.5;
    const wLo = Math.max(pMin, sweepP - SWEEP_FADE_WIDTH_P - STAMP_ANGULAR_PAD_P);
    const wHi = Math.min(pMax, sweepP + SWEEP_FADE_WIDTH_P);
    return {
      mode: 'sweepNext', sweepRatio: sweepP, wedgeStartP: wLo, wedgeEndP: wHi,
      leadStartAngle: pToRad(pMin), leadEndAngle: pToRad(wLo),
      trailStartAngle: pToRad(wHi), trailEndAngle: pToRad(pMax),
      wedgeStartAngle: pToRad(wLo), wedgeEndAngle: pToRad(wHi),
    };
  }

  if (!hasPrevMeasure || cSig !== normalizeTimeSig(prevTimeSig) || !isPrevSlotReady) return single;
  const sweepP = r + 0.5;
  const wLo = Math.max(pMin, sweepP - SWEEP_FADE_WIDTH_P - STAMP_ANGULAR_PAD_P);
  const wHi = Math.min(pMax, sweepP + SWEEP_FADE_WIDTH_P);
  return {
    mode: 'sweepPrev', sweepRatio: sweepP, wedgeStartP: wLo, wedgeEndP: wHi,
    leadStartAngle: pToRad(pMin), leadEndAngle: pToRad(wLo),
    trailStartAngle: pToRad(wHi), trailEndAngle: pToRad(pMax),
    wedgeStartAngle: pToRad(wLo), wedgeEndAngle: pToRad(wHi),
  };
}
