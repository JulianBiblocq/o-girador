/**
 * O Girador - Gonguê Animation Keyframe Generator
 */

import { CONFIG_GONGUE } from './configGongue';
import { calculateTempoFactor } from './animationTiming';

export function generateGongueKeyframes(stroke: string, bpm: number = 100): Keyframe[] {
  const isVibrate = stroke === 'b' || stroke === 'B';
  const isGrave = stroke === 'G' || stroke === 'g';
  const isAigu = stroke === 'A' || stroke === 'a';
  const isStrong = ['G', 'A'].includes(stroke);
  const cfg = isStrong ? CONFIG_GONGUE.strong : CONFIG_GONGUE.weak;
  const tempoFactor = calculateTempoFactor(bpm);

  const baseScaleX = isAigu
    ? CONFIG_GONGUE.perspective.scaleXBas
    : isGrave
      ? CONFIG_GONGUE.perspective.scaleXHaut
      : CONFIG_GONGUE.perspective.scaleXCenter;

  const baseScaleY = CONFIG_GONGUE.rest.scaleY;
  const randX = (Math.random() - 0.5) * CONFIG_GONGUE.humanize.spreadX;
  const randY = (Math.random() - 0.5) * CONFIG_GONGUE.humanize.spreadY;

  if (isVibrate) {
    const reposRotX = CONFIG_GONGUE.rest.rotateX;
    return [
      { transform: `translate(0px, 0px) rotateX(${reposRotX}deg) scale(${baseScaleX}, ${baseScaleY})`, easing: 'ease-in-out' },
      { transform: `translate(${-4 + randX}px, ${-4 + randY}px) rotateX(${reposRotX}deg) scale(${baseScaleX}, ${baseScaleY})`, offset: 0.25, easing: 'ease-in-out' },
      { transform: `translate(${4 - randX}px, ${4 - randY}px) rotateX(${reposRotX}deg) scale(${baseScaleX}, ${baseScaleY})`, offset: 0.50, easing: 'ease-in-out' },
      { transform: `translate(${-4 + randX}px, ${-4 + randY}px) rotateX(${reposRotX}deg) scale(${baseScaleX}, ${baseScaleY})`, offset: 0.75, easing: 'ease-in-out' },
      { transform: `translate(0px, 0px) rotateX(${reposRotX}deg) scale(${baseScaleX}, ${baseScaleY})` },
    ];
  }

  const windUpBoost = 1 + (cfg.windUp.scaleBoost - 1) * tempoFactor;
  const windUpY = cfg.windUp.translateY * tempoFactor;
  const impactBoost = cfg.impact.scaleBoost;
  const reboundBoost = cfg.rebound.scaleBoost;

  return [
    { transform: `translate(0px, ${CONFIG_GONGUE.rest.translateY}px) rotateX(${CONFIG_GONGUE.rest.rotateX}deg) scale(${baseScaleX}, ${baseScaleY})`, easing: 'ease-out' },
    { transform: `translate(0px, ${windUpY}px) rotateX(${cfg.windUp.rotateX}deg) scale(${baseScaleX * windUpBoost}, ${baseScaleY * windUpBoost})`, offset: cfg.windUp.offset, easing: cfg.windUp.easing },
    { transform: `translate(${randX}px, ${cfg.impact.translateY + randY}px) rotateX(${cfg.impact.rotateX}deg) scale(${baseScaleX * impactBoost}, ${baseScaleY * impactBoost})`, offset: cfg.impact.offset, easing: cfg.impact.easing },
    { transform: `translate(0px, ${cfg.rebound.translateY}px) rotateX(${cfg.rebound.rotateX}deg) scale(${baseScaleX * reboundBoost}, ${baseScaleY * reboundBoost})`, offset: cfg.rebound.offset, easing: cfg.rebound.easing },
    { transform: `translate(0px, ${CONFIG_GONGUE.rest.translateY}px) rotateX(${CONFIG_GONGUE.rest.rotateX}deg) scale(${baseScaleX}, ${baseScaleY})` },
  ];
}
