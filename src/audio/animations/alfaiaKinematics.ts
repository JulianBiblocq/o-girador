import {
  AlfaiaNextStrokeKind, AlfaiaSecondaryStickFamily, CONFIG_ALFAIA_STICKS, getProfileFlexibility, getProfileScale,
} from './alfaiaStickConfig';
import { computeElasticImpactTiming, isFastRepeatCompactPrep } from './aoVivoBallisticMath';
import { getEffectiveMobileOffset } from './aoVivoMobileOffsets';
import { getHandMemory, resetHandPostureMemory, resolveStickStartAndEndTransforms } from './handTransitionEngine';
import {
  buildPostAbafadoLiftFrame, generateAlfaiaAbafadoShadowKeyframes, generateAlfaiaAbafadoStickKeyframes,
  generateBacalhauAbafadoTipKeyframes, getAlfaiaAbafadoPoseTransform,
} from './alfaiaAbafadoKinematics';

export * from './alfaiaStickConfig';
export { getHandMemory, resetHandPostureMemory, generateBacalhauAbafadoTipKeyframes };

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
  const sUp = stroke.toUpperCase();
  if (sUp === 'A') return getAlfaiaAbafadoPoseTransform(isLeftSide, fam);
  const inSign = isLeftSide ? 1 : -1, profScale = getProfileScale(fam), flex = getProfileFlexibility(fam);
  const c = CONFIG_ALFAIA_STICKS, mobY = getEffectiveMobileOffset('alfaia').reachDeltaY;
  const sc = (v: number) => +(v * profScale).toFixed(3);
  if (sUp === 'C') return `translate(${c.crossClickCenterX + inSign * c.crossClickConvergeX}px, ${c.crossClickY + mobY}px) rotateZ(${inSign * c.crossClickAngleDeg}deg) scale(${sc(c.crossClickScaleZ)}) skewX(0deg)`;
  if (sUp === 'X') return `translate(${inSign * c.rimshotOffsetX}px, ${c.rimshotImpactY + mobY}px) rotateZ(${inSign * c.rimshotAngleDeg}deg) scale(${sc(c.rimshotScaleZ)}) skewX(0deg)`;
  if (sUp === 'B' || stroke === '~') return `translate(${inSign * c.impactConvergeX}px, ${c.barulhoImpactY + mobY}px) rotateZ(${inSign * 3.5}deg) scale(${sc(c.impactScaleZ)}) skewX(0deg)`;
  const isBac = fam === 'bacalhau';
  const sx = isBac ? +(sc(c.impactScaleZ) * (0.9 + c.bacalhau.impactSquashX * 0.1)).toFixed(3) : sc(c.impactScaleZ);
  const sy = isBac ? sc(c.impactScaleZ) : +(sx * (0.97 - flex * 0.04)).toFixed(3);
  const skew = +(isBac ? -inSign * c.bacalhau.impactBendDeg * 0.25 : -inSign * flex * 2.4).toFixed(1);
  return `translate(${inSign * c.impactConvergeX}px, ${c.impactReachY + mobY}px) rotateZ(${inSign * 4.5}deg) scale(${sx}, ${sy}) skewX(${skew}deg)`;
}

export function generateAlfaiaBarulhoLoopFrames(
  isLeftSide: boolean, familyOrIsMac: AlfaiaSecondaryStickFamily | boolean, amplitude = 1
): Keyframe[] {
  const fam = normFam(familyOrIsMac), inSign = isLeftSide ? 1 : -1;
  const c = CONFIG_ALFAIA_STICKS, mobY = getEffectiveMobileOffset('alfaia').reachDeltaY;
  const sc = (v: number) => +(v * getProfileScale(fam)).toFixed(3);
  const by = c.barulhoImpactY + mobY, jit = Math.max(1.2, c.barulhoJitterPx * amplitude), ph = isLeftSide ? c.barulhoPhaseOffset : 0;
  return [0, 0.25, 0.5, 0.75, 1].map((t) => {
    const w = Math.cos((t + ph) * Math.PI * 2), dy = +(by + (1 - w) * 0.5 * jit).toFixed(1);
    return { transform: `translate(${inSign * c.impactConvergeX}px, ${dy}px) rotateZ(${+(inSign * (2.8 + (w + 1) * 0.85 * amplitude)).toFixed(2)}deg) scale(${sc(c.impactScaleZ + (1 - w) * 0.02 * amplitude)}) skewX(0deg)`, offset: t };
  });
}

export function generateAlfaiaPredictiveKeyframes(
  stroke: string, isLeftSide: boolean, familyOrIsMac: AlfaiaSecondaryStickFamily | boolean,
  nextKind: AlfaiaNextStrokeKind, durationMs: number = 225, autoLiftBeforeOtherHand = false, realMsUntilNext?: number
): Keyframe[] {
  const fam = normFam(familyOrIsMac), sUp = stroke.toUpperCase();
  if (sUp === 'A') return generateAlfaiaAbafadoStickKeyframes(isLeftSide, fam, autoLiftBeforeOtherHand);
  if (stroke === '~' || sUp === 'B') return generateAlfaiaBarulhoLoopFrames(isLeftSide, fam, stroke === 'b' ? 0.6 : 1);

  const inSign = isLeftSide ? 1 : -1, profScale = getProfileScale(fam), flex = getProfileFlexibility(fam);
  const c = CONFIG_ALFAIA_STICKS, mobY = getEffectiveMobileOffset('alfaia').reachDeltaY, sc = (v: number) => +(v * profScale).toFixed(3);
  const restTr = getAlfaiaStickRestTransform(isLeftSide, fam);
  const isStrong = stroke === 'D' || stroke === 'E' || stroke === 'I' || stroke === 'S' || stroke === 'V' || sUp === 'C' || sUp === 'X';
  const { startTransform, endTransform, rebEasing, wasPressedOnSkin, pressedTransform } =
    resolveStickStartAndEndTransforms(isLeftSide, profScale, c.restOffsetY, restTr, c.transitions, isStrong, nextKind, realMsUntilNext);

  const liftMs = wasPressedOnSkin ? Math.min(12, durationMs * 0.08) : 0;
  const { delayOff, impactOff, cushionOff } = computeElasticImpactTiming(durationMs, liftMs);
  const compact = isFastRepeatCompactPrep(realMsUntilNext);
  const windUpTr = `translate(${-inSign * 8}px, ${Math.round(-12 + c.restOffsetY)}px) rotateZ(${-inSign * 5.5}deg) scale(${sc(1.07)}) skewX(0deg)`;

  const startFrames: Keyframe[] = wasPressedOnSkin && pressedTransform
    ? [{ transform: pressedTransform, offset: 0, easing: 'ease-out' }, { transform: buildPostAbafadoLiftFrame(isLeftSide, fam, isStrong), offset: delayOff, easing: 'cubic-bezier(0.6, 0, 0.95, 1)' }]
    : (isStrong && !compact && impactOff >= 0.16)
      ? [{ transform: startTransform, offset: 0, easing: 'ease-out' }, { transform: windUpTr, offset: +(impactOff * 0.42).toFixed(3), easing: 'cubic-bezier(0.65, 0, 0.95, 1)' }]
      : [{ transform: startTransform, offset: 0, easing: 'cubic-bezier(0.55, 0, 0.92, 1)' }];

  if (sUp === 'C' || sUp === 'X') {
    const impTr = getAlfaiaImpactPoseTransform(sUp, isLeftSide, fam);
    const cushY = (sUp === 'C' ? c.crossClickY : c.rimshotImpactY) + mobY + 14;
    const cushX = sUp === 'C' ? c.crossClickCenterX + inSign * (c.crossClickConvergeX * 0.65) : inSign * (c.rimshotOffsetX * 0.8);
    const cushTr = `translate(${Math.round(cushX)}px, ${Math.round(cushY)}px) rotateZ(${+(inSign * 3).toFixed(1)}deg) scale(${sc(0.98)}) skewX(0deg)`;
    return [...startFrames, { transform: impTr, offset: impactOff, easing: 'cubic-bezier(0.18, 0.72, 0.34, 1)' }, { transform: cushTr, offset: cushionOff, easing: rebEasing }, { transform: endTransform, offset: 1 }];
  }

  const isBac = fam === 'bacalhau', reachY = c.impactReachY + mobY, convX = inSign * c.impactConvergeX;
  const impScaleX = isBac ? +(sc(c.impactScaleZ) * (0.9 + c.bacalhau.impactSquashX * 0.1)).toFixed(3) : sc(isStrong ? c.impactScaleZ : Math.min(1.06, c.impactScaleZ + 0.03));
  const impScaleY = isBac ? sc(c.impactScaleZ) : +(impScaleX * (0.97 - flex * 0.04)).toFixed(3);
  const impAngle = inSign * (isBac ? 4 + c.wristWhipDeg * 0.6 : isStrong ? 4.5 : 3);
  const impSkew = +(isBac ? -inSign * c.bacalhau.impactBendDeg * 0.25 : -inSign * flex * 2.4).toFixed(1);
  const cushLiftY = Math.round(reachY + (-25 + c.restOffsetY - reachY) * 0.22);

  return [
    ...startFrames,
    { transform: `translate(${convX}px, ${reachY}px) rotateZ(${impAngle}deg) scale(${impScaleX}, ${impScaleY}) skewX(${impSkew}deg)`, offset: impactOff, easing: 'cubic-bezier(0.18, 0.72, 0.34, 1)' },
    { transform: `translate(${Math.round(convX * 0.78)}px, ${cushLiftY}px) rotateZ(${+(inSign * 2.2).toFixed(1)}deg) scale(${sc(0.95)}) skewX(0deg)`, offset: cushionOff, easing: rebEasing },
    { transform: endTransform, offset: 1 },
  ];
}

export function generateBacalhauTipKeyframes(isLeftSide: boolean, durationMs: number): Keyframe[] {
  const inSign = isLeftSide ? 1 : -1, { bacalhau } = CONFIG_ALFAIA_STICKS;
  const { impactOff, cushionOff } = computeElasticImpactTiming(durationMs);
  const bend = bacalhau.impactBendDeg, sq = bacalhau.impactSquashX;
  return [
    { transform: `rotateZ(${-inSign * +(bend * 0.35).toFixed(1)}deg) skewX(0deg) scaleX(1)`, offset: 0, easing: 'cubic-bezier(0.65, 0, 0.95, 1)' },
    { transform: `rotateZ(${inSign * bend}deg) skewX(${-inSign * +(bend * 0.65).toFixed(1)}deg) scaleX(${sq})`, offset: impactOff, easing: 'ease-out' },
    { transform: `rotateZ(${inSign * +(bend * 0.28).toFixed(1)}deg) skewX(0deg) scaleX(${+(1 + (sq - 1) * 0.25).toFixed(2)})`, offset: cushionOff, easing: 'cubic-bezier(0.25, 1.3, 0.4, 1)' },
    { transform: 'rotateZ(0deg) skewX(0deg) scaleX(1)', offset: 1 },
  ];
}

export function generateAlfaiaShadowKeyframes(
  stroke: string, isLeftSide: boolean, nextKind: AlfaiaNextStrokeKind,
  wasPressedOnSkin = false, autoLiftBeforeOtherHand = false, durationMs = 225, forceCompact = false
): Keyframe[] {
  const sUp = stroke.toUpperCase();
  if (sUp === 'A') return generateAlfaiaAbafadoShadowKeyframes(isLeftSide, wasPressedOnSkin, autoLiftBeforeOtherHand);
  const inSign = isLeftSide ? 1 : -1, { shadowDepthPx, shadowOpacity } = CONFIG_ALFAIA_STICKS;
  const { delayOff, impactOff, cushionOff } = computeElasticImpactTiming(durationMs, wasPressedOnSkin ? Math.min(12, durationMs * 0.08) : 0);
  const airY = -Math.round(shadowDepthPx * 1.5), airOp = +(shadowOpacity * 0.45).toFixed(2);
  const startFrames: Keyframe[] = wasPressedOnSkin
    ? [{ transform: 'translate(0px, 0px) scale(1)', opacity: shadowOpacity, offset: 0 }, { transform: `translate(${inSign * 5}px, ${Math.round(airY * 0.45)}px) scale(0.9)`, opacity: +(shadowOpacity * 0.62).toFixed(2), offset: delayOff }]
    : [{ transform: `translate(${inSign * 8}px, ${airY}px) scale(0.85)`, opacity: airOp, offset: 0, easing: 'cubic-bezier(0.65, 0, 0.95, 1)' }];
  if (sUp === 'C') {
    return [...startFrames, { transform: `translate(${-inSign * 16}px, ${Math.round(airY * 0.6)}px) scale(0.82)`, opacity: +(airOp * 0.75).toFixed(2), offset: impactOff }, { transform: `translate(${-inSign * 10}px, ${Math.round(airY * 0.78)}px) scale(0.84)`, opacity: +(airOp * 0.85).toFixed(2), offset: cushionOff }, { transform: getAlfaiaShadowRestTransform(isLeftSide), opacity: airOp, offset: 1 }];
  }
  const endFrame = nextKind === 'weak' || (nextKind === 'strong' && forceCompact)
    ? { transform: `translate(${inSign * 5}px, ${Math.round(airY * 0.65)}px) scale(0.89)`, opacity: +(shadowOpacity * 0.6).toFixed(2), offset: 1 }
    : { transform: `translate(${inSign * 8}px, ${airY}px) scale(0.85)`, opacity: airOp, offset: 1 };
  return [...startFrames, { transform: 'translate(0px, 4px) scale(0.95)', opacity: shadowOpacity, offset: impactOff, easing: 'ease-out' }, { transform: `translate(${inSign * 2}px, ${Math.round(airY * 0.22)}px) scale(0.92)`, opacity: +(shadowOpacity * 0.82).toFixed(2), offset: cushionOff }, endFrame];
}
