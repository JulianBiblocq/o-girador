import { isFastRepeatCompactPrep } from './aoVivoBallisticMath';

export type HandStrokeEnergy = 'strong' | 'weak' | 'special' | 'rest';
export type HandPosture = 'high_armed' | 'low_tucked' | 'pressed_skin' | 'rest';

export interface HandTransitionConfig {
  stayLowAfterStrongY: number;
  stayLowScaleZ: number;
  liftHighAfterWeakY: number;
  liftHighScaleZ: number;
  liftWhipDeg: number;
  transitionRiseCurve: number;
}

export const DEFAULT_HAND_TRANSITIONS: HandTransitionConfig = {
  stayLowAfterStrongY: -34,
  stayLowScaleZ: 0.93,
  liftHighAfterWeakY: -8,
  liftHighScaleZ: 1.03,
  liftWhipDeg: 4.5,
  transitionRiseCurve: 0.45,
};

interface HandMemoryEntry {
  posture: HandPosture;
  transform: string | null;
}

const memoryMap: Record<string, HandMemoryEntry> = {
  left: { posture: 'rest', transform: null },
  right: { posture: 'rest', transform: null },
};

export function resetHandPostureMemory(): void {
  memoryMap.left = { posture: 'rest', transform: null };
  memoryMap.right = { posture: 'rest', transform: null };
}

export function getHandMemory(isLeftSide: boolean): HandMemoryEntry {
  return isLeftSide ? memoryMap.left : memoryMap.right;
}

export function setHandMemory(
  isLeftSide: boolean,
  posture: HandPosture,
  transform: string
): void {
  const key = isLeftSide ? 'left' : 'right';
  memoryMap[key] = { posture, transform };
}

export function getTransitionRiseEasing(curve: number): string {
  const c = Math.max(0.1, Math.min(1.0, curve));
  const p1 = +(0.18 + (1 - c) * 0.22).toFixed(2);
  const p2 = +(0.72 + c * 0.25).toFixed(2);
  return `cubic-bezier(${p1}, ${p2}, 0.34, 1)`;
}

/**
 * Posture de garde souple (sans saut d'échelle extrême `0.82x <-> 1.42x`),
 * proche de l'équilibre de repos afin que la baguette ne gèle jamais en l'air.
 */
export function buildArmedHighTransform(
  isLeftSide: boolean,
  profScale: number,
  restOffsetY: number,
  tr: HandTransitionConfig
): string {
  const inSign = isLeftSide ? 1 : -1;
  const clampedLiftZ = Math.max(0.96, Math.min(1.06, 0.96 + (tr.liftHighScaleZ - 0.95) * 0.22));
  const sc = +(clampedLiftZ * profScale).toFixed(3);
  const baseRestY = -25 + restOffsetY;
  const y = Math.round(baseRestY + Math.max(-6, Math.min(16, tr.liftHighAfterWeakY * 0.35 + 8)));
  const rot = -inSign * Math.min(5, Math.abs(tr.liftWhipDeg) * 0.65);
  return `translate(${-inSign * 5}px, ${y}px) rotateZ(${+rot.toFixed(1)}deg) scale(${sc}) skewX(0deg)`;
}

export function buildTuckedLowTransform(
  isLeftSide: boolean,
  profScale: number,
  tr: HandTransitionConfig,
  restOffsetY = 0
): string {
  const inSign = isLeftSide ? 1 : -1;
  const clampedLowZ = Math.max(0.90, Math.min(0.97, 0.95 - (1 - tr.stayLowScaleZ) * 0.22));
  const sc = +(clampedLowZ * profScale).toFixed(3);
  const baseRestY = -25 + restOffsetY;
  const y = Math.round(baseRestY - 12);
  return `translate(${inSign * 2}px, ${y}px) rotateZ(${inSign * 1.5}deg) scale(${sc}) skewX(0deg)`;
}

export function resolveStickStartAndEndTransforms(
  isLeftSide: boolean,
  profScale: number,
  restOffsetY: number,
  restTransform: string,
  tr: HandTransitionConfig,
  isCurrentStrong: boolean,
  nextKind: 'strong' | 'weak' | 'rufada' | 'idle',
  realMsUntilNext?: number
): { startTransform: string; endTransform: string; rebEasing: string; wasPressedOnSkin: boolean; pressedTransform: string | null } {
  const mem = getHandMemory(isLeftSide);
  const wasPressedOnSkin = mem.posture === 'pressed_skin' && Boolean(mem.transform);
  const pressedTransform = wasPressedOnSkin ? mem.transform : null;
  const highTr = buildArmedHighTransform(isLeftSide, profScale, restOffsetY, tr);
  const lowTr = buildTuckedLowTransform(isLeftSide, profScale, tr, restOffsetY);

  let startTransform: string;
  if (wasPressedOnSkin && mem.transform) {
    startTransform = mem.transform;
  } else if (mem.posture !== 'rest' && mem.transform) {
    startTransform = mem.transform;
  } else {
    startTransform = isCurrentStrong ? highTr : restTransform;
  }

  const forceCompact = isFastRepeatCompactPrep(realMsUntilNext);
  let endTransform: string;
  let endPosture: HandPosture;
  if (nextKind === 'weak' || nextKind === 'rufada' || (nextKind === 'strong' && forceCompact)) {
    endTransform = lowTr;
    endPosture = 'low_tucked';
  } else if (nextKind === 'strong') {
    endTransform = highTr;
    endPosture = 'high_armed';
  } else {
    endTransform = restTransform;
    endPosture = 'rest';
  }

  setHandMemory(isLeftSide, endPosture, endTransform);
  return {
    startTransform,
    endTransform,
    rebEasing: getTransitionRiseEasing(tr.transitionRiseCurve),
    wasPressedOnSkin,
    pressedTransform,
  };
}
