/**
 * O Girador - Timbal Animation Keyframe Generator
 */

import { CONFIG_TIMBAL } from './configTimbal';

export function generateTimbalKeyframes(stroke: string, isLeft: boolean): { keyframes: Keyframe[]; duration: number } {
  const baseAngle = isLeft ? CONFIG_TIMBAL.vShapeAngle : -CONFIG_TIMBAL.vShapeAngle;
  const offset = CONFIG_TIMBAL.baseOffsetY;
  const restY = CONFIG_TIMBAL.rest.y + offset;
  const scaleMult = CONFIG_TIMBAL.handScale;
  const restScale = CONFIG_TIMBAL.rest.scale * scaleMult;
  const restTransform = `translate3d(0, ${restY}px, 0) scale(${restScale}) rotateZ(${baseAngle}deg)`;

  const isVibrate = stroke === 'b' || stroke === 'B';
  if (isVibrate) {
    return {
      duration: 100,
      keyframes: [
        { transform: restTransform, easing: 'ease-in-out' },
        { transform: `translate3d(-4px, ${restY - 3}px, 0) scale(${restScale}) rotateZ(${baseAngle}deg)`, offset: 0.25, easing: 'ease-in-out' },
        { transform: `translate3d(4px, ${restY + 3}px, 0) scale(${restScale}) rotateZ(${baseAngle}deg)`, offset: 0.5, easing: 'ease-in-out' },
        { transform: `translate3d(-4px, ${restY - 2}px, 0) scale(${restScale}) rotateZ(${baseAngle}deg)`, offset: 0.75, easing: 'ease-in-out' },
        { transform: restTransform },
      ],
    };
  }

  if (stroke === 'G' || stroke === 'g') {
    const graveScale = CONFIG_TIMBAL.grave.scale * scaleMult;
    return {
      duration: CONFIG_TIMBAL.grave.duration,
      keyframes: [
        { transform: restTransform, easing: 'cubic-bezier(0.2, 0, 0.35, 1)' },
        { transform: `translate3d(0, ${CONFIG_TIMBAL.grave.impactY + offset}px, 0) scale(${graveScale}) rotateZ(${baseAngle}deg)`, offset: 0.24, easing: 'ease-out' },
        { transform: `translate3d(0, ${CONFIG_TIMBAL.grave.reboundY + offset}px, 0) scale(${graveScale}) rotateZ(${baseAngle}deg)`, offset: 0.45, easing: 'ease-in-out' },
        { transform: restTransform },
      ],
    };
  }

  if (stroke === 'S' || stroke === 's') {
    const slapWindScale = CONFIG_TIMBAL.slap.windUpScale * scaleMult;
    const slapImpactScale = CONFIG_TIMBAL.slap.impactScale * scaleMult;
    return {
      duration: CONFIG_TIMBAL.slap.duration,
      keyframes: [
        { transform: restTransform, easing: 'ease-out' },
        { transform: `translate3d(0, ${CONFIG_TIMBAL.slap.windUpY + offset}px, 0) scale(${slapWindScale}) rotateZ(${baseAngle}deg)`, offset: 0.12, easing: 'cubic-bezier(0.8, 0, 1, 1)' },
        { transform: `translate3d(0, ${CONFIG_TIMBAL.slap.impactY + offset}px, 0) scale(${slapImpactScale}) rotateZ(${baseAngle}deg)`, offset: 0.22, easing: 'ease-out' },
        { transform: `translate3d(0, ${CONFIG_TIMBAL.slap.reboundY + offset}px, 0) scale(${0.98 * scaleMult}) rotateZ(${baseAngle}deg)`, offset: 0.32, easing: 'ease-out' },
        { transform: restTransform },
      ],
    };
  }

  if (stroke === 'A' || stroke === 'a') {
    const abertoScale = CONFIG_TIMBAL.aberto.scale * scaleMult;
    return {
      duration: CONFIG_TIMBAL.aberto.duration,
      keyframes: [
        { transform: restTransform, easing: 'cubic-bezier(0.4, 0, 0.9, 1)' },
        { transform: `translate3d(0, ${CONFIG_TIMBAL.aberto.impactY + offset}px, 0) scale(${abertoScale}) rotateZ(${baseAngle}deg)`, offset: 0.20, easing: 'ease-out' },
        { transform: `translate3d(0, ${CONFIG_TIMBAL.aberto.reboundY + offset}px, 0) scale(${abertoScale}) rotateZ(${baseAngle}deg)`, offset: 0.38, easing: 'ease-in-out' },
        { transform: restTransform },
      ],
    };
  }

  if (stroke === 'D' || stroke === 'd') {
    return {
      duration: CONFIG_TIMBAL.ghost.duration,
      keyframes: [
        { transform: restTransform, easing: 'ease-in-out' },
        { transform: `translate3d(0, ${restY + CONFIG_TIMBAL.ghost.jitterY}px, 0) scale(${restScale}) rotateZ(${baseAngle}deg)`, offset: 0.35, easing: 'ease-in-out' },
        { transform: restTransform },
      ],
    };
  }

  if (stroke === 'P' || stroke === 'p') {
    return {
      duration: 200,
      keyframes: [
        { transform: restTransform, easing: 'cubic-bezier(0.4, 0, 0.9, 1)' },
        { transform: `translate3d(0, ${-60 + offset}px, 0) scale(${0.97 * scaleMult}) rotateZ(${baseAngle}deg)`, offset: 0.22, easing: 'ease-out' },
        { transform: `translate3d(0, ${-55 + offset}px, 0) scale(${0.98 * scaleMult}) rotateZ(${baseAngle}deg)`, offset: 0.50, easing: 'ease-in-out' },
        { transform: restTransform },
      ],
    };
  }

  const defScale = CONFIG_TIMBAL.aberto.scale * scaleMult;
  return {
    duration: CONFIG_TIMBAL.aberto.duration,
    keyframes: [
      { transform: restTransform, easing: 'cubic-bezier(0.4, 0, 0.9, 1)' },
      { transform: `translate3d(0, ${CONFIG_TIMBAL.aberto.impactY + offset}px, 0) scale(${defScale}) rotateZ(${baseAngle}deg)`, offset: 0.20, easing: 'ease-out' },
      { transform: `translate3d(0, ${CONFIG_TIMBAL.aberto.reboundY + offset}px, 0) scale(${defScale}) rotateZ(${baseAngle}deg)`, offset: 0.38, easing: 'ease-in-out' },
      { transform: restTransform },
    ],
  };
}
