/**
 * O Girador - Agbê Animation Keyframe Generator
 */

import { CONFIG_AGBE } from './configAgbe';

export function generateAgbeKeyframes(stroke: string, _bpm: number = 100): Keyframe[] {
  const isVibrate = stroke === 'B' || stroke === 'b';
  const isVertical = ['S', 's', 'V', 'v'].includes(stroke);
  const isStrongLateral = ['D', 'E'].includes(stroke);

  if (isVibrate) {
    const { jitterX, jitterZ } = CONFIG_AGBE.shaking;
    return [
      { transform: 'translate(0px, 0px) rotateZ(0deg) scale(1, 1)', easing: 'ease-in-out' },
      { transform: `translate(${-jitterX}px, 0px) rotateZ(${-jitterZ}deg) scale(0.99, 1.01)`, offset: 0.2, easing: 'ease-in-out' },
      { transform: `translate(${jitterX}px, 0px) rotateZ(${jitterZ}deg) scale(1.01, 0.99)`, offset: 0.4, easing: 'ease-in-out' },
      { transform: `translate(${-jitterX * 0.6}px, 0px) rotateZ(${-jitterZ * 0.6}deg) scale(0.99, 1.01)`, offset: 0.6, easing: 'ease-in-out' },
      { transform: `translate(${jitterX * 0.6}px, 0px) rotateZ(${jitterZ * 0.6}deg) scale(1.01, 0.99)`, offset: 0.8, easing: 'ease-in-out' },
      { transform: 'translate(0px, 0px) rotateZ(0deg) scale(1, 1)' },
    ];
  }

  if (isVertical) {
    const isStrongVert = stroke === 'S' || stroke === 'V';
    const mult = isStrongVert ? 1 : 0.6;
    const ty = CONFIG_AGBE.impactBase.translateY * mult;
    const squashX = 1 + (CONFIG_AGBE.impactBase.squashScaleX - 1) * mult;
    const squashY = 1 + (CONFIG_AGBE.impactBase.squashScaleY - 1) * mult;

    return [
      { transform: 'translate(0px, 0px) scale(1, 1)', easing: 'cubic-bezier(0.2, 0, 0.35, 1)' },
      { transform: `translate(0px, ${ty}px) scale(${squashX}, ${squashY})`, offset: 0.18, easing: 'cubic-bezier(0.25, 1, 0.5, 1)' },
      { transform: 'translate(0px, 0px) scale(1, 1)' },
    ];
  }

  const isRight = stroke === 'D' || stroke === 'd';
  const cfg = isStrongLateral ? CONFIG_AGBE.lateralStrong : CONFIG_AGBE.lateralWeak;
  const dir = isRight ? -1 : 1;
  const tx = cfg.translateX * dir;
  const rz = cfg.rotateZ * dir;
  const microX = (cfg.microJitterX || 4) * dir;
  const microZ = (cfg.microJitterZ || 2) * dir;

  return [
    { transform: 'translate(0px, 0px) rotateZ(0deg) scale(1, 1)', easing: 'cubic-bezier(0.2, 0, 0.35, 1)' },
    { transform: `translate(${tx}px, 0px) rotateZ(${rz}deg) scale(1, 1)`, offset: 0.18, easing: 'linear' },
    { transform: `translate(${tx - microX}px, 0px) rotateZ(${rz - microZ}deg) scale(1, 1)`, offset: 0.28, easing: 'cubic-bezier(0.25, 1, 0.5, 1)' },
    { transform: 'translate(0px, 0px) rotateZ(0deg) scale(1, 1)' },
  ];
}
