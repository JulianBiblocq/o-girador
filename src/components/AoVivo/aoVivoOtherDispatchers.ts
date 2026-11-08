import React from 'react';
import {
  getNextMineiroPole,
  MineiroPole,
} from '../../audio/animationGenerators';
import {
  CONFIG_AGBE_LAB,
  generateAgbeKeyframes,
  getAgbeRestTransform,
  resetAgbePostureMemory,
} from '../../audio/animations/agbeKeyframes';
import {
  CONFIG_MINEIRO_LAB,
  generateMineiroKeyframes,
  getMineiroRestTransform,
  resetMineiroPostureMemory,
} from '../../audio/animations/mineiroKeyframes';
import {
  CONFIG_GONGUE_STICK,
  findGongueLookahead,
  startGongueTwoNodeAnimation,
  stopGongueTwoNodeAnimation,
} from '../../audio/animations/gongueKinematics';
import {
  getGongueStaticPoseState,
  updateGongueStickGeometry,
} from './GongueStickSvg';
import { useSequencerStore } from '../../stores/useSequencerStore';

export function dispatchMineiro(
  stroke: string,
  isVibrate: boolean,
  mineiroStickEl: SVGSVGElement | null,
  poleRef: React.MutableRefObject<MineiroPole>,
  animRef: React.MutableRefObject<Animation | null>,
  isLeftHanded = false
) {
  if (!mineiroStickEl) return;
  const spd = CONFIG_MINEIRO_LAB.speedMultiplier;
  const duration = Math.max(60, Math.round((isVibrate ? 110 : CONFIG_MINEIRO_LAB.cycleDurationMs) / spd));
  animRef.current?.cancel();
  animRef.current = mineiroStickEl.animate(generateMineiroKeyframes(stroke, poleRef.current, isLeftHanded), {
    duration,
    iterations: isVibrate ? Infinity : 1,
    fill: 'forwards',
  });
  poleRef.current = getNextMineiroPole(stroke, poleRef.current);
}

export function dispatchAgbe(
  stroke: string,
  isVibrate: boolean,
  agbeWholeEl: SVGGElement | null,
  animRef: React.MutableRefObject<Animation | null>,
  nextStroke?: string
) {
  if (!agbeWholeEl) return;
  const bpm = useSequencerStore.getState().bpm || 100;
  const spd = CONFIG_AGBE_LAB.speedMultiplier;
  const duration = Math.max(80, Math.round((isVibrate ? 120 : CONFIG_AGBE_LAB.pendulumDurationMs) / spd));
  agbeWholeEl.style.transformOrigin = `50% ${CONFIG_AGBE_LAB.pivotYPercent}%`;
  animRef.current?.cancel();
  animRef.current = agbeWholeEl.animate(generateAgbeKeyframes(stroke, bpm, nextStroke), {
    duration,
    iterations: isVibrate ? Infinity : 1,
    fill: 'forwards',
  });
}

export function dispatchGongue(
  stroke: string,
  isVibrate: boolean,
  isSubStep: boolean,
  isLeftHanded: boolean,
  activePlayingSteps: any[] | undefined,
  currentStep: number,
  stepDurationMs: number,
  gongueStickEl: SVGSVGElement | null,
  _animRef: React.MutableRefObject<Animation | null>
) {
  if (!gongueStickEl) return;
  const look = findGongueLookahead(activePlayingSteps, currentStep, stepDurationMs, isSubStep);
  const rate = CONFIG_GONGUE_STICK.speedMultiplier;
  const effectiveDuration = isVibrate ? Math.round(120 / rate) : Math.max(85, Math.round(look.msUntilNext / rate));
  startGongueTwoNodeAnimation(gongueStickEl, stroke, isLeftHanded, look.nextKind, effectiveDuration);
}

export function resetGongueStickAndShadow(isLeftHanded: boolean, gongueStickEl: SVGSVGElement | null) {
  stopGongueTwoNodeAnimation();
  updateGongueStickGeometry(gongueStickEl, getGongueStaticPoseState(), isLeftHanded);
}

export function resetAgbeAndMineiroRest(agbeWholeEl: SVGGElement | null, mineiroStickEl: SVGSVGElement | null) {
  resetAgbePostureMemory();
  resetMineiroPostureMemory();
  if (agbeWholeEl) {
    agbeWholeEl.getAnimations().forEach((a) => a.cancel());
    agbeWholeEl.style.transition = 'none';
    agbeWholeEl.style.transformOrigin = `50% ${CONFIG_AGBE_LAB.pivotYPercent}%`;
    agbeWholeEl.style.transform = getAgbeRestTransform();
  }
  if (mineiroStickEl) {
    mineiroStickEl.getAnimations().forEach((a) => a.cancel());
    mineiroStickEl.style.transition = 'none';
    mineiroStickEl.style.transform = getMineiroRestTransform();
  }
}
