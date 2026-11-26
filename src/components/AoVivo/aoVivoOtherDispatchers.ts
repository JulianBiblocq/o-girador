import React from 'react';
import { getNextMineiroPole, MineiroPole } from '../../audio/animationGenerators';
import {
  buildAgbeBarulhoFrames, CONFIG_AGBE_LAB, generateAgbeKeyframes, getAgbeRestTransform, resetAgbePostureMemory,
} from '../../audio/animations/agbeKeyframes';
import { computeBallisticDurationMs, computeImpactHoldTiming } from '../../audio/animations/aoVivoBallisticMath';
import {
  buildMineiroBarulhoFrames, CONFIG_MINEIRO_LAB, generateMineiroKeyframes, getMineiroRestTransform, resetMineiroPostureMemory,
} from '../../audio/animations/mineiroKeyframes';
import {
  findGongueLookahead, releaseGongueBarulho, startGongueBarulhoAnimation, startGongueTwoNodeAnimation, stopGongueTwoNodeAnimation,
} from '../../audio/animations/gongueKinematics';
import { consumeBarulhoStepPlan, releaseWaapiBarulhoRoll, resetBarulhoRollState, runWaapiBarulhoRoll } from '../../audio/animations/barulhoWaapiRunner';
import { getGongueStaticPoseState, updateGongueStickGeometry } from './GongueStickSvg';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { triggerAoVivoShockwave } from './AoVivoShockwave';
import { cancelTrackedElementAnimation, runClockSyncedWaapi } from './aoVivoWaapiClockSync';

export function dispatchMineiro(
  stroke: string, isVibrate: boolean, mineiroStickEl: SVGSVGElement | null,
  poleRef: React.MutableRefObject<MineiroPole>, animRef: React.MutableRefObject<Animation | null>,
  isLeftHanded = false, activePlayingSteps?: any[], currentStep = 0, stepDurationMs = 200, isSubStep = false, leadMs = 0, oneShotStepMode = false
) {
  if (!mineiroStickEl) return;
  const spd = CONFIG_MINEIRO_LAB.speedMultiplier, norm = (stroke || '').trim();
  const plan = consumeBarulhoStepPlan('mineiro', isVibrate ? '~' : norm, activePlayingSteps, currentStep, isSubStep);
  if (plan.action !== 'none') {
    const cycleMs = Math.max(65, Math.round(105 / spd)), rollDur = isSubStep ? Math.max(40, Math.round(stepDurationMs * 0.5)) : stepDurationMs;
    const { startTr, loopFrames, endTr } = buildMineiroBarulhoFrames(poleRef.current, plan.amplitude || 0.7, !plan.sustain || plan.action === 'stop' || oneShotStepMode);
    if (plan.action === 'stop') releaseWaapiBarulhoRoll({ el: mineiroStickEl, animRef, contactTransform: String(loopFrames[0].transform), endTransform: endTr, loopFrames, cycleMs, leadMs });
    else runWaapiBarulhoRoll({ el: mineiroStickEl, animRef, startTransform: startTr, loopFrames, endTransform: endTr, cycleMs, stepDurationMs: rollDur, leadMs, plan, oneShotStepMode });
    return;
  }
  if (!norm || norm === '0' || norm === '-' || norm === '.' || norm === '/') return;
  const isStrong = ['P', 'T', 'L', 'D', 'E', 'F'].includes(norm);
  const availMs = isSubStep ? stepDurationMs * 0.5 : stepDurationMs;
  const duration = computeBallisticDurationMs(isStrong, availMs, spd);
  const { tImpactMs, tHoldEndMs } = computeImpactHoldTiming(duration);
  const alignedMineiroDelta = leadMs > 0 ? -leadMs + tImpactMs : -leadMs;
  runClockSyncedWaapi({ el: mineiroStickEl, keyframes: generateMineiroKeyframes(norm, poleRef.current, isLeftHanded, duration), durationMs: duration, deltaMs: alignedMineiroDelta, tImpactMs, tHoldEndMs, animRef });
  poleRef.current = getNextMineiroPole(norm, poleRef.current);
}

export function dispatchAgbe(
  stroke: string, isVibrate: boolean, agbeWholeEl: SVGGElement | null,
  animRef: React.MutableRefObject<Animation | null>, nextStroke?: string,
  activePlayingSteps?: any[], currentStep = 0, stepDurationMs = 200, isSubStep = false, leadMs = 0, oneShotStepMode = false, isLeftHanded = false
) {
  if (!agbeWholeEl) return;
  const spd = CONFIG_AGBE_LAB.speedMultiplier, norm = (stroke || '').trim();
  agbeWholeEl.style.transformOrigin = `50% ${CONFIG_AGBE_LAB.pivotYPercent}%`;
  const plan = consumeBarulhoStepPlan('agbe', isVibrate ? '~' : norm, activePlayingSteps, currentStep, isSubStep);
  if (plan.action !== 'none') {
    const cycleMs = Math.max(70, Math.round(115 / spd)), rollDur = isSubStep ? Math.max(40, Math.round(stepDurationMs * 0.5)) : stepDurationMs;
    const { startTr, loopFrames, endTr } = buildAgbeBarulhoFrames(plan.amplitude || 0.7, nextStroke, !plan.sustain || plan.action === 'stop' || oneShotStepMode, isLeftHanded);
    if (plan.action === 'stop') releaseWaapiBarulhoRoll({ el: agbeWholeEl, animRef, contactTransform: String(loopFrames[0].transform), endTransform: endTr, loopFrames, cycleMs, leadMs });
    else runWaapiBarulhoRoll({ el: agbeWholeEl, animRef, startTransform: startTr, loopFrames, endTransform: endTr, cycleMs, stepDurationMs: rollDur, leadMs, plan, oneShotStepMode });
    return;
  }
  if (!norm || norm === '0' || norm === '-' || norm === '.' || norm === '/') return;
  const bpm = useSequencerStore.getState().bpm || 100;
  const isStrong = ['D', 'E', 'S', 'V'].includes(norm);
  const availMs = isSubStep ? stepDurationMs * 0.5 : stepDurationMs;
  const duration = computeBallisticDurationMs(isStrong, availMs, spd);
  const { tImpactMs, tHoldEndMs } = computeImpactHoldTiming(duration);
  const alignedAgbeDelta = leadMs > 0 ? -leadMs + tImpactMs : -leadMs;
  runClockSyncedWaapi({ el: agbeWholeEl, keyframes: generateAgbeKeyframes(norm, bpm, nextStroke, isLeftHanded, duration), durationMs: duration, deltaMs: alignedAgbeDelta, tImpactMs, tHoldEndMs, animRef });
}

export function dispatchGongue(
  stroke: string, isVibrate: boolean, isSubStep: boolean, isLeftHanded: boolean,
  activePlayingSteps: any[] | undefined, currentStep: number, stepDurationMs: number,
  gongueStickEl: SVGSVGElement | null, _animRef: React.MutableRefObject<Animation | null>,
  haloEl?: HTMLDivElement | null, geometry?: { targetX: number; targetY: number }, leadMs = 0, stepDurationsMs?: readonly number[]
) {
  if (!gongueStickEl) return;
  const look = findGongueLookahead(activePlayingSteps, currentStep, stepDurationMs, isSubStep, stepDurationsMs);
  const norm = (stroke || '').trim();
  const plan = consumeBarulhoStepPlan('gongue', isVibrate ? '~' : norm, activePlayingSteps, currentStep, isSubStep);
  if (plan.action !== 'none') {
    const rollStepDurMs = isSubStep ? Math.max(40, Math.round(stepDurationMs * 0.5)) : stepDurationMs;
    if (plan.action === 'stop') releaseGongueBarulho(gongueStickEl, isLeftHanded, look.nextKind, leadMs);
    else startGongueBarulhoAnimation(gongueStickEl, isLeftHanded, look.nextKind, rollStepDurMs, leadMs, plan);
    if (haloEl && geometry && (plan.action === 'start' || norm === 'B')) {
      triggerAoVivoShockwave(haloEl, { x: geometry.targetX, y: geometry.targetY, isRoll: true, deltaMs: -leadMs });
    }
    return;
  }
  if (!norm || norm === '0' || norm === '-' || norm === '.' || norm === '/') return;
  startGongueTwoNodeAnimation(gongueStickEl, norm, isLeftHanded, look.nextKind, look.msUntilNext, -leadMs);
  if (haloEl && geometry && ['G', 'A'].includes(norm)) {
    triggerAoVivoShockwave(haloEl, { x: geometry.targetX, y: geometry.targetY, deltaMs: -leadMs });
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
    cancelTrackedElementAnimation(agbeWholeEl);
    agbeWholeEl.style.transition = 'none';
    agbeWholeEl.style.transformOrigin = `50% ${CONFIG_AGBE_LAB.pivotYPercent}%`;
    agbeWholeEl.style.transform = getAgbeRestTransform();
  }
  if (mineiroStickEl) {
    cancelTrackedElementAnimation(mineiroStickEl);
    mineiroStickEl.style.transition = 'none';
    mineiroStickEl.style.transform = getMineiroRestTransform();
  }
}
