import { getEffectiveMobileOffset } from './aoVivoMobileOffsets';
import { CONFIG_TIMBAL_HANDS, TimbalNextStrokeKind } from './timbalHandConfig';
import { getHandMemory, getTransitionRiseEasing, resetHandPostureMemory, setHandMemory } from './handTransitionEngine';

export * from './timbalHandConfig';
export { resetHandPostureMemory };

function buildTransform(x: number, y: number, sx: number, sy: number, rotZ: number): string {
  return `translate3d(${Math.round(x)}px, ${Math.round(y)}px, 0) scale(${+sx.toFixed(3)}, ${+sy.toFixed(3)}) rotateZ(${+rotZ.toFixed(2)}deg)`;
}

export function getTimbalImpactPoseTransform(stroke: string, isLeftSide: boolean): string {
  const { anatomy, strokes, wristWhipDeg } = CONFIG_TIMBAL_HANDS;
  const sign = isLeftSide ? 1 : -1, hs = anatomy.handScale, sUp = stroke.toUpperCase(), mobY = getEffectiveMobileOffset('timbal').reachDeltaY;
  if (sUp === 'C' || sUp === 'X') return buildTransform(sign * strokes.clapConvergeX, strokes.clapImpactY + mobY, hs * strokes.clapProfileScaleX, hs * 1.15, sign * strokes.clapVerticalTiltDeg);
  if (sUp === 'S' || sUp === 'V') { const sc = hs * strokes.slapImpactScaleZ; return buildTransform(sign * strokes.slapConvergeX, strokes.slapImpactY + mobY, sc * 1.05, sc, sign * (wristWhipDeg + strokes.slapHandRotateDeg)); }
  if (sUp === 'A' || sUp === 'F' || sUp === 'B' || stroke === '~') { const sc = hs * strokes.abertoImpactScaleZ; return buildTransform(sign * strokes.abertoConvergeX, strokes.abertoImpactY + mobY, sc, sc * strokes.abertoFingerFlex, sign * wristWhipDeg * 0.7); }
  if (sUp === 'P') { const sc = hs * strokes.graveImpactScaleZ; return buildTransform(sign * strokes.slapConvergeX, strokes.slapImpactY + mobY, sc * strokes.gravePalmSquash, sc, sign * wristWhipDeg * 0.8); }
  if (sUp === 'D') return buildTransform(sign * strokes.abertoConvergeX, strokes.abertoImpactY - strokes.ghostAmplitudePx + mobY, hs * 0.96, hs * 0.96, sign * 1.5);
  const sc = hs * strokes.graveImpactScaleZ;
  return buildTransform(sign * strokes.graveConvergeX, strokes.graveImpactY + mobY, sc * strokes.gravePalmSquash, sc, sign * wristWhipDeg);
}

export function getTimbalHandRestTransform(isLeftSide: boolean, forceRest = false): string {
  const { posePreview, anatomy } = CONFIG_TIMBAL_HANDS;
  const mode = forceRest ? 'rest' : posePreview;
  if (mode === 'grave') return getTimbalImpactPoseTransform('G', isLeftSide);
  if (mode === 'slap') return getTimbalImpactPoseTransform('S', isLeftSide);
  if (mode === 'aberto') return getTimbalImpactPoseTransform('A', isLeftSide);
  return buildTransform(0, anatomy.restOffsetY, anatomy.handScale, anatomy.handScale, 0);
}

export function getTimbalShadowRestTransform(isLeftSide: boolean, forceRest = false): string {
  const { posePreview, shadowDepthPx } = CONFIG_TIMBAL_HANDS;
  const mode = forceRest ? 'rest' : posePreview, sign = isLeftSide ? -1 : 1;
  if (mode === 'grave' || mode === 'slap' || mode === 'aberto') return `translate3d(${sign * 3}px, 5px, 0) scale(0.98)`;
  return `translate3d(${sign * 12}px, ${Math.round(shadowDepthPx * 1.15)}px, 0) scale(1.06)`;
}

function resolveZoneTarget(sym: string, sign: number): { tx: number; ty: number } {
  const { strokes } = CONFIG_TIMBAL_HANDS;
  const mobY = getEffectiveMobileOffset('timbal').reachDeltaY;
  const up = (sym || 'A').toUpperCase();
  if (up === 'G') return { tx: sign * strokes.graveConvergeX, ty: strokes.graveImpactY + mobY };
  if (up === 'S' || up === 'P' || up === 'V') return { tx: sign * strokes.slapConvergeX, ty: strokes.slapImpactY + mobY };
  if (up === 'C' || up === 'X') return { tx: sign * strokes.clapConvergeX, ty: strokes.clapImpactY + mobY };
  return { tx: sign * strokes.abertoConvergeX, ty: strokes.abertoImpactY + mobY };
}

function resolveTimbalZonePrepTransform(
  curX: number, curY: number, nextSymbol: string, isNextWeak: boolean, isLeftSide: boolean
): string {
  const { anatomy, strokes, transitions } = CONFIG_TIMBAL_HANDS;
  const sign = isLeftSide ? 1 : -1, hs = anatomy.handScale;
  if (!nextSymbol || nextSymbol === 'idle') {
    const restTr = getTimbalHandRestTransform(isLeftSide, true);
    setHandMemory(isLeftSide, 'rest', restTr);
    return restTr;
  }
  const { tx, ty } = resolveZoneTarget(nextSymbol, sign);
  const ratio = transitions.zoneAnticipationRatio ?? 0.85;
  const nUp = nextSymbol.toUpperCase();
  const slapOut = nUp === 'S' && !isNextWeak ? -sign * strokes.slapEntryOutsideX * 0.35 : 0;
  const endX = curX + (tx - curX) * ratio + slapOut;
  const endY = ty + (isNextWeak ? transitions.stayLowAfterStrongY : transitions.liftHighAfterWeakY);
  const endSc = hs * (isNextWeak ? transitions.stayLowScaleZ : transitions.liftHighScaleZ);
  const rot = isNextWeak ? sign * 2 : -sign * transitions.liftWhipDeg * 0.6;
  const tr = buildTransform(endX, endY, endSc, endSc, rot);
  setHandMemory(isLeftSide, isNextWeak ? 'low_tucked' : 'high_armed', tr);
  return tr;
}

export function generateTimbalPredictiveKeyframes(
  stroke: string, isLeftSide: boolean, nextKind: TimbalNextStrokeKind,
  stepDurationMs: number = 150, flaRole: 'none' | 'main' | 'grace' = 'none',
  nextSymbol: string = 'idle', isNextWeak: boolean = false
): Keyframe[] {
  const { anatomy, strokes, transitions, attackSpeed, wristWhipDeg } = CONFIG_TIMBAL_HANDS;
  const sign = isLeftSide ? 1 : -1, hs = anatomy.handScale, sUp = stroke.toUpperCase();
  const isWeakStroke = ['g', 'a', 's', 'd', 'p', 'D'].includes(stroke) || flaRole === 'grace';
  const amp = isWeakStroke ? strokes.weakStrokeRatio : 1;
  const graceDelay = flaRole === 'main' ? Math.min(0.28, strokes.flaGraceDelayMs / Math.max(60, stepDurationMs)) : 0;
  const atkOff = Math.min(0.52, Math.max(0.06, (flaRole === 'grace' ? attackSpeed * 0.72 : attackSpeed) + graceDelay));
  const mem = getHandMemory(isLeftSide);
  const { tx: curX, ty: curY } = resolveZoneTarget(stroke, sign);
  const effNextSym = nextSymbol !== 'idle' ? nextSymbol : nextKind === 'idle' ? 'idle' : nextKind === 'grave' ? 'G' : nextKind === 'slap' ? 'S' : nextKind === 'ghost' ? 'd' : 'A';
  const endTr = resolveTimbalZonePrepTransform(curX, curY, effNextSym, isNextWeak || nextKind === 'ghost', isLeftSide);
  const riseEase = getTransitionRiseEasing(transitions.transitionRiseCurve);
  const fallbackStart = buildTransform(curX, curY + (isWeakStroke ? transitions.stayLowAfterStrongY : transitions.liftHighAfterWeakY), hs * (isWeakStroke ? transitions.stayLowScaleZ : transitions.liftHighScaleZ), hs * (isWeakStroke ? transitions.stayLowScaleZ : transitions.liftHighScaleZ), -sign * 3);
  const startTr = mem.posture !== 'rest' && mem.transform ? mem.transform : fallbackStart;

  if (sUp === 'C' || sUp === 'X') {
    const sx = hs * strokes.clapProfileScaleX, sy = hs * 1.15;
    return [
      { transform: buildTransform(sign * (strokes.clapConvergeX - strokes.clapRecoilPx * 1.4), strokes.clapImpactY + 10, sx * 1.08, sy * 1.04, sign * (strokes.clapVerticalTiltDeg * 0.75)), offset: 0, easing: 'cubic-bezier(0.2, 0.85, 0.3, 1)' },
      { transform: getTimbalImpactPoseTransform('C', isLeftSide), offset: atkOff, easing: 'ease-out' },
      { transform: buildTransform(sign * (strokes.clapConvergeX - strokes.clapRecoilPx), strokes.clapImpactY + 6, sx * 1.05, sy, sign * (strokes.clapVerticalTiltDeg * 0.55)), offset: Math.min(0.68, +(atkOff + 0.24).toFixed(2)), easing: riseEase },
      { transform: endTr, offset: 1 },
    ];
  }
  if (sUp === 'B' || stroke === '~') {
    const rSc = hs * strokes.abertoImpactScaleZ, ph = isLeftSide ? strokes.barulhoPhaseOffset : 0;
    return [0, 0.25, 0.5, 0.75, 1].map((t) => {
      const w = Math.cos((t + ph) * Math.PI * 2), dy = Math.round(strokes.abertoImpactY - 6 + w * 16);
      return { transform: buildTransform(sign * strokes.abertoConvergeX, dy, rSc * (w < 0 ? 1.04 : 1), rSc, sign * (w > 0 ? 4 : -3)), offset: t };
    });
  }
  if (sUp === 'D') {
    return [{ transform: startTr, offset: 0 }, { transform: getTimbalImpactPoseTransform('D', isLeftSide), offset: atkOff, easing: riseEase }, { transform: endTr, offset: 1 }];
  }
  if (sUp === 'P') {
    const holdOff = Math.min(0.84, atkOff + strokes.presoHoldMs / Math.max(70, stepDurationMs)), impTr = getTimbalImpactPoseTransform('P', isLeftSide);
    return [{ transform: startTr, offset: 0 }, { transform: impTr, offset: atkOff }, { transform: impTr, offset: holdOff, easing: riseEase }, { transform: endTr, offset: 1 }];
  }
  if (sUp === 'S') {
    const iSc = hs * strokes.slapImpactScaleZ;
    const snapOff = Math.min(0.76, atkOff + strokes.slapSnapBackMs / Math.max(70, stepDurationMs));
    const impTr = buildTransform(curX, curY, iSc * 1.05, iSc, sign * (wristWhipDeg + strokes.slapHandRotateDeg) * amp);
    const snapTr = buildTransform(curX, curY + 12, iSc * 1.06, iSc * 1.06, sign * wristWhipDeg * 0.35);
    const kf: Keyframe[] = [{ transform: startTr, offset: 0, easing: 'cubic-bezier(0.18, 0.92, 0.28, 1)' }];
    if (graceDelay > 0.02) kf.push({ transform: startTr, offset: +graceDelay.toFixed(3), easing: 'cubic-bezier(0.18, 0.92, 0.28, 1)' });
    kf.push({ transform: impTr, offset: +atkOff.toFixed(3), easing: 'cubic-bezier(0.15, 0.95, 0.25, 1)' }, { transform: snapTr, offset: +snapOff.toFixed(3), easing: riseEase }, { transform: endTr, offset: 1 });
    return kf;
  }

  const isGrave = sUp === 'G';
  const iScale = hs * (isGrave ? strokes.graveImpactScaleZ : strokes.abertoImpactScaleZ);
  const impTr = buildTransform(curX, curY, isGrave ? iScale * strokes.gravePalmSquash : iScale, isGrave ? iScale : iScale * strokes.abertoFingerFlex, sign * wristWhipDeg * amp);
  const rebOff = Math.min(0.72, atkOff + 0.18), rebTr = buildTransform(curX, curY + 10, iScale * 1.03, iScale * 1.03, sign * 2);
  const kf: Keyframe[] = [{ transform: startTr, offset: 0, easing: 'cubic-bezier(0.22, 0.88, 0.32, 1)' }];
  if (graceDelay > 0.02) kf.push({ transform: startTr, offset: +graceDelay.toFixed(3), easing: 'cubic-bezier(0.22, 0.88, 0.32, 1)' });
  kf.push({ transform: impTr, offset: +atkOff.toFixed(3), easing: 'cubic-bezier(0.25, 0.9, 0.35, 1)' }, { transform: rebTr, offset: +rebOff.toFixed(3), easing: riseEase }, { transform: endTr, offset: 1 });
  return kf;
}
