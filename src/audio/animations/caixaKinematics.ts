import {
  CaixaNextStrokeKind,
  CaixaStickFamily,
  getActiveCaixaSticksConfig,
} from './caixaStickConfig';
import { computeImpactHoldTiming } from './aoVivoBallisticMath';
import { getEffectiveMobileOffset } from './aoVivoMobileOffsets';
import { resetHandPostureMemory, resolveStickStartAndEndTransforms } from './handTransitionEngine';

export * from './caixaStickConfig';
export { resetHandPostureMemory };

export function getCaixaStickRestTransform(_isLeftSide: boolean, family: CaixaStickFamily = 'caixa'): string {
  const c = getActiveCaixaSticksConfig(family);
  const s = +(0.95 * c[family].scale).toFixed(3);
  return `translate(0px, ${-25 + c.restOffsetY}px) rotateZ(0deg) scale(${s}) skewX(0deg)`;
}

export function getCaixaShadowRestTransform(isLeftSide: boolean, family: CaixaStickFamily = 'caixa'): string {
  const c = getActiveCaixaSticksConfig(family);
  return `translate(${(isLeftSide ? 1 : -1) * 8}px, ${-Math.round(c.shadowDepthPx * 1.5)}px) scale(0.85)`;
}

export function getCaixaImpactPoseTransform(stroke: string, isLeftSide: boolean, family: CaixaStickFamily): string {
  const inSign = isLeftSide ? 1 : -1, c = getActiveCaixaSticksConfig(family), prof = c[family];
  const mobY = getEffectiveMobileOffset(family).reachDeltaY;
  const sc = (v: number) => +(v * prof.scale).toFixed(3), sUp = stroke.toUpperCase();
  if (sUp === 'C') return `translate(${c.crossClickCenterX + inSign * c.crossClickConvergeX}px, ${c.crossClickY + mobY}px) rotateZ(${inSign * c.crossClickAngleDeg}deg) scale(${sc(c.crossClickScaleZ)}) skewX(0deg)`;
  if (sUp === 'X') return `translate(${inSign * c.rimshotOffsetX}px, ${c.rimshotImpactY + mobY}px) rotateZ(${inSign * c.rimshotAngleDeg}deg) scale(${sc(c.rimshotScaleZ)}) skewX(0deg)`;
  if (sUp === 'A') {
    const isSubtle = stroke === 'a', ratio = isSubtle ? c.rimshotWeakRatio : 1;
    const rimSkinY = Math.round(c.rimshotSkinImpactY * ratio) + mobY;
    const rimSkinX = Math.round(inSign * c.rimshotSkinOffsetX * ratio);
    const rimZ = sc(isSubtle ? Math.min(1.12, c.rimshotImpactScaleZ + (1 - ratio) * 0.25) : c.rimshotImpactScaleZ);
    return `translate(${rimSkinX}px, ${rimSkinY}px) rotateZ(${+(inSign * c.rimshotSkinAngleDeg).toFixed(1)}deg) scale(${rimZ}) skewX(${-inSign * +(prof.flexibility * 1.9).toFixed(1)}deg)`;
  }
  if (sUp === 'B' || stroke === '~') return `translate(${inSign * c.impactConvergeX}px, ${c.barulhoImpactY + mobY}px) rotateZ(${inSign * 3.5}deg) scale(${sc(c.rufadaPressScaleZ)}) skewX(0deg)`;
  if (sUp === 'R') return `translate(${inSign * c.impactConvergeX}px, ${c.impactReachY + mobY}px) rotateZ(${inSign * 4}deg) scale(${sc(c.rufadaPressScaleZ)}) skewX(${-inSign * +(prof.flexibility * 1.6).toFixed(1)}deg)`;
  const isWeak = stroke === 'd' || stroke === 'e';
  const targetY = (isWeak ? Math.round(c.impactReachY * c.ghostReachRatio) : c.impactReachY) + mobY;
  const impScaleX = sc(isWeak ? Math.min(1.05, c.impactScaleZ + 0.05) : c.impactScaleZ);
  const impScaleY = +(impScaleX * (0.97 - prof.flexibility * 0.04)).toFixed(3);
  return `translate(${inSign * c.impactConvergeX}px, ${targetY}px) rotateZ(${inSign * 4}deg) scale(${impScaleX}, ${impScaleY}) skewX(${-inSign * +(prof.flexibility * 2.2).toFixed(1)}deg)`;
}

export function generateCaixaBarulhoLoopFrames(isLeftSide: boolean, family: CaixaStickFamily, amplitude = 1): Keyframe[] {
  const inSign = isLeftSide ? 1 : -1, c = getActiveCaixaSticksConfig(family), prof = c[family];
  const baseY = c.barulhoImpactY + getEffectiveMobileOffset(family).reachDeltaY;
  const jitY = Math.max(1.2, c.barulhoJitterPx * amplitude), ph = isLeftSide ? c.barulhoPhaseOffset : 0;
  const sc = (v: number) => +(v * prof.scale).toFixed(3), skew = -inSign * +(prof.flexibility * 1.6).toFixed(1);
  return [0, 0.25, 0.5, 0.75, 1].map((t) => {
    const w = Math.cos((t + ph) * Math.PI * 2), dy = +(baseY + (1 - w) * 0.5 * jitY).toFixed(1);
    return { transform: `translate(${inSign * c.impactConvergeX}px, ${dy}px) rotateZ(${+(inSign * (2.6 + (w + 1) * 0.7 * amplitude)).toFixed(2)}deg) scale(${sc(c.rufadaPressScaleZ + (1 - w) * 0.02 * amplitude)}) skewX(${skew}deg)`, offset: t };
  });
}

export function generateCaixaPredictiveKeyframes(
  stroke: string, isLeftSide: boolean, family: CaixaStickFamily,
  nextKind: CaixaNextStrokeKind, durationMs: number = 225, flaRole: 'none' | 'main' | 'grace' = 'none', realMsUntilNext?: number
): Keyframe[] {
  const inSign = isLeftSide ? 1 : -1, c = getActiveCaixaSticksConfig(family), prof = c[family], flex = prof.flexibility;
  const sUp = stroke.toUpperCase(), mobY = getEffectiveMobileOffset(family).reachDeltaY;
  const sc = (v: number) => +(v * prof.scale).toFixed(3), convX = inSign * c.impactConvergeX;
  const restTr = getCaixaStickRestTransform(isLeftSide, family);
  const isStrong = stroke === 'D' || stroke === 'E' || sUp === 'A' || sUp === 'F' || stroke === 'S' || stroke === 'V' || sUp === 'C' || sUp === 'X';
  const { startTransform, endTransform, rebEasing } = resolveStickStartAndEndTransforms(isLeftSide, prof.scale, c.restOffsetY, restTr, c.transitions, isStrong, nextKind, realMsUntilNext);

  if (stroke === '~' || sUp === 'B' || sUp === 'R') {
    if (sUp === 'B' || stroke === '~') return generateCaixaBarulhoLoopFrames(isLeftSide, family, stroke === 'b' ? 0.6 : 1);
    const bounces = Math.max(2, Math.min(8, Math.round(c.rufadaBounces))), baseY = c.impactReachY + mobY;
    const frames: Keyframe[] = [], totalPts = bounces * 2;
    for (let i = 0; i <= totalPts; i++) {
      const wave = Math.cos((i / 2) * Math.PI * 2), dy = Math.round(baseY + (1 - wave) * 0.5 * c.rufadaBouncePx);
      frames.push({ transform: `translate(${convX}px, ${dy}px) rotateZ(${inSign * (wave > 0 ? 4 : 2.5)}deg) scale(${sc(c.rufadaPressScaleZ + (1 - wave) * 0.02)}) skewX(${-inSign * +(flex * 1.6).toFixed(1)}deg)`, offset: +(i / (totalPts + 1)).toFixed(3) });
    }
    frames.push({ transform: endTransform, offset: 1 });
    return frames;
  }

  const graceMs = flaRole === 'main' ? c.flaGraceDelayMs : 0;
  const { delayOff, impactOff, holdEndOff } = computeImpactHoldTiming(durationMs, graceMs);

  if (sUp === 'C' || sUp === 'X') {
    const impTr = getCaixaImpactPoseTransform(stroke, isLeftSide, family);
    return [{ transform: startTransform, offset: 0, easing: 'cubic-bezier(0.75, 0, 1, 1)' }, { transform: impTr, offset: impactOff }, { transform: impTr, offset: holdEndOff, easing: rebEasing }, { transform: endTransform, offset: 1 }];
  }
  if (sUp === 'A') {
    const isSubtle = stroke === 'a', ratio = isSubtle ? c.rimshotWeakRatio : 1;
    const wZ = sc(c.rimshotWindUpScaleZ * (isSubtle ? 0.85 + 0.15 * ratio : 1));
    const windUpTr = `translate(${Math.round(inSign * c.rimshotSkinOffsetX * 0.45)}px, ${Math.round(c.restOffsetY + 18 * ratio)}px) rotateZ(${-inSign * +(c.wristWhipDeg * 0.9).toFixed(1)}deg) scale(${wZ}) skewX(0deg)`;
    const impTr = getCaixaImpactPoseTransform(stroke, isLeftSide, family);
    return [{ transform: windUpTr, offset: 0, easing: 'cubic-bezier(0.78, 0, 1, 1)' }, { transform: impTr, offset: impactOff }, { transform: impTr, offset: holdEndOff, easing: rebEasing }, { transform: endTransform, offset: 1 }];
  }
  if (flaRole === 'grace') {
    const grImpactY = Math.round(c.impactReachY * c.ghostReachRatio) + mobY;
    const grImpTr = `translate(${convX}px, ${grImpactY}px) rotateZ(${inSign * 3}deg) scale(${sc(c.impactScaleZ + 0.03)}) skewX(${-inSign * +(flex * 1.5).toFixed(1)}deg)`;
    return [
      { transform: `translate(${-inSign * 4}px, ${Math.round(c.transitions.stayLowAfterStrongY)}px) rotateZ(${-inSign * 2}deg) scale(${sc(c.flaGraceScaleZ)}) skewX(0deg)`, offset: 0, easing: 'cubic-bezier(0.75, 0, 1, 1)' },
      { transform: grImpTr, offset: impactOff },
      { transform: grImpTr, offset: holdEndOff, easing: rebEasing },
      { transform: endTransform, offset: 1 },
    ];
  }

  const targetY = (isStrong ? c.impactReachY : Math.round(c.impactReachY * c.ghostReachRatio)) + mobY;
  const impScaleX = sc(isStrong ? c.impactScaleZ : Math.min(1.05, c.impactScaleZ + 0.05));
  const impScaleY = +(impScaleX * (0.97 - flex * 0.04)).toFixed(3);
  const frames: Keyframe[] = [{ transform: startTransform, offset: 0, easing: delayOff > 0 ? 'linear' : 'cubic-bezier(0.75, 0, 1, 1)' }];
  if (delayOff > 0) frames.push({ transform: startTransform, offset: delayOff, easing: 'cubic-bezier(0.8, 0, 1, 1)' });
  frames.push(
    { transform: `translate(${convX}px, ${targetY}px) rotateZ(${inSign * (isStrong ? 4.5 : 2.5)}deg) scale(${impScaleX}, ${impScaleY}) skewX(${-inSign * +(flex * 2.2).toFixed(1)}deg)`, offset: impactOff },
    { transform: `translate(${convX}px, ${targetY + 3}px) rotateZ(${inSign * 3}deg) scale(${impScaleX}) skewX(0deg)`, offset: holdEndOff, easing: rebEasing },
    { transform: endTransform, offset: 1 }
  );
  return frames;
}

export function generateCaixaShadowKeyframes(
  stroke: string, isLeftSide: boolean, nextKind: CaixaNextStrokeKind,
  family: CaixaStickFamily = 'caixa', durationMs = 225, forceCompact = false
): Keyframe[] {
  const inSign = isLeftSide ? 1 : -1, { shadowDepthPx, shadowOpacity } = getActiveCaixaSticksConfig(family);
  const { impactOff, holdEndOff } = computeImpactHoldTiming(durationMs);
  const airY = -Math.round(shadowDepthPx * 1.5), airOp = +(shadowOpacity * 0.42).toFixed(2), sUp = stroke.toUpperCase();
  if (sUp === 'R' || sUp === 'B' || stroke === '~') {
    return [{ transform: 'translate(0px, 3px) scale(0.95)', opacity: shadowOpacity, offset: 0 }, { transform: 'translate(0px, -2px) scale(0.93)', opacity: +(shadowOpacity * 0.88).toFixed(2), offset: 0.5 }, { transform: getCaixaShadowRestTransform(isLeftSide, family), opacity: airOp, offset: 1 }];
  }
  const endSh = nextKind === 'weak' || nextKind === 'rufada' || (nextKind === 'strong' && forceCompact)
    ? { transform: `translate(${inSign * 3}px, ${Math.round(airY * 0.3)}px) scale(0.92)`, opacity: +(shadowOpacity * 0.72).toFixed(2), offset: 1 }
    : { transform: getCaixaShadowRestTransform(isLeftSide, family), opacity: airOp, offset: 1 };
  return [{ transform: `translate(${inSign * 8}px, ${airY}px) scale(0.85)`, opacity: airOp, offset: 0, easing: 'cubic-bezier(0.75, 0, 1, 1)' }, { transform: 'translate(0px, 3px) scale(0.95)', opacity: shadowOpacity, offset: impactOff }, { transform: 'translate(0px, 3px) scale(0.95)', opacity: shadowOpacity, offset: holdEndOff }, endSh];
}
