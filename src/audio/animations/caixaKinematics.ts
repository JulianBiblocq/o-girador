import {
  CaixaNextStrokeKind,
  CaixaStickFamily,
  CONFIG_CAIXA_STICKS,
} from './caixaStickConfig';
import { getEffectiveMobileOffset } from './aoVivoMobileOffsets';
import { resetHandPostureMemory, resolveStickStartAndEndTransforms } from './handTransitionEngine';

export * from './caixaStickConfig';
export { resetHandPostureMemory };

export function getCaixaStickRestTransform(_isLeftSide: boolean, family: CaixaStickFamily = 'caixa'): string {
  const s = +(0.95 * CONFIG_CAIXA_STICKS[family].scale).toFixed(3);
  return `translate(0px, ${-25 + CONFIG_CAIXA_STICKS.restOffsetY}px) rotateZ(0deg) scale(${s}) skewX(0deg)`;
}

export function getCaixaShadowRestTransform(isLeftSide: boolean): string {
  return `translate(${(isLeftSide ? 1 : -1) * 8}px, ${-Math.round(CONFIG_CAIXA_STICKS.shadowDepthPx * 1.5)}px) scale(0.85)`;
}

export function getCaixaImpactPoseTransform(stroke: string, isLeftSide: boolean, family: CaixaStickFamily): string {
  const inSign = isLeftSide ? 1 : -1, prof = CONFIG_CAIXA_STICKS[family], c = CONFIG_CAIXA_STICKS;
  const mobY = getEffectiveMobileOffset(family).reachDeltaY;
  const sc = (v: number) => +(v * prof.scale).toFixed(3), sUp = stroke.toUpperCase();
  if (sUp === 'C') return `translate(${c.crossClickCenterX + inSign * c.crossClickConvergeX}px, ${c.crossClickY + mobY}px) rotateZ(${inSign * c.crossClickAngleDeg}deg) scale(${sc(c.crossClickScaleZ)}) skewX(0deg)`;
  if (sUp === 'X') return `translate(${inSign * c.rimshotOffsetX}px, ${c.rimshotImpactY + mobY}px) rotateZ(${inSign * c.rimshotAngleDeg}deg) scale(${sc(c.rimshotScaleZ)}) skewX(0deg)`;
  if (sUp === 'B' || stroke === '~') return `translate(${inSign * c.impactConvergeX}px, ${c.barulhoImpactY + mobY}px) rotateZ(${inSign * 3.5}deg) scale(${sc(c.rufadaPressScaleZ)}) skewX(0deg)`;
  if (sUp === 'R') return `translate(${inSign * c.impactConvergeX}px, ${c.impactReachY + mobY}px) rotateZ(${inSign * 4}deg) scale(${sc(c.rufadaPressScaleZ)}) skewX(${-inSign * +(prof.flexibility * 1.6).toFixed(1)}deg)`;
  const isWeak = stroke === 'd' || stroke === 'e';
  const targetY = (isWeak ? Math.round(c.impactReachY * c.ghostReachRatio) : c.impactReachY) + mobY;
  const impScaleX = sc(isWeak ? Math.min(1.05, c.impactScaleZ + 0.05) : c.impactScaleZ);
  const impScaleY = +(impScaleX * (0.97 - prof.flexibility * 0.04)).toFixed(3);
  return `translate(${inSign * c.impactConvergeX}px, ${targetY}px) rotateZ(${inSign * 4}deg) scale(${impScaleX}, ${impScaleY}) skewX(${-inSign * +(prof.flexibility * 2.2).toFixed(1)}deg)`;
}

export function generateCaixaPredictiveKeyframes(
  stroke: string, isLeftSide: boolean, family: CaixaStickFamily,
  nextKind: CaixaNextStrokeKind, durationMs: number = 200, flaRole: 'none' | 'main' | 'grace' = 'none'
): Keyframe[] {
  const inSign = isLeftSide ? 1 : -1, prof = CONFIG_CAIXA_STICKS[family], flex = prof.flexibility;
  const c = CONFIG_CAIXA_STICKS, sUp = stroke.toUpperCase(), mobY = getEffectiveMobileOffset(family).reachDeltaY;
  const sc = (v: number) => +(v * prof.scale).toFixed(3);
  const atkOff = Math.min(0.42, Math.max(0.05, c.attackSpeed)), convX = inSign * c.impactConvergeX;
  const restTr = getCaixaStickRestTransform(isLeftSide, family);
  const isStrong = stroke === 'D' || stroke === 'E' || sUp === 'F' || stroke === 'S' || stroke === 'V' || sUp === 'C' || sUp === 'X';
  const { startTransform, endTransform, rebEasing } = resolveStickStartAndEndTransforms(isLeftSide, prof.scale, c.restOffsetY, restTr, c.transitions, isStrong, nextKind);

  if (stroke === '~' || sUp === 'B' || sUp === 'R') {
    const isB = sUp === 'B' || stroke === '~';
    const bounces = Math.max(2, Math.min(8, Math.round(isB ? c.barulhoBounces : c.rufadaBounces)));
    const baseY = (isB ? c.barulhoImpactY : c.impactReachY) + mobY;
    const jitY = isB ? c.barulhoJitterPx : c.rufadaBouncePx, phaseShift = isB && isLeftSide ? c.barulhoPhaseOffset : 0;
    const frames: Keyframe[] = [], totalPts = bounces * 2;
    for (let i = 0; i <= totalPts; i++) {
      const wave = Math.cos(((i / 2) + phaseShift) * Math.PI * 2), dy = Math.round(baseY + (1 - wave) * 0.5 * jitY);
      const z = sc(c.rufadaPressScaleZ + (1 - wave) * 0.02);
      frames.push({
        transform: `translate(${convX}px, ${dy}px) rotateZ(${inSign * (wave > 0 ? 4 : 2.5)}deg) scale(${z}) skewX(${-inSign * +(flex * 1.6).toFixed(1)}deg)`,
        offset: +(i / (totalPts + 1)).toFixed(3),
      });
    }
    frames.push({ transform: endTransform, offset: 1 });
    return frames;
  }

  if (sUp === 'C' || sUp === 'X') {
    return [
      { transform: startTransform, offset: 0, easing: 'cubic-bezier(0.75, 0, 1, 1)' },
      { transform: getCaixaImpactPoseTransform(sUp, isLeftSide, family), offset: atkOff, easing: rebEasing },
      { transform: endTransform, offset: 1 },
    ];
  }

  if (flaRole === 'grace') {
    const grImpactY = Math.round(c.impactReachY * c.ghostReachRatio) + mobY;
    return [
      { transform: `translate(${-inSign * 4}px, ${Math.round(c.transitions.stayLowAfterStrongY)}px) rotateZ(${-inSign * 2}deg) scale(${sc(c.flaGraceScaleZ)}) skewX(0deg)`, offset: 0, easing: 'cubic-bezier(0.75, 0, 1, 1)' },
      { transform: `translate(${convX}px, ${grImpactY}px) rotateZ(${inSign * 3}deg) scale(${sc(c.impactScaleZ + 0.03)}) skewX(${-inSign * +(flex * 1.5).toFixed(1)}deg)`, offset: Math.max(0.04, +(atkOff * 0.65).toFixed(2)), easing: rebEasing },
      { transform: endTransform, offset: 1 },
    ];
  }

  const graceDelayOff = flaRole === 'main' ? Math.min(0.26, +(c.flaGraceDelayMs / Math.max(110, durationMs)).toFixed(2)) : 0;
  const hitOff = Math.min(0.65, +(graceDelayOff + atkOff).toFixed(2));
  const holdOff = Math.min(0.85, +(hitOff + 0.03 + flex * 0.03).toFixed(2));
  const targetY = (isStrong ? c.impactReachY : Math.round(c.impactReachY * c.ghostReachRatio)) + mobY;
  const impScaleX = sc(isStrong ? c.impactScaleZ : Math.min(1.05, c.impactScaleZ + 0.05));
  const impScaleY = +(impScaleX * (0.97 - flex * 0.04)).toFixed(3);

  const frames: Keyframe[] = [{ transform: startTransform, offset: 0, easing: graceDelayOff > 0 ? 'linear' : 'cubic-bezier(0.75, 0, 1, 1)' }];
  if (graceDelayOff > 0) frames.push({ transform: startTransform, offset: graceDelayOff, easing: 'cubic-bezier(0.8, 0, 1, 1)' });
  frames.push(
    { transform: `translate(${convX}px, ${targetY}px) rotateZ(${inSign * (isStrong ? 4.5 : 2.5)}deg) scale(${impScaleX}, ${impScaleY}) skewX(${-inSign * +(flex * 2.2).toFixed(1)}deg)`, offset: hitOff },
    { transform: `translate(${convX}px, ${targetY + 4}px) rotateZ(${inSign * 3}deg) scale(${impScaleX}) skewX(0deg)`, offset: holdOff, easing: rebEasing },
    { transform: endTransform, offset: 1 }
  );
  return frames;
}

export function generateCaixaShadowKeyframes(stroke: string, isLeftSide: boolean, nextKind: CaixaNextStrokeKind): Keyframe[] {
  const inSign = isLeftSide ? 1 : -1;
  const { shadowDepthPx, shadowOpacity, attackSpeed } = CONFIG_CAIXA_STICKS;
  const atkOff = Math.min(0.42, Math.max(0.05, attackSpeed));
  const airY = -Math.round(shadowDepthPx * 1.5);
  const airOp = +(shadowOpacity * 0.42).toFixed(2);
  const sUp = stroke.toUpperCase();
  if (sUp === 'R' || sUp === 'B' || stroke === '~') {
    return [
      { transform: 'translate(0px, 3px) scale(0.95)', opacity: shadowOpacity, offset: 0 },
      { transform: 'translate(0px, -2px) scale(0.93)', opacity: +(shadowOpacity * 0.88).toFixed(2), offset: 0.5 },
      { transform: getCaixaShadowRestTransform(isLeftSide), opacity: airOp, offset: 1 },
    ];
  }
  return [
    { transform: `translate(${inSign * 8}px, ${airY}px) scale(0.85)`, opacity: airOp, offset: 0, easing: 'cubic-bezier(0.75, 0, 1, 1)' },
    { transform: 'translate(0px, 3px) scale(0.95)', opacity: shadowOpacity, offset: atkOff },
    nextKind === 'weak' || nextKind === 'rufada'
      ? { transform: `translate(${inSign * 3}px, ${Math.round(airY * 0.3)}px) scale(0.92)`, opacity: +(shadowOpacity * 0.72).toFixed(2), offset: 1 }
      : { transform: getCaixaShadowRestTransform(isLeftSide), opacity: airOp, offset: 1 },
  ];
}
