/**
 * alfaiaAbafadoKinematics.ts — Cinématique WAAPI GPU du coup A (Abafado) sur Alfaia (< 120 lignes).
 * Baguette secondaire maintenue plaquée contre la peau sans rebond (et ombre portée au contact 0px, 0px)
 * jusqu'à l'amorce du prochain coup de cette même main.
 */
import {
  AlfaiaSecondaryStickFamily,
  CONFIG_ALFAIA_STICKS,
  getProfileFlexibility,
  getProfileScale,
} from './alfaiaStickConfig';
import { getEffectiveMobileOffset } from './aoVivoMobileOffsets';
import {
  buildArmedHighTransform,
  buildTuckedLowTransform,
  getHandMemory,
  setHandMemory,
} from './handTransitionEngine';

export function getAlfaiaAbafadoPoseTransform(isLeftSide: boolean, fam: AlfaiaSecondaryStickFamily): string {
  const inSign = isLeftSide ? 1 : -1;
  const profScale = getProfileScale(fam);
  const flex = getProfileFlexibility(fam);
  const c = CONFIG_ALFAIA_STICKS;
  const mobY = getEffectiveMobileOffset('alfaia').reachDeltaY;
  const isBac = fam === 'bacalhau';
  const baseSc = +(c.impactScaleZ * profScale).toFixed(3);
  const sx = isBac ? +(baseSc * (0.9 + c.bacalhau.impactSquashX * 0.1)).toFixed(3) : baseSc;
  const sy = isBac ? baseSc : +(sx * (0.96 - flex * 0.04)).toFixed(3);
  return `translate(${inSign * c.impactConvergeX}px, ${c.impactReachY + mobY}px) rotateZ(${inSign * 3.8}deg) scale(${sx}, ${sy}) skewX(0deg)`;
}

export function generateAlfaiaAbafadoStickKeyframes(
  isLeftSide: boolean,
  fam: AlfaiaSecondaryStickFamily
): Keyframe[] {
  const c = CONFIG_ALFAIA_STICKS;
  const profScale = getProfileScale(fam);
  const atkOff = Math.min(0.42, Math.max(0.08, c.attackSpeed));
  const lowTr = buildTuckedLowTransform(isLeftSide, profScale, c.transitions);
  const pressedTr = getAlfaiaAbafadoPoseTransform(isLeftSide, fam);
  const mem = getHandMemory(isLeftSide);
  const wasPressed = mem.posture === 'pressed_skin' && Boolean(mem.transform);
  const startTr = mem.posture === 'low_tucked' && mem.transform ? mem.transform : lowTr;

  setHandMemory(isLeftSide, 'pressed_skin', pressedTr);

  if (wasPressed && mem.transform) {
    return [
      { transform: mem.transform, offset: 0, easing: 'ease-out' },
      { transform: lowTr, offset: 0.06, easing: 'cubic-bezier(0.65, 0, 0.95, 1)' },
      { transform: pressedTr, offset: Math.min(0.48, +(atkOff + 0.07).toFixed(2)) },
      { transform: pressedTr, offset: 1 },
    ];
  }

  return [
    { transform: startTr, offset: 0, easing: 'cubic-bezier(0.65, 0, 0.95, 1)' },
    { transform: pressedTr, offset: atkOff },
    { transform: pressedTr, offset: 1 },
  ];
}

export function generateAlfaiaAbafadoShadowKeyframes(
  isLeftSide: boolean,
  wasPressedOnSkin: boolean
): Keyframe[] {
  const inSign = isLeftSide ? 1 : -1;
  const { shadowDepthPx, shadowOpacity, attackSpeed } = CONFIG_ALFAIA_STICKS;
  const atkOff = Math.min(0.42, Math.max(0.08, attackSpeed));
  const lowAirY = -Math.round(shadowDepthPx * 0.5);
  const lowOp = +(shadowOpacity * 0.72).toFixed(2);

  if (wasPressedOnSkin) {
    return [
      { transform: 'translate(0px, 0px) scale(1)', opacity: shadowOpacity, offset: 0 },
      { transform: `translate(${inSign * 3}px, ${Math.round(lowAirY * 0.7)}px) scale(0.94)`, opacity: lowOp, offset: 0.06 },
      { transform: 'translate(0px, 0px) scale(1)', opacity: shadowOpacity, offset: Math.min(0.48, +(atkOff + 0.07).toFixed(2)) },
      { transform: 'translate(0px, 0px) scale(1)', opacity: shadowOpacity, offset: 1 },
    ];
  }

  return [
    { transform: `translate(${inSign * 4}px, ${lowAirY}px) scale(0.92)`, opacity: lowOp, offset: 0, easing: 'cubic-bezier(0.65, 0, 0.95, 1)' },
    { transform: 'translate(0px, 0px) scale(1)', opacity: shadowOpacity, offset: atkOff },
    { transform: 'translate(0px, 0px) scale(1)', opacity: shadowOpacity, offset: 1 },
  ];
}

export function generateBacalhauAbafadoTipKeyframes(isLeftSide: boolean): Keyframe[] {
  const inSign = isLeftSide ? 1 : -1;
  const { attackSpeed, bacalhau } = CONFIG_ALFAIA_STICKS;
  const atkOff = Math.min(0.42, Math.max(0.08, attackSpeed));
  const bend = +(bacalhau.impactBendDeg * 0.6).toFixed(1);
  const sq = +(1 + (bacalhau.impactSquashX - 1) * 0.55).toFixed(2);
  const pressedTip = `rotateZ(${inSign * bend}deg) skewX(${-inSign * +(bend * 0.5).toFixed(1)}deg) scaleX(${sq})`;
  return [
    { transform: 'rotateZ(0deg) skewX(0deg) scaleX(1)', offset: 0, easing: 'cubic-bezier(0.65, 0, 0.95, 1)' },
    { transform: pressedTip, offset: atkOff },
    { transform: pressedTip, offset: 1 },
  ];
}

export function buildPostAbafadoLiftFrame(isLeftSide: boolean, fam: AlfaiaSecondaryStickFamily, isStrong: boolean): string {
  const c = CONFIG_ALFAIA_STICKS;
  const profScale = getProfileScale(fam);
  return isStrong
    ? buildArmedHighTransform(isLeftSide, profScale, Math.round(c.restOffsetY * 0.45), c.transitions)
    : buildTuckedLowTransform(isLeftSide, profScale, c.transitions);
}
