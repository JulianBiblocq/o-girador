export type HandStrokeEnergy = 'strong' | 'weak' | 'special' | 'rest';

export interface HandTransitionConfig {
  stayLowAfterStrongY: number;
  stayLowScaleZ: number;
  liftHighAfterWeakY: number;
  liftHighScaleZ: number;
  liftWhipDeg: number;
  transitionRiseCurve: number;
}

export const DEFAULT_HAND_TRANSITIONS: HandTransitionConfig = {
  stayLowAfterStrongY: -96,
  stayLowScaleZ: 0.82,
  liftHighAfterWeakY: 36,
  liftHighScaleZ: 1.42,
  liftWhipDeg: 7,
  transitionRiseCurve: 0.45,
};

interface HandMemoryEntry {
  posture: 'high_armed' | 'low_tucked' | 'rest';
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
  posture: 'high_armed' | 'low_tucked' | 'rest',
  transform: string
): void {
  const key = isLeftSide ? 'left' : 'right';
  memoryMap[key] = { posture, transform };
}

export function getTransitionRiseEasing(curve: number): string {
  const c = Math.max(0.1, Math.min(1.0, curve));
  const p1 = +(0.15 + (1 - c) * 0.35).toFixed(2);
  const p2 = +(0.65 + c * 0.32).toFixed(2);
  return `cubic-bezier(${p1}, ${p2}, 0.32, 1)`;
}

export function buildArmedHighTransform(
  isLeftSide: boolean,
  profScale: number,
  restOffsetY: number,
  tr: HandTransitionConfig
): string {
  const inSign = isLeftSide ? 1 : -1;
  const sc = +(tr.liftHighScaleZ * profScale).toFixed(3);
  const y = Math.round(restOffsetY + tr.liftHighAfterWeakY);
  return `translate(${-inSign * 12}px, ${y}px) rotateZ(${-inSign * tr.liftWhipDeg}deg) scale(${sc}) skewX(0deg)`;
}

export function buildTuckedLowTransform(
  isLeftSide: boolean,
  profScale: number,
  tr: HandTransitionConfig
): string {
  const inSign = isLeftSide ? 1 : -1;
  const sc = +(tr.stayLowScaleZ * profScale).toFixed(3);
  return `translate(${inSign * 2}px, ${Math.round(tr.stayLowAfterStrongY)}px) rotateZ(${inSign * 2}deg) scale(${sc}) skewX(0deg)`;
}

export function resolveStickStartAndEndTransforms(
  isLeftSide: boolean,
  profScale: number,
  restOffsetY: number,
  restTransform: string,
  tr: HandTransitionConfig,
  isCurrentStrong: boolean,
  nextKind: 'strong' | 'weak' | 'rufada' | 'idle'
): { startTransform: string; endTransform: string; rebEasing: string } {
  const mem = getHandMemory(isLeftSide);
  const highTr = buildArmedHighTransform(isLeftSide, profScale, restOffsetY, tr);
  const lowTr = buildTuckedLowTransform(isLeftSide, profScale, tr);

  let startTransform: string;
  if (mem.transform && ((isCurrentStrong && mem.posture === 'high_armed') || (!isCurrentStrong && mem.posture === 'low_tucked'))) {
    startTransform = mem.transform;
  } else {
    startTransform = isCurrentStrong ? highTr : lowTr;
  }

  let endTransform: string;
  let endPosture: 'high_armed' | 'low_tucked' | 'rest';
  if (nextKind === 'weak' || nextKind === 'rufada') {
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
  };
}

