import React from 'react';
import { getNextMineiroPole, MineiroPole } from '../../audio/animationGenerators';
import {
  buildAgbeBarulhoFrames, CONFIG_AGBE_LAB, generateAgbeKeyframes, getAgbeRestTransform, resetAgbePostureMemory,
} from '../../audio/animations/agbeKeyframes';
import {
  buildMineiroBarulhoFrames, CONFIG_MINEIRO_LAB, generateMineiroKeyframes, getMineiroRestTransform, resetMineiroPostureMemory,
} from '../../audio/animations/mineiroKeyframes';
import {
  CONFIG_GONGUE_STICK, findGongueLookahead, releaseGongueBarulho,
  startGongueBarulhoAnimation, startGongueTwoNodeAnimation, stopGongueTwoNodeAnimation,
} from '../../audio/animations/gongueKinematics';
import { consumeBarulhoStepPlan, releaseWaapiBarulhoRoll, resetBarulhoRollState, runWaapiBarulhoRoll } from '../../audio/animations/barulhoWaapiRunner';
import { getGongueStaticPoseState, updateGongueStickGeometry } from './GongueStickSvg';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { triggerAoVivoShockwave } from './AoVivoShockwave';

export function dispatchMineiro(
  stroke: string, isVibrate: boolean, mineiroStickEl: SVGSVGElement | null,
  poleRef: React.MutableRefObject<MineiroPole>, animRef: React.MutableRefObject<Animation | null>,
  isLeftHanded = false, activePlayingSteps?: any[], currentStep = 0, stepDurationMs = 200, isSubStep = false, leadMs = 0, oneShotStepMode = false
) {
  if (!mineiroStickEl) return;
  const spd = CONFIG_MINEIRO_LAB.speedMultiplier, norm = (stroke || '').trim();
  const plan = consumeBarulhoStepPlan('mineiro', isVibrate ? '~' : norm, activePlayingSteps, currentStep, isSubStep);
  if (plan.action !== 'none') {
    const cycleMs = Math.max(65, Math.round(105 / spd));
    const { startTr, loopFrames, endTr } = buildMineiroBarulhoFrames(poleRef.current, plan.amplitude || 0.7, !plan.sustain || plan.action === 'stop' || oneShotStepMode);
    if (plan.action === 'stop') releaseWaapiBarulhoRoll({ el: mineiroStickEl, animRef, contactTransform: String(loopFrames[0].transform), endTransform: endTr, loopFrames, cycleMs, leadMs });
    else runWaapiBarulhoRoll({ el: mineiroStickEl, animRef, startTransform: startTr, loopFrames, endTransform: endTr, cycleMs, stepDurationMs, leadMs, plan, oneShotStepMode });
    return;
  }
  if (!norm || norm === '0' || norm === '-' || norm === '.' || norm === '/') return;
  const duration = Math.max(60, Math.round(CONFIG_MINEIRO_LAB.cycleDurationMs / spd));
  animRef.current?.cancel();
  mineiroStickEl.getAnimations?.().forEach((a) => a.cancel());
  animRef.current = mineiroStickEl.animate(generateMineiroKeyframes(norm, poleRef.current, isLeftHanded), { duration, iterations: 1, fill: 'forwards' });
  poleRef.current = getNextMineiroPole(norm, poleRef.current);
}

export function dispatchAgbe(
  stroke: string, isVibrate: boolean, agbeWholeEl: SVGGElement | null,
  animRef: React.MutableRefObject<Animation | null>, nextStroke?: string,
  activePlayingSteps?: any[], currentStep = 0, stepDurationMs = 200, isSubStep = false, leadMs = 0, oneShotStepMode = false
) {
  if (!agbeWholeEl) return;
  const spd = CONFIG_AGBE_LAB.speedMultiplier, norm = (stroke || '').trim();
  agbeWholeEl.style.transformOrigin = `50% ${CONFIG_AGBE_LAB.pivotYPercent}%`;
  const plan = consumeBarulhoStepPlan('agbe', isVibrate ? '~' : norm, activePlayingSteps, currentStep, isSubStep);
  if (plan.action !== 'none') {
    const cycleMs = Math.max(70, Math.round(115 / spd));
    const { startTr, loopFrames, endTr } = buildAgbeBarulhoFrames(plan.amplitude || 0.7, nextStroke, !plan.sustain || plan.action === 'stop' || oneShotStepMode);
    if (plan.action === 'stop') releaseWaapiBarulhoRoll({ el: agbeWholeEl, animRef, contactTransform: String(loopFrames[0].transform), endTransform: endTr, loopFrames, cycleMs, leadMs });
    else runWaapiBarulhoRoll({ el: agbeWholeEl, animRef, startTransform: startTr, loopFrames, endTransform: endTr, cycleMs, stepDurationMs, leadMs, plan, oneShotStepMode });
    return;
  }
  if (!norm || norm === '0' || norm === '-' || norm === '.' || norm === '/') return;
  const bpm = useSequencerStore.getState().bpm || 100;
  const duration = Math.max(80, Math.round(CONFIG_AGBE_LAB.pendulumDurationMs / spd));
  animRef.current?.cancel();
  agbeWholeEl.getAnimations?.().forEach((a) => a.cancel());
  animRef.current = agbeWholeEl.animate(generateAgbeKeyframes(norm, bpm, nextStroke), { duration, iterations: 1, fill: 'forwards' });
}

export function dispatchGongue(
  stroke: string, isVibrate: boolean, isSubStep: boolean, isLeftHanded: boolean,
  activePlayingSteps: any[] | undefined, currentStep: number, stepDurationMs: number,
  gongueStickEl: SVGSVGElement | null, _animRef: React.MutableRefObject<Animation | null>,
  haloEl?: HTMLDivElement | null, geometry?: { targetX: number; targetY: number }, leadMs = 0
) {
  if (!gongueStickEl) return;
  const look = findGongueLookahead(activePlayingSteps, currentStep, stepDurationMs, isSubStep);
  const norm = (stroke || '').trim();
  const plan = consumeBarulhoStepPlan('gongue', isVibrate ? '~' : norm, activePlayingSteps, currentStep, isSubStep);
  if (plan.action !== 'none') {
    if (plan.action === 'stop') releaseGongueBarulho(gongueStickEl, isLeftHanded, look.nextKind, leadMs);
    else startGongueBarulhoAnimation(gongueStickEl, isLeftHanded, look.nextKind, stepDurationMs, leadMs, plan);
    if (haloEl && geometry && (plan.action === 'start' || norm === 'B')) {
      triggerAoVivoShockwave(haloEl, { x: geometry.targetX, y: geometry.targetY, isRoll: true, delayMs: leadMs });
    }
    return;
  }
  if (!norm || norm === '0' || norm === '-' || norm === '.' || norm === '/') return;
  const effectiveDuration = Math.max(85, Math.round(look.msUntilNext / CONFIG_GONGUE_STICK.speedMultiplier));
  startGongueTwoNodeAnimation(gongueStickEl, norm, isLeftHanded, look.nextKind, effectiveDuration);
  if (haloEl && geometry && ['G', 'A'].includes(norm)) {
    triggerAoVivoShockwave(haloEl, { x: geometry.targetX, y: geometry.targetY });
  }
}

export function resetGongueStickAndShadow(isLeftHanded: boolean, gongueStickEl: SVGSVGElement | null) {
  resetBarulhoRollState();
  stopGongueTwoNodeAnimation();
  updateGongueStickGeometry(gongueStickEl, getGongueStaticPoseState(), isLeftHanded);
}

export function resetAgbeAndMineiroRest(agbeWholeEl: SVGGElement | null, mineiroStickEl: SVGSVGElement | null) {
  resetBarulhoRollState();
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
