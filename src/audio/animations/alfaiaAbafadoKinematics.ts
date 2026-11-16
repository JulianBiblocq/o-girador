/**
 * alfaiaAbafadoKinematics.ts — Cinématique WAAPI GPU du coup A/a (Abafado) sur Alfaia (< 130 lignes).
 * Baguette secondaire plaquée sur la peau, avec décollement anticipé automatique avant une frappe de l'autre main.
 */
import { AlfaiaSecondaryStickFamily, CONFIG_ALFAIA_STICKS, getProfileFlexibility, getProfileScale } from './alfaiaStickConfig';
import { getEffectiveMobileOffset } from './aoVivoMobileOffsets';
import { buildArmedHighTransform, buildTuckedLowTransform, getHandMemory, setHandMemory } from './handTransitionEngine';

export function getAlfaiaAbafadoPoseTransform(isLeftSide: boolean, fam: AlfaiaSecondaryStickFamily): string {
  const inSign = isLeftSide ? 1 : -1, profScale = getProfileScale(fam), flex = getProfileFlexibility(fam);
  const c = CONFIG_ALFAIA_STICKS, mobY = getEffectiveMobileOffset('alfaia').reachDeltaY, isBac = fam === 'bacalhau';
  const baseSc = +(c.impactScaleZ * profScale).toFixed(3);
  const sx = isBac ? +(baseSc * (0.9 + c.bacalhau.impactSquashX * 0.1)).toFixed(3) : baseSc;
  const sy = isBac ? baseSc : +(sx * (0.96 - flex * 0.04)).toFixed(3);
  return `translate(${inSign * c.impactConvergeX}px, ${c.impactReachY + mobY}px) rotateZ(${inSign * 3.8}deg) scale(${sx}, ${sy}) skewX(0deg)`;
}

export function generateAlfaiaAbafadoStickKeyframes(
  isLeftSide: boolean, fam: AlfaiaSecondaryStickFamily, autoLiftBeforeOtherHand = false
): Keyframe[] {
  const c = CONFIG_ALFAIA_STICKS, profScale = getProfileScale(fam);
  const atkOff = Math.min(0.42, Math.max(0.08, c.attackSpeed));
  const lowTr = buildTuckedLowTransform(isLeftSide, profScale, c.transitions);
  const pressedTr = getAlfaiaAbafadoPoseTransform(isLeftSide, fam);
  const mem = getHandMemory(isLeftSide);
  const wasPressed = mem.posture === 'pressed_skin' && Boolean(mem.transform);
  const startTr = mem.posture === 'low_tucked' && mem.transform ? mem.transform : lowTr;
  const hitOff = wasPressed ? Math.min(0.46, +(atkOff + 0.07).toFixed(2)) : atkOff;
  const prefix: Keyframe[] = wasPressed && mem.transform
    ? [{ transform: mem.transform, offset: 0, easing: 'ease-out' }, { transform: lowTr, offset: 0.06, easing: 'cubic-bezier(0.65, 0, 0.95, 1)' }]
    : [{ transform: startTr, offset: 0, easing: 'cubic-bezier(0.65, 0, 0.95, 1)' }];

  if (autoLiftBeforeOtherHand) {
    setHandMemory(isLeftSide, 'low_tucked', lowTr);
    const holdOff = Math.min(0.84, Math.max(+(hitOff + 0.14).toFixed(2), 0.68));
    return [...prefix, { transform: pressedTr, offset: hitOff }, { transform: pressedTr, offset: holdOff, easing: 'ease-out' }, { transform: lowTr, offset: 1 }];
  }

  setHandMemory(isLeftSide, 'pressed_skin', pressedTr);
  return [...prefix, { transform: pressedTr, offset: hitOff }, { transform: pressedTr, offset: 1 }];
}

export function generateAlfaiaAbafadoShadowKeyframes(
  isLeftSide: boolean, wasPressedOnSkin: boolean, autoLiftBeforeOtherHand = false
): Keyframe[] {
  const inSign = isLeftSide ? 1 : -1;
  const { shadowDepthPx, shadowOpacity, attackSpeed } = CONFIG_ALFAIA_STICKS;
  const atkOff = Math.min(0.42, Math.max(0.08, attackSpeed));
  const lowAirY = -Math.round(shadowDepthPx * 0.5), lowOp = +(shadowOpacity * 0.72).toFixed(2);
  const hitOff = wasPressedOnSkin ? Math.min(0.46, +(atkOff + 0.07).toFixed(2)) : atkOff;
  const prefix: Keyframe[] = wasPressedOnSkin
    ? [{ transform: 'translate(0px, 0px) scale(1)', opacity: shadowOpacity, offset: 0 }, { transform: `translate(${inSign * 3}px, ${Math.round(lowAirY * 0.7)}px) scale(0.94)`, opacity: lowOp, offset: 0.06 }]
    : [{ transform: `translate(${inSign * 4}px, ${lowAirY}px) scale(0.92)`, opacity: lowOp, offset: 0, easing: 'cubic-bezier(0.65, 0, 0.95, 1)' }];

  if (autoLiftBeforeOtherHand) {
    const holdOff = Math.min(0.84, Math.max(+(hitOff + 0.14).toFixed(2), 0.68));
    return [
      ...prefix,
      { transform: 'translate(0px, 0px) scale(1)', opacity: shadowOpacity, offset: hitOff },
      { transform: 'translate(0px, 0px) scale(1)', opacity: shadowOpacity, offset: holdOff, easing: 'ease-out' },
      { transform: `translate(${inSign * 4}px, ${lowAirY}px) scale(0.92)`, opacity: lowOp, offset: 1 },
    ];
  }
  return [...prefix, { transform: 'translate(0px, 0px) scale(1)', opacity: shadowOpacity, offset: hitOff }, { transform: 'translate(0px, 0px) scale(1)', opacity: shadowOpacity, offset: 1 }];
}

export function generateBacalhauAbafadoTipKeyframes(isLeftSide: boolean, autoLiftBeforeOtherHand = false): Keyframe[] {
  const inSign = isLeftSide ? 1 : -1, { attackSpeed, bacalhau } = CONFIG_ALFAIA_STICKS;
  const atkOff = Math.min(0.42, Math.max(0.08, attackSpeed));
  const bend = +(bacalhau.impactBendDeg * 0.6).toFixed(1), sq = +(1 + (bacalhau.impactSquashX - 1) * 0.55).toFixed(2);
  const pressedTip = `rotateZ(${inSign * bend}deg) skewX(${-inSign * +(bend * 0.5).toFixed(1)}deg) scaleX(${sq})`;
  if (autoLiftBeforeOtherHand) {
    const holdOff = Math.min(0.84, Math.max(+(atkOff + 0.14).toFixed(2), 0.68));
    return [
      { transform: 'rotateZ(0deg) skewX(0deg) scaleX(1)', offset: 0, easing: 'cubic-bezier(0.65, 0, 0.95, 1)' },
      { transform: pressedTip, offset: atkOff },
      { transform: pressedTip, offset: holdOff, easing: 'ease-out' },
      { transform: 'rotateZ(0deg) skewX(0deg) scaleX(1)', offset: 1 },
    ];
  }
  return [{ transform: 'rotateZ(0deg) skewX(0deg) scaleX(1)', offset: 0, easing: 'cubic-bezier(0.65, 0, 0.95, 1)' }, { transform: pressedTip, offset: atkOff }, { transform: pressedTip, offset: 1 }];
}

export function buildPostAbafadoLiftFrame(isLeftSide: boolean, fam: AlfaiaSecondaryStickFamily, isStrong: boolean): string {
  const c = CONFIG_ALFAIA_STICKS, profScale = getProfileScale(fam);
  return isStrong ? buildArmedHighTransform(isLeftSide, profScale, Math.round(c.restOffsetY * 0.45), c.transitions) : buildTuckedLowTransform(isLeftSide, profScale, c.transitions);
}
