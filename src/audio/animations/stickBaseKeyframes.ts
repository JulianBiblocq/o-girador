/**
 * O Girador - Universal Stick Keyframes Generator (Alfaia, Caixa, Tarol)
 */

import { CONFIG_STICKS } from './configSticks';
import { calculateTempoFactor } from './animationTiming';
import { getRufadaKeyframes, getCrossClickKeyframes, getRimShotKeyframes } from './stickSpecialStrokes';

export function buildStickKeyframes(
  stroke: string,
  isLeft: boolean,
  bpm: number = 100,
  instType: 'alfaia' | 'drum' = 'alfaia',
  isLeftHanded: boolean = false
): Keyframe[] {
  let baseAngle: number;
  if (instType === 'alfaia') {
    if (!isLeftHanded) {
      baseAngle = isLeft ? CONFIG_STICKS.angles.alfaia.bacalhau : CONFIG_STICKS.angles.alfaia.macaneta;
    } else {
      baseAngle = isLeft ? -CONFIG_STICKS.angles.alfaia.macaneta : -CONFIG_STICKS.angles.alfaia.bacalhau;
    }
  } else {
    baseAngle = isLeft ? CONFIG_STICKS.angles.drum.left : CONFIG_STICKS.angles.drum.right;
  }

  const whipWindUpRot = isLeft ? baseAngle - CONFIG_STICKS.angles.wristWhipAngle : baseAngle + CONFIG_STICKS.angles.wristWhipAngle;
  const whipImpactRot = isLeft ? baseAngle + CONFIG_STICKS.angles.wristWhipAngle : baseAngle - CONFIG_STICKS.angles.wristWhipAngle;

  const handBiasX = isLeft ? -CONFIG_STICKS.spacing.handSeparationX : CONFIG_STICKS.spacing.handSeparationX;
  const deltaX = handBiasX + (Math.random() - 0.5) * CONFIG_STICKS.spacing.spreadX;
  const deltaY = (Math.random() - 0.5) * CONFIG_STICKS.spacing.spreadY;
  const jitterRot = (Math.random() - 0.5) * CONFIG_STICKS.angles.rotJitter;
  const tempoFactor = calculateTempoFactor(bpm);

  const baseStrongScale = instType === 'alfaia' ? CONFIG_STICKS.strong.windUp.scaleAlfaia : CONFIG_STICKS.strong.windUp.scaleDrum;
  const baseWeakScale = instType === 'alfaia' ? CONFIG_STICKS.weak.windUp.scaleAlfaia : CONFIG_STICKS.weak.windUp.scaleDrum;
  const baseClickScale = instType === 'alfaia' ? CONFIG_STICKS.crossClick.scaleAlfaia : CONFIG_STICKS.crossClick.scaleDrum;

  if (stroke === 'R' || stroke === 'r') return getRufadaKeyframes(baseAngle, deltaX, deltaY);
  if (stroke === 'C' || stroke === 'c') return getCrossClickKeyframes(baseAngle, isLeft, tempoFactor, baseClickScale);
  if (stroke === 'X' || stroke === 'x') return getRimShotKeyframes(baseAngle, isLeft, tempoFactor, deltaX, deltaY);

  if (stroke === 'b' || stroke === 'B') {
    return [
      { transform: `translate(0px, ${CONFIG_STICKS.rest.translateY}px) rotateZ(${baseAngle}deg) scale(${CONFIG_STICKS.rest.scale})`, easing: 'ease-in-out' },
      { transform: `translate(${-8 + deltaX}px, ${CONFIG_STICKS.rest.translateY - 8 + deltaY}px) rotateZ(${baseAngle - 1}deg) scale(${CONFIG_STICKS.rest.scale})`, offset: 0.25, easing: 'ease-in-out' },
      { transform: `translate(${8 - deltaX}px, ${CONFIG_STICKS.rest.translateY + 8 - deltaY}px) rotateZ(${baseAngle + 1}deg) scale(${CONFIG_STICKS.rest.scale})`, offset: 0.50, easing: 'ease-in-out' },
      { transform: `translate(${-8 + deltaX}px, ${CONFIG_STICKS.rest.translateY - 8 + deltaY}px) rotateZ(${baseAngle - 1}deg) scale(${CONFIG_STICKS.rest.scale})`, offset: 0.75, easing: 'ease-in-out' },
      { transform: `translate(0px, ${CONFIG_STICKS.rest.translateY}px) rotateZ(${baseAngle}deg) scale(${CONFIG_STICKS.rest.scale})` },
    ];
  }

  const isStrong = ['D', 'E', 'I', 'F', 'fla-strong'].includes(stroke);
  if (isStrong) {
    const windUpScale = 1 + (baseStrongScale - 1) * tempoFactor;
    const windUpY = CONFIG_STICKS.strong.windUp.translateY * tempoFactor;
    return [
      { transform: `translate(0px, ${CONFIG_STICKS.rest.translateY}px) rotateZ(${baseAngle}deg) scale(${CONFIG_STICKS.rest.scale})`, easing: 'ease-out' },
      { transform: `translate(0px, ${windUpY}px) rotateZ(${whipWindUpRot}deg) scale(${windUpScale})`, offset: CONFIG_STICKS.strong.windUp.offset, easing: CONFIG_STICKS.strong.windUp.easing },
      { transform: `translate(${deltaX}px, ${CONFIG_STICKS.strong.impact.translateY + deltaY}px) rotateZ(${whipImpactRot + jitterRot}deg) scale(${CONFIG_STICKS.strong.impact.scale})`, offset: CONFIG_STICKS.strong.impact.offset, easing: CONFIG_STICKS.strong.impact.easing },
      { transform: `translate(0px, ${CONFIG_STICKS.strong.rebound.translateY}px) rotateZ(${baseAngle}deg) scale(${CONFIG_STICKS.strong.rebound.scale})`, offset: CONFIG_STICKS.strong.rebound.offset, easing: CONFIG_STICKS.strong.rebound.easing },
      { transform: `translate(0px, ${CONFIG_STICKS.strong.rebound.translateY}px) rotateZ(${baseAngle}deg) scale(${CONFIG_STICKS.strong.rebound.scale})` },
    ];
  }

  const windUpScale = 1 + (baseWeakScale - 1) * tempoFactor;
  const windUpY = CONFIG_STICKS.rest.translateY + (CONFIG_STICKS.weak.windUp.translateY - CONFIG_STICKS.rest.translateY) * tempoFactor;
  return [
    { transform: `translate(0px, ${CONFIG_STICKS.rest.translateY}px) rotateZ(${baseAngle}deg) scale(${CONFIG_STICKS.rest.scale})`, easing: 'ease-out' },
    { transform: `translate(0px, ${windUpY}px) rotateZ(${whipWindUpRot * 0.7 + baseAngle * 0.3}deg) scale(${windUpScale})`, offset: CONFIG_STICKS.weak.windUp.offset, easing: CONFIG_STICKS.weak.windUp.easing },
    { transform: `translate(${deltaX}px, ${CONFIG_STICKS.weak.impact.translateY + deltaY}px) rotateZ(${whipImpactRot * 0.7 + baseAngle * 0.3 + jitterRot}deg) scale(${CONFIG_STICKS.weak.impact.scale})`, offset: CONFIG_STICKS.weak.impact.offset, easing: CONFIG_STICKS.weak.impact.easing },
    { transform: `translate(0px, ${CONFIG_STICKS.weak.rebound.translateY}px) rotateZ(${baseAngle}deg) scale(${CONFIG_STICKS.weak.rebound.scale})`, offset: CONFIG_STICKS.weak.rebound.offset, easing: CONFIG_STICKS.weak.rebound.easing },
    { transform: `translate(0px, ${CONFIG_STICKS.weak.rebound.translateY}px) rotateZ(${baseAngle}deg) scale(${CONFIG_STICKS.weak.rebound.scale})` },
  ];
}
