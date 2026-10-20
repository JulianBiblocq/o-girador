/**
 * O Girador - Stick Special Strokes Keyframes (Rufada, Cross-Click, Rim-Shot)
 */

import { CONFIG_STICKS } from './configSticks';

export function getRufadaKeyframes(
  baseAngle: number,
  deltaX: number,
  deltaY: number
): Keyframe[] {
  const { baseY, baseScale, rotateZMax, jitterY, scaleVariation } = CONFIG_STICKS.rufada;
  const rZ1 = baseAngle + (Math.random() - 0.5) * rotateZMax;
  const rZ2 = baseAngle + (Math.random() - 0.5) * rotateZMax;
  const rZ3 = baseAngle + (Math.random() - 0.5) * rotateZMax;
  const rZ4 = baseAngle + (Math.random() - 0.5) * rotateZMax;

  return [
    { transform: `translate(${deltaX}px, ${baseY + deltaY}px) rotateZ(${baseAngle}deg) scale(${baseScale})`, easing: 'ease-in-out' },
    { transform: `translate(${deltaX + (Math.random() - 0.5) * 4}px, ${baseY + deltaY + jitterY}px) rotateZ(${rZ1}deg) scale(${baseScale + scaleVariation})`, offset: 0.20, easing: 'ease-in-out' },
    { transform: `translate(${deltaX * 0.8 + (Math.random() - 0.5) * 4}px, ${baseY + deltaY - jitterY * 0.8}px) rotateZ(${rZ2}deg) scale(${baseScale - scaleVariation * 0.5})`, offset: 0.40, easing: 'ease-in-out' },
    { transform: `translate(${deltaX * 0.6 + (Math.random() - 0.5) * 4}px, ${baseY + deltaY + jitterY * 0.8}px) rotateZ(${rZ3}deg) scale(${baseScale + scaleVariation})`, offset: 0.60, easing: 'ease-in-out' },
    { transform: `translate(${deltaX * 0.3 + (Math.random() - 0.5) * 4}px, ${baseY + deltaY - jitterY * 0.5}px) rotateZ(${rZ4}deg) scale(${baseScale})`, offset: 0.80, easing: 'ease-out' },
    { transform: `translate(0px, ${CONFIG_STICKS.rest.translateY}px) rotateZ(${baseAngle}deg) scale(${CONFIG_STICKS.rest.scale})` },
  ];
}

export function getCrossClickKeyframes(
  baseAngle: number,
  isLeft: boolean,
  tempoFactor: number,
  baseClickScale: number
): Keyframe[] {
  const angleOffset = isLeft ? CONFIG_STICKS.crossClick.rotateZLeft : CONFIG_STICKS.crossClick.rotateZRight;
  const clickY = CONFIG_STICKS.crossClick.windUpY * tempoFactor;
  const clickScale = 1 + (baseClickScale - 1) * tempoFactor;

  return [
    { transform: `translate(0px, ${CONFIG_STICKS.rest.translateY}px) rotateZ(${baseAngle}deg) scale(${CONFIG_STICKS.rest.scale})`, easing: 'ease-out' },
    { transform: `translate(0px, ${clickY}px) rotateZ(${baseAngle + angleOffset}deg) scale(${clickScale})`, offset: 0.35, easing: 'ease-in-out' },
    { transform: `translate(0px, ${clickY}px) rotateZ(${baseAngle + angleOffset}deg) scale(${clickScale})`, offset: 0.65, easing: 'ease-out' },
    { transform: `translate(0px, ${CONFIG_STICKS.rest.translateY}px) rotateZ(${baseAngle}deg) scale(${CONFIG_STICKS.rest.scale})` },
  ];
}

export function getRimShotKeyframes(
  baseAngle: number,
  isLeft: boolean,
  tempoFactor: number,
  deltaX: number,
  deltaY: number
): Keyframe[] {
  const angleOffset = isLeft ? CONFIG_STICKS.rimShot.rotateZLeft : CONFIG_STICKS.rimShot.rotateZRight;
  const windUpY = CONFIG_STICKS.rimShot.windUpY * tempoFactor;
  const windUpScale = 1 + (CONFIG_STICKS.rimShot.windUpScale - 1) * tempoFactor;

  return [
    { transform: `translate(0px, ${CONFIG_STICKS.rest.translateY}px) rotateZ(${baseAngle}deg) scale(${CONFIG_STICKS.rest.scale})`, easing: 'ease-out' },
    { transform: `translate(0px, ${windUpY}px) rotateZ(${baseAngle + angleOffset * 0.5}deg) scale(${windUpScale})`, offset: 0.15, easing: 'cubic-bezier(0.45, 0, 0.9, 1)' },
    { transform: `translate(${deltaX}px, ${CONFIG_STICKS.rimShot.impactTranslateY + deltaY}px) rotateZ(${baseAngle + angleOffset}deg) scale(${CONFIG_STICKS.rimShot.impactScale})`, offset: 0.25, easing: 'cubic-bezier(0.15, 0.85, 0.35, 1)' },
    { transform: `translate(0px, ${CONFIG_STICKS.rimShot.reboundTranslateY}px) rotateZ(${baseAngle}deg) scale(${CONFIG_STICKS.rest.scale})`, offset: 0.40, easing: 'linear' },
    { transform: `translate(0px, ${CONFIG_STICKS.rest.translateY}px) rotateZ(${baseAngle}deg) scale(${CONFIG_STICKS.rest.scale})` },
  ];
}
