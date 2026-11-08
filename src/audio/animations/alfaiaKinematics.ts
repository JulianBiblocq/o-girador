import {
  AlfaiaNextStrokeKind,
  AlfaiaSecondaryStickFamily,
  CONFIG_ALFAIA_STICKS,
  getProfileFlexibility,
  getProfileScale,
} from './alfaiaStickConfig';
import { getEffectiveMobileOffset } from './aoVivoMobileOffsets';
import { resetHandPostureMemory, resolveStickStartAndEndTransforms } from './handTransitionEngine';

export * from './alfaiaStickConfig';
export { resetHandPostureMemory };

const normFam = (f: AlfaiaSecondaryStickFamily | boolean): AlfaiaSecondaryStickFamily =>
  typeof f === 'boolean' ? (f ? 'macaneta' : 'fina') : f;

export function getAlfaiaStickRestTransform(_isLeftSide: boolean, familyOrIsMac: AlfaiaSecondaryStickFamily | boolean = 'macaneta'): string {
  const s = +(0.95 * getProfileScale(normFam(familyOrIsMac))).toFixed(3);
  return `translate(0px, ${-25 + CONFIG_ALFAIA_STICKS.restOffsetY}px) rotateZ(0deg) scale(${s}) skewX(0deg)`;
}

export function getAlfaiaShadowRestTransform(isLeftSide: boolean): string {
  return `translate(${(isLeftSide ? 1 : -1) * 8}px, ${-Math.round(CONFIG_ALFAIA_STICKS.shadowDepthPx * 1.5)}px) scale(0.85)`;
}

export function getAlfaiaImpactPoseTransform(stroke: string, isLeftSide: boolean, fam: AlfaiaSecondaryStickFamily): string {
  const inSign = isLeftSide ? 1 : -1, profScale = getProfileScale(fam), flex = getProfileFlexibility(fam);
  const c = CONFIG_ALFAIA_STICKS, mobY = getEffectiveMobileOffset('alfaia').reachDeltaY;
  const sc = (v: number) => +(v * profScale).toFixed(3), sUp = stroke.toUpperCase();
  if (sUp === 'C') return `translate(${c.crossClickCenterX + inSign * c.crossClickConvergeX}px, ${c.crossClickY + mobY}px) rotateZ(${inSign * c.crossClickAngleDeg}deg) scale(${sc(c.crossClickScaleZ)}) skewX(0deg)`;
  if (sUp === 'X') return `translate(${inSign * c.rimshotOffsetX}px, ${c.rimshotImpactY + mobY}px) rotateZ(${inSign * c.rimshotAngleDeg}deg) scale(${sc(c.rimshotScaleZ)}) skewX(0deg)`;
  if (sUp === 'B' || stroke === '~') return `translate(${inSign * c.impactConvergeX}px, ${c.barulhoImpactY + mobY}px) rotateZ(${inSign * 3.5}deg) scale(${sc(c.impactScaleZ)}) skewX(0deg)`;
  const isBac = fam === 'bacalhau';
  const sx = isBac ? +(sc(c.impactScaleZ) * (0.9 + c.bacalhau.impactSquashX * 0.1)).toFixed(3) : sc(c.impactScaleZ);
  const sy = isBac ? sc(c.impactScaleZ) : +(sx * (0.97 - flex * 0.04)).toFixed(3);
  const skew = +(isBac ? -inSign * c.bacalhau.impactBendDeg * 0.25 : -inSign * flex * 2.4).toFixed(1);
  return `translate(${inSign * c.impactConvergeX}px, ${c.impactReachY + mobY}px) rotateZ(${inSign * 4.5}deg) scale(${sx}, ${sy}) skewX(${skew}deg)`;
}

export const KEYFRAMES_SKIN_WAVE: Keyframe[] = [
  { transform: 'translate(-50%, -50%) scale(0.98)', opacity: 0, offset: 0 },
  { transform: 'translate(-50%, -50%) scale(0.98)', opacity: 0.72, offset: 0.18 },
  { transform: 'translate(-50%, -50%) scale(1.01)', opacity: 0, offset: 1 },
];

export const KEYFRAMES_SKIN_BARULHO: Keyframe[] = [
  { transform: 'translate(-50%, -50%) scale(0.99)', opacity: 0.45, offset: 0 },
  { transform: 'translate(-50%, -50%) scale(1.005)', opacity: 0.65, offset: 0.5 },
  { transform: 'translate(-50%, -50%) scale(0.985)', opacity: 0.2, offset: 1 },
];

export function generateAlfaiaPredictiveKeyframes(
  stroke: string, isLeftSide: boolean, familyOrIsMac: AlfaiaSecondaryStickFamily | boolean,
  nextKind: AlfaiaNextStrokeKind, durationMs: number = 220
): Keyframe[] {
  const fam = normFam(familyOrIsMac), inSign = isLeftSide ? 1 : -1;
  const profScale = getProfileScale(fam), flex = getProfileFlexibility(fam);
  const c = CONFIG_ALFAIA_STICKS, sUp = stroke.toUpperCase(), mobY = getEffectiveMobileOffset('alfaia').reachDeltaY;
  const sc = (v: number) => +(v * profScale).toFixed(3);
  const atkOff = Math.min(0.45, Math.max(0.06, c.attackSpeed));
  const restTr = getAlfaiaStickRestTransform(isLeftSide, fam);

  if (stroke === '~' || sUp === 'B') {
    const by = c.barulhoImpactY + mobY, jit = c.barulhoJitterPx, ph = isLeftSide ? c.barulhoPhaseOffset : 0;
    return [0, 0.25, 0.5, 0.75, 1].map((t) => {
      const w = Math.cos((t + ph) * Math.PI * 2), dy = Math.round(by + (1 - w) * 0.5 * jit);
      const z = sc(c.impactScaleZ + (1 - w) * 0.02);
      return { transform: `translate(${inSign * c.impactConvergeX}px, ${dy}px) rotateZ(${inSign * (w > 0 ? 4.5 : 2.2)}deg) scale(${z}) skewX(0deg)`, offset: t };
    });
  }

  const isStrong = stroke === 'D' || stroke === 'E' || stroke === 'I' || stroke === 'S' || stroke === 'V' || sUp === 'C' || sUp === 'X';
  const { startTransform, endTransform, rebEasing } = resolveStickStartAndEndTransforms(isLeftSide, profScale, c.restOffsetY, restTr, c.transitions, isStrong, nextKind);

  if (sUp === 'C' || sUp === 'X') {
    return [
      { transform: startTransform, offset: 0, easing: 'cubic-bezier(0.75, 0, 1, 1)' },
      { transform: getAlfaiaImpactPoseTransform(sUp, isLeftSide, fam), offset: atkOff, easing: rebEasing },
      { transform: endTransform, offset: 1 },
    ];
  }

  const isBac = fam === 'bacalhau', reachY = c.impactReachY + mobY;
  const impScaleX = isBac ? +(sc(c.impactScaleZ) * (0.9 + c.bacalhau.impactSquashX * 0.1)).toFixed(3) : sc(isStrong ? c.impactScaleZ : Math.min(1.08, c.impactScaleZ + 0.04));
  const impScaleY = isBac ? sc(c.impactScaleZ) : +(impScaleX * (0.97 - flex * 0.04)).toFixed(3);
  const impAngle = inSign * (isBac ? 4 + c.wristWhipDeg * 0.6 : isStrong ? 4.5 : 3);
  const impSkew = +(isBac ? -inSign * c.bacalhau.impactBendDeg * 0.25 : -inSign * flex * 2.4).toFixed(1);
  const convX = inSign * c.impactConvergeX;
  const holdOff = isBac ? Math.min(0.85, +(atkOff + c.bacalhau.bendSnapMs / Math.max(120, durationMs)).toFixed(2)) : Math.min(0.85, +(atkOff + 0.03 + flex * 0.04).toFixed(2));

  return [
    { transform: startTransform, offset: 0, easing: isStrong ? 'cubic-bezier(0.75, 0, 1, 1)' : 'cubic-bezier(0.65, 0, 0.95, 1)' },
    { transform: `translate(${convX}px, ${reachY}px) rotateZ(${impAngle}deg) scale(${impScaleX}, ${impScaleY}) skewX(${impSkew}deg)`, offset: atkOff },
    { transform: `translate(${convX}px, ${reachY + 4}px) rotateZ(${inSign * 3.5}deg) scale(${impScaleX}) skewX(0deg)`, offset: holdOff, easing: rebEasing },
    { transform: endTransform, offset: 1 },
  ];
}

export function generateBacalhauTipKeyframes(isLeftSide: boolean, durationMs: number): Keyframe[] {
  const inSign = isLeftSide ? 1 : -1;
  const { attackSpeed, bacalhau } = CONFIG_ALFAIA_STICKS;
  const atkOff = Math.min(0.45, Math.max(0.06, attackSpeed));
  const snapOff = Math.min(0.88, +(atkOff + bacalhau.bendSnapMs / Math.max(110, durationMs)).toFixed(2));
  const bend = bacalhau.impactBendDeg;
  const sq = bacalhau.impactSquashX;
  return [
    { transform: `rotateZ(${-inSign * +(bend * 0.35).toFixed(1)}deg) skewX(0deg) scaleX(1)`, offset: 0, easing: 'cubic-bezier(0.75, 0, 1, 1)' },
    { transform: `rotateZ(${inSign * bend}deg) skewX(${-inSign * +(bend * 0.65).toFixed(1)}deg) scaleX(${sq})`, offset: atkOff },
    { transform: `rotateZ(${inSign * +(bend * 0.55).toFixed(1)}deg) skewX(${-inSign * +(bend * 0.3).toFixed(1)}deg) scaleX(${+(1 + (sq - 1) * 0.5).toFixed(2)})`, offset: snapOff, easing: 'cubic-bezier(0.25, 1.4, 0.4, 1)' },
    { transform: 'rotateZ(0deg) skewX(0deg) scaleX(1)', offset: 1 },
  ];
}

export function generateAlfaiaShadowKeyframes(stroke: string, isLeftSide: boolean, nextKind: AlfaiaNextStrokeKind): Keyframe[] {
  const inSign = isLeftSide ? 1 : -1;
  const { shadowDepthPx, shadowOpacity, attackSpeed } = CONFIG_ALFAIA_STICKS;
  const atkOff = Math.min(0.45, Math.max(0.06, attackSpeed));
  const airY = -Math.round(shadowDepthPx * 1.5);
  const airOp = +(shadowOpacity * 0.45).toFixed(2);
  if (stroke.toUpperCase() === 'C') {
    return [
      { transform: `translate(${inSign * 8}px, ${airY}px) scale(0.85)`, opacity: airOp, offset: 0 },
      { transform: `translate(${-inSign * 16}px, ${Math.round(airY * 0.6)}px) scale(0.82)`, opacity: +(airOp * 0.75).toFixed(2), offset: atkOff },
      { transform: getAlfaiaShadowRestTransform(isLeftSide), opacity: airOp, offset: 1 },
    ];
  }
  return [
    { transform: `translate(${inSign * 8}px, ${airY}px) scale(0.85)`, opacity: airOp, offset: 0, easing: 'cubic-bezier(0.75, 0, 1, 1)' },
    { transform: 'translate(0px, 4px) scale(0.95)', opacity: shadowOpacity, offset: atkOff },
    nextKind === 'weak'
      ? { transform: `translate(${inSign * 4}px, ${Math.round(airY * 0.35)}px) scale(0.92)`, opacity: +(shadowOpacity * 0.72).toFixed(2), offset: 1 }
      : { transform: `translate(${inSign * 8}px, ${airY}px) scale(0.85)`, opacity: airOp, offset: 1 },
  ];
}
