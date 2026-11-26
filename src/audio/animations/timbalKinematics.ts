import { computeElasticImpactTiming, isFastRepeatCompactPrep } from './aoVivoBallisticMath';
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
  if (sUp === 'S' || sUp === 'T' || sUp === 'V') { const sc = hs * strokes.slapImpactScaleZ; return buildTransform(sign * strokes.slapConvergeX, strokes.slapImpactY + mobY, sc * 1.05, sc, sign * (wristWhipDeg + strokes.slapHandRotateDeg)); }
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
  const mobY = getEffectiveMobileOffset('timbal').reachDeltaY, up = (sym || 'A').toUpperCase();
  if (up === 'G') return { tx: sign * strokes.graveConvergeX, ty: strokes.graveImpactY + mobY };
  if (up === 'S' || up === 'T' || up === 'P' || up === 'V') return { tx: sign * strokes.slapConvergeX, ty: strokes.slapImpactY + mobY };
  if (up === 'C' || up === 'X') return { tx: sign * strokes.clapConvergeX, ty: strokes.clapImpactY + mobY };
  return { tx: sign * strokes.abertoConvergeX, ty: strokes.abertoImpactY + mobY };
}

function resolveTimbalZonePrepTransform(
  curX: number, _curY: number, nextSymbol: string, isNextWeak: boolean, isLeftSide: boolean, realMsUntilNext?: number
): string {
  const { anatomy, strokes, transitions } = CONFIG_TIMBAL_HANDS, sign = isLeftSide ? 1 : -1, hs = anatomy.handScale;
  if (!nextSymbol || nextSymbol === 'idle') {
    const restTr = getTimbalHandRestTransform(isLeftSide, true);
    setHandMemory(isLeftSide, 'rest', restTr);
    return restTr;
  }
  const compact = isNextWeak || isFastRepeatCompactPrep(realMsUntilNext);
  const { tx, ty } = resolveZoneTarget(nextSymbol, sign);
  const ratio = transitions.zoneAnticipationRatio ?? 0.85, nUp = nextSymbol.toUpperCase();
  const slapOut = (nUp === 'S' || nUp === 'T') && !compact ? -sign * strokes.slapEntryOutsideX * 0.28 : 0;
  const endX = curX + (tx - curX) * ratio + slapOut, endY = ty + (compact ? -14 : -26);
  const endSc = hs * (compact ? 0.97 : 1.04), rot = compact ? sign * 1.5 : -sign * Math.min(4.5, transitions.liftWhipDeg * 0.45);
  const tr = buildTransform(endX, endY, endSc, endSc, rot);
  setHandMemory(isLeftSide, compact ? 'low_tucked' : 'high_armed', tr);
  return tr;
}

export function generateTimbalBarulhoLoopFrames(isLeftSide: boolean, amplitude = 1): Keyframe[] {
  const { anatomy, strokes } = CONFIG_TIMBAL_HANDS, sign = isLeftSide ? 1 : -1;
  const rSc = anatomy.handScale * strokes.abertoImpactScaleZ, ph = isLeftSide ? strokes.barulhoPhaseOffset : 0;
  const baseY = strokes.abertoImpactY + getEffectiveMobileOffset('timbal').reachDeltaY - 4, jit = 14 * amplitude;
  return [0, 0.25, 0.5, 0.75, 1].map((t) => {
    const w = Math.cos((t + ph) * Math.PI * 2);
    return { transform: buildTransform(sign * strokes.abertoConvergeX, Math.round(baseY + w * jit), rSc * (w < 0 ? 1 + 0.04 * amplitude : 1), rSc, sign * (w > 0 ? 4 * amplitude : -3 * amplitude)), offset: t };
  });
}

export function resolveTimbalBarulhoBounds(isLeftSide: boolean, nextSymbol = 'idle', isNextWeak = false): { startTr: string; endTr: string } {
  const { anatomy } = CONFIG_TIMBAL_HANDS, sign = isLeftSide ? 1 : -1, hs = anatomy.handScale;
  const mem = getHandMemory(isLeftSide), { tx, ty } = resolveZoneTarget('A', sign);
  const startTr = mem.posture !== 'rest' && mem.transform ? mem.transform : buildTransform(tx, ty - 24, hs * 1.03, hs * 1.03, -sign * 3);
  return { startTr, endTr: resolveTimbalZonePrepTransform(tx, ty, nextSymbol, isNextWeak, isLeftSide) };
}

export function generateTimbalPredictiveKeyframes(
  stroke: string, isLeftSide: boolean, nextKind: TimbalNextStrokeKind,
  durationMs: number = 225, flaRole: 'none' | 'main' | 'grace' = 'none',
  nextSymbol: string = 'idle', isNextWeak: boolean = false, realMsUntilNext?: number
): Keyframe[] {
  const { anatomy, strokes, transitions, wristWhipDeg } = CONFIG_TIMBAL_HANDS;
  const sign = isLeftSide ? 1 : -1, hs = anatomy.handScale, sUp = stroke.toUpperCase();
  if (sUp === 'B' || stroke === '~') return generateTimbalBarulhoLoopFrames(isLeftSide, stroke === 'b' ? 0.6 : 1);
  const isWeakStroke = ['g', 'a', 's', 't', 'd', 'p', 'D'].includes(stroke) || flaRole === 'grace';
  const amp = isWeakStroke ? strokes.weakStrokeRatio : 1;
  const { delayOff, impactOff, cushionOff } = computeElasticImpactTiming(durationMs, flaRole === 'main' ? strokes.flaGraceDelayMs : 0);
  const mem = getHandMemory(isLeftSide), { tx: curX, ty: curY } = resolveZoneTarget(stroke, sign);
  const effNextSym = nextSymbol !== 'idle' ? nextSymbol : nextKind === 'idle' ? 'idle' : nextKind === 'grave' ? 'G' : nextKind === 'slap' ? 'S' : nextKind === 'ghost' ? 'd' : 'A';
  const endTr = resolveTimbalZonePrepTransform(curX, curY, effNextSym, isNextWeak || nextKind === 'ghost', isLeftSide, realMsUntilNext);
  const riseEase = getTransitionRiseEasing(transitions.transitionRiseCurve);
  const fallbackStart = buildTransform(curX, curY - (isWeakStroke ? 14 : 28), hs * (isWeakStroke ? 0.97 : 1.05), hs * (isWeakStroke ? 0.97 : 1.05), -sign * 3);
  const startTr = mem.posture !== 'rest' && mem.transform ? mem.transform : fallbackStart;

  if (sUp === 'C' || sUp === 'X') {
    const sx = hs * strokes.clapProfileScaleX, sy = hs * 1.15, imp = getTimbalImpactPoseTransform('C', isLeftSide);
    const wind = buildTransform(sign * (strokes.clapConvergeX - strokes.clapRecoilPx * 1.35), strokes.clapImpactY + 8, sx * 1.06, sy * 1.03, sign * (strokes.clapVerticalTiltDeg * 0.78));
    const recoil = buildTransform(sign * (strokes.clapConvergeX - strokes.clapRecoilPx * 0.55), strokes.clapImpactY + 4, sx * 1.02, sy * 1.01, sign * (strokes.clapVerticalTiltDeg * 0.9));
    return [{ transform: wind, offset: 0, easing: 'cubic-bezier(0.28, 0.75, 0.35, 1)' }, { transform: imp, offset: impactOff, easing: 'ease-out' }, { transform: recoil, offset: cushionOff, easing: riseEase }, { transform: endTr, offset: 1 }];
  }
  if (sUp === 'D') {
    const imp = getTimbalImpactPoseTransform('D', isLeftSide);
    const cush = buildTransform(curX, curY - strokes.ghostAmplitudePx - 8, hs * 0.97, hs * 0.97, sign * 0.8);
    return [{ transform: startTr, offset: 0, easing: 'ease-out' }, { transform: imp, offset: impactOff, easing: 'ease-out' }, { transform: cush, offset: cushionOff, easing: riseEase }, { transform: endTr, offset: 1 }];
  }
  if (sUp === 'P') {
    const presoHoldOff = Math.min(0.84, Math.max(cushionOff, +(impactOff + strokes.presoHoldMs / Math.max(70, durationMs)).toFixed(3)));
    const impTr = getTimbalImpactPoseTransform('P', isLeftSide);
    return [{ transform: startTr, offset: 0, easing: 'cubic-bezier(0.45, 0, 0.9, 1)' }, { transform: impTr, offset: impactOff }, { transform: impTr, offset: presoHoldOff, easing: riseEase }, { transform: endTr, offset: 1 }];
  }
  if (sUp === 'S' || sUp === 'T') {
    const iSc = hs * strokes.slapImpactScaleZ;
    const impTr = buildTransform(curX, curY, iSc * 1.05, iSc, sign * (wristWhipDeg + strokes.slapHandRotateDeg) * amp);
    const snapTr = buildTransform(curX, curY - 14, hs * 1.02, hs * 1.02, sign * wristWhipDeg * 0.18);
    const kf: Keyframe[] = [{ transform: startTr, offset: 0, easing: 'cubic-bezier(0.32, 0.75, 0.35, 1)' }];
    if (delayOff > 0.02) kf.push({ transform: startTr, offset: delayOff, easing: 'cubic-bezier(0.32, 0.75, 0.35, 1)' });
    kf.push({ transform: impTr, offset: impactOff, easing: 'cubic-bezier(0.16, 0.78, 0.32, 1)' }, { transform: snapTr, offset: cushionOff, easing: riseEase }, { transform: endTr, offset: 1 });
    return kf;
  }

  const isGrave = sUp === 'G', iScale = hs * (isGrave ? strokes.graveImpactScaleZ : strokes.abertoImpactScaleZ);
  const impTr = buildTransform(curX, curY, isGrave ? iScale * strokes.gravePalmSquash : iScale, isGrave ? iScale : iScale * strokes.abertoFingerFlex, sign * wristWhipDeg * amp);
  const rebTr = buildTransform(curX, curY - 12, hs * 1.01, hs * 1.01, sign * 1.5);
  const kf: Keyframe[] = [{ transform: startTr, offset: 0, easing: 'cubic-bezier(0.35, 0.72, 0.36, 1)' }];
  if (delayOff > 0.02) kf.push({ transform: startTr, offset: delayOff, easing: 'cubic-bezier(0.35, 0.72, 0.36, 1)' });
  kf.push({ transform: impTr, offset: impactOff, easing: 'cubic-bezier(0.18, 0.74, 0.34, 1)' }, { transform: rebTr, offset: cushionOff, easing: riseEase }, { transform: endTr, offset: 1 });
  return kf;
}
