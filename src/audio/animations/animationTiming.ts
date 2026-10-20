/**
 * O Girador - Biomechanical Animation Timing, Duration & Pole Helpers
 */

import { CONFIG_STICKS } from './configSticks';
import { CONFIG_GONGUE } from './configGongue';
import { CONFIG_AGBE } from './configAgbe';
import { CONFIG_MINEIRO, MineiroPole } from './configMineiro';
import { CONFIG_TIMBAL } from './configTimbal';

export function calculateTempoFactor(bpm: number = 100): number {
  const safeBpm = Math.max(30, bpm || 100);
  return Math.max(0.75, Math.min(1.25, Math.sqrt(100 / safeBpm)));
}

export function getStickDuration(stroke: string, isSubStep: boolean = false): number {
  if (isSubStep) return Math.min(110, Math.round(CONFIG_STICKS.weak.duration * 0.7));
  if (stroke === 'R' || stroke === 'r') return CONFIG_STICKS.rufada.duration;
  if (stroke === 'C' || stroke === 'c') return CONFIG_STICKS.crossClick.duration;
  if (stroke === 'X' || stroke === 'x') return CONFIG_STICKS.rimShot.duration;
  if (['D', 'E', 'I', 'F', 'fla-strong'].includes(stroke)) return CONFIG_STICKS.strong.duration;
  return CONFIG_STICKS.weak.duration;
}

export function getGongueDuration(stroke: string): number {
  const isStrong = ['G', 'A'].includes(stroke);
  return isStrong ? CONFIG_GONGUE.strong.duration : CONFIG_GONGUE.weak.duration;
}

export function getAgbeDuration(stroke: string): number {
  if (stroke === 'B' || stroke === 'b') return CONFIG_AGBE.shaking.duration;
  if (['S', 's', 'V', 'v'].includes(stroke)) return CONFIG_AGBE.impactBase.duration;
  if (['D', 'E'].includes(stroke)) return CONFIG_AGBE.lateralStrong.duration;
  return CONFIG_AGBE.lateralWeak.duration;
}

export function getMineiroDuration(stroke: string): number {
  const norm = stroke === 'D' || stroke === 'F' ? 'P' :
    stroke === 'd' || stroke === 'f' ? 'p' :
      stroke === 'E' ? 'T' :
        stroke === 'e' ? 't' : stroke;

  if (norm === 'P' || norm === 'T') return CONFIG_MINEIRO.durationTravelStrong;
  if (norm === 'p' || norm === 't') return CONFIG_MINEIRO.durationTravelWeak;
  if (norm === 'L' || norm === 'l') return CONFIG_MINEIRO.durationLateral;
  if (norm === 'B' || norm === 'b') return CONFIG_MINEIRO.durationBarulho;
  return CONFIG_MINEIRO.durationTravelWeak;
}

export function getNextMineiroPole(stroke: string, currentPole: MineiroPole = 'backWeak'): MineiroPole {
  const norm = stroke === 'D' || stroke === 'F' ? 'P' :
    stroke === 'd' || stroke === 'f' ? 'p' :
      stroke === 'E' ? 'T' :
        stroke === 'e' ? 't' : stroke;

  if (norm === 'P') return 'frontStrong';
  if (norm === 'p') return 'frontWeak';
  if (norm === 'T') return 'backStrong';
  if (norm === 't') return 'backWeak';
  return currentPole;
}

export function getTimbalRestTransform(isLeft: boolean): string {
  const baseAngle = isLeft ? CONFIG_TIMBAL.vShapeAngle : -CONFIG_TIMBAL.vShapeAngle;
  const restY = CONFIG_TIMBAL.rest.y + CONFIG_TIMBAL.baseOffsetY;
  const totalScale = CONFIG_TIMBAL.rest.scale * CONFIG_TIMBAL.handScale;
  return `translate3d(0, ${restY}px, 0) scale(${totalScale}) rotateZ(${baseAngle}deg)`;
}

export function getTotalDuration(physicsBlock: any, isStrong: boolean): number {
  const block = isStrong ? physicsBlock.strong : physicsBlock.weak;
  return block.totalMs;
}
