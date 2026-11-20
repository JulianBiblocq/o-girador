import React from 'react';
import {
  generateAlfaiaKeyframes, generateDrumKeyframes, generateTimbalKeyframes,
  getStickDuration, CONFIG_TIMBAL,
} from '../../audio/animationGenerators';
import { generateAlfaiaBarulhoLoopFrames, getAlfaiaStickRestTransform } from '../../audio/animations/alfaiaKinematics';
import { generateCaixaBarulhoLoopFrames, getCaixaStickRestTransform, resolveCaixaActiveFamily } from '../../audio/animations/caixaKinematics';
import { generateTimbalBarulhoLoopFrames, getTimbalHandRestTransform } from '../../audio/animations/timbalKinematics';
import { consumeBarulhoStepPlan, releaseWaapiBarulhoRoll, runWaapiBarulhoRoll } from '../../audio/animations/barulhoWaapiRunner';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { triggerAoVivoShockwave } from './AoVivoShockwave';

export function dispatchAlfaiaOrDrum(
  instId: string, stroke: string, isVibrate: boolean, isSubStep: boolean, isLeftHanded: boolean,
  leftStickEl: SVGSVGElement | null, rightStickEl: SVGSVGElement | null, haloEl: HTMLDivElement | null,
  leftAnimRef: React.MutableRefObject<Animation | null>, rightAnimRef: React.MutableRefObject<Animation | null>,
  geometry: { targetX: number; targetY: number },
  activePlayingSteps?: any[], currentStep = 0, stepDurationMs = 180, leadMs = 0
) {
  const bpm = useSequencerStore.getState().bpm || 100;
  const isAlfaia = ['marcante', 'meiao', 'repique'].includes(instId);
  const norm = (stroke || '').trim();
  const famKey = isAlfaia ? 'alfaia' : resolveCaixaActiveFamily(instId);
  const plan = consumeBarulhoStepPlan(famKey, isVibrate ? '~' : norm, activePlayingSteps, currentStep, isSubStep);

  if (plan.action !== 'none') {
    const cycleMs = isAlfaia ? 90 : 82;
    [leftStickEl, rightStickEl].forEach((el, idx) => {
      const isLeft = idx === 0, animRef = isLeft ? leftAnimRef : rightAnimRef;
      const restTr = isAlfaia ? getAlfaiaStickRestTransform(isLeft, 'macaneta') : getCaixaStickRestTransform(isLeft, famKey as 'caixa' | 'tarol');
      const loopFrames = isAlfaia ? generateAlfaiaBarulhoLoopFrames(isLeft, 'macaneta', plan.amplitude || 0.7) : generateCaixaBarulhoLoopFrames(isLeft, famKey as 'caixa' | 'tarol', plan.amplitude || 0.7);
      if (plan.action === 'stop') releaseWaapiBarulhoRoll({ el, animRef, contactTransform: String(loopFrames[0].transform), endTransform: restTr, loopFrames, cycleMs, leadMs });
      else runWaapiBarulhoRoll({ el, animRef, startTransform: restTr, loopFrames, endTransform: restTr, cycleMs, stepDurationMs, leadMs, plan });
    });
    if (haloEl && (plan.action === 'start' || norm === 'B')) {
      triggerAoVivoShockwave(haloEl, { x: geometry.targetX, y: geometry.targetY, isRoll: true, delayMs: leadMs });
    }
    return;
  }
  if (!norm || norm === '0' || norm === '-' || norm === '.' || norm === '/') return;

  const gen = isAlfaia ? generateAlfaiaKeyframes : generateDrumKeyframes;
  let keyframesLeft: Keyframe[] | null = null, keyframesRight: Keyframe[] | null = null;
  let triggerLeft = false, triggerRight = false;

  if (norm === 'D' || norm === 'd') {
    if (isLeftHanded) { keyframesLeft = gen(norm, true, bpm, isLeftHanded); triggerLeft = true; }
    else { keyframesRight = gen(norm, false, bpm, isLeftHanded); triggerRight = true; }
  } else if (norm === 'E' || norm === 'e') {
    if (isLeftHanded) { keyframesRight = gen(norm, false, bpm, isLeftHanded); triggerRight = true; }
    else { keyframesLeft = gen(norm, true, bpm, isLeftHanded); triggerLeft = true; }
  } else if (['x', 'X', 'c', 'C'].includes(norm)) {
    keyframesLeft = gen(norm, true, bpm, isLeftHanded); keyframesRight = gen(norm, false, bpm, isLeftHanded);
    triggerLeft = true; triggerRight = true;
  } else if (!isAlfaia && (norm === 'f' || norm === 'F')) {
    const isRightStrong = norm === 'F';
    keyframesLeft = generateDrumKeyframes(isRightStrong ? 'fla-weak' : 'fla-strong', true, bpm, isLeftHanded);
    keyframesRight = generateDrumKeyframes(isRightStrong ? 'fla-strong' : 'fla-weak', false, bpm, isLeftHanded);
    triggerLeft = true; triggerRight = true;
  } else if (!isAlfaia && (norm === 'R' || norm === 'r')) {
    if (isLeftHanded) { keyframesLeft = generateDrumKeyframes(norm, true, bpm, isLeftHanded); triggerLeft = true; }
    else { keyframesRight = generateDrumKeyframes(norm, false, bpm, isLeftHanded); triggerRight = true; }
  }

  const duration = getStickDuration(norm, isSubStep);
  if (triggerLeft && leftStickEl && keyframesLeft) {
    leftAnimRef.current?.cancel();
    leftAnimRef.current = leftStickEl.animate(keyframesLeft, { duration, iterations: 1, fill: 'forwards' });
  }
  if (triggerRight && rightStickEl && keyframesRight) {
    rightAnimRef.current?.cancel();
    rightAnimRef.current = rightStickEl.animate(keyframesRight, { duration, iterations: 1, fill: 'forwards' });
  }
}

export function dispatchTimbal(
  stroke: string, isVibrate: boolean, isLeftHanded: boolean,
  leftStickEl: SVGSVGElement | null, rightStickEl: SVGSVGElement | null, haloEl: HTMLDivElement | null,
  leftAnimRef: React.MutableRefObject<Animation | null>, rightAnimRef: React.MutableRefObject<Animation | null>,
  geometry: { targetX: number; targetY: number },
  activePlayingSteps?: any[], currentStep = 0, stepDurationMs = 180, isSubStep = false, leadMs = 0
) {
  const norm = (stroke || '').trim();
  const plan = consumeBarulhoStepPlan('timbal', isVibrate ? '~' : norm, activePlayingSteps, currentStep, isSubStep);
  if (plan.action !== 'none') {
    [leftStickEl, rightStickEl].forEach((el, idx) => {
      const isLeft = idx === 0, animRef = isLeft ? leftAnimRef : rightAnimRef;
      const restTr = getTimbalHandRestTransform(isLeft, true), loopFrames = generateTimbalBarulhoLoopFrames(isLeft, plan.amplitude || 0.7);
      if (plan.action === 'stop') releaseWaapiBarulhoRoll({ el, animRef, contactTransform: String(loopFrames[0].transform), endTransform: restTr, loopFrames, cycleMs: 90, leadMs });
      else runWaapiBarulhoRoll({ el, animRef, startTransform: restTr, loopFrames, endTransform: restTr, cycleMs: 90, stepDurationMs, leadMs, plan });
    });
    if (haloEl && (plan.action === 'start' || norm === 'B')) triggerAoVivoShockwave(haloEl, { x: geometry.targetX, y: geometry.targetY, isRoll: true, delayMs: leadMs });
    return;
  }
  if (!norm || norm === '0' || norm === '-' || norm === '.' || norm === '/') return;

  let keyframesLeft: Keyframe[] | null = null, keyframesRight: Keyframe[] | null = null;
  let durationLeft = CONFIG_TIMBAL.aberto.duration, durationRight = CONFIG_TIMBAL.aberto.duration;
  let triggerLeft = false, triggerRight = false;

  if (['G', 'A', 'S', 'T', 'D', 'P'].includes(norm)) {
    const res = generateTimbalKeyframes(norm, isLeftHanded);
    if (isLeftHanded) { keyframesLeft = res.keyframes; durationLeft = res.duration; triggerLeft = true; }
    else { keyframesRight = res.keyframes; durationRight = res.duration; triggerRight = true; }
  } else if (['g', 'a', 's', 't', 'd', 'p'].includes(norm)) {
    const res = generateTimbalKeyframes(norm, !isLeftHanded);
    if (isLeftHanded) { keyframesRight = res.keyframes; durationRight = res.duration; triggerRight = true; }
    else { keyframesLeft = res.keyframes; durationLeft = res.duration; triggerLeft = true; }
  } else if (['F', 'f', 'V', 'v'].includes(norm)) {
    const key = norm.toUpperCase() === 'F' ? 'A' : 'S';
    const resL = generateTimbalKeyframes(key, true), resR = generateTimbalKeyframes(key, false);
    keyframesLeft = resL.keyframes; durationLeft = resL.duration;
    keyframesRight = resR.keyframes; durationRight = resR.duration;
    triggerLeft = true; triggerRight = true;
  }

  if (triggerLeft && leftStickEl && keyframesLeft) leftAnimRef.current = leftStickEl.animate(keyframesLeft, { duration: durationLeft, iterations: 1 });
  if (triggerRight && rightStickEl && keyframesRight) rightAnimRef.current = rightStickEl.animate(keyframesRight, { duration: durationRight, iterations: 1 });
}
