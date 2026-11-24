/**
 * caixaLookaheadHelper.ts — Dispatch prédictif WAAPI des baguettes Caixa/Tarol & cycle Barulho synchronisé.
 */
import React from 'react';
import {
  CaixaNextStrokeKind,
  CaixaStickFamily,
  generateCaixaBarulhoLoopFrames,
  generateCaixaPredictiveKeyframes,
  generateCaixaShadowKeyframes,
  getActiveCaixaSticksConfig,
  getCaixaShadowRestTransform,
  getCaixaStickRestTransform,
  resolveCaixaActiveFamily,
} from '../../audio/animations/caixaKinematics';
import { resolveStickStartAndEndTransforms } from '../../audio/animations/handTransitionEngine';
import { BarulhoStepPlan, consumeBarulhoStepPlan, releaseWaapiBarulhoRoll, runWaapiBarulhoRoll } from '../../audio/animations/barulhoWaapiRunner';
import { triggerAoVivoShockwave } from './AoVivoShockwave';
import { findCaixaSameHandLookahead } from './caixaSameHandLookahead';

export { findCaixaSameHandLookahead };

function animateCaixaStick(
  stickEl: SVGSVGElement | null, animRef: React.MutableRefObject<Animation | null>,
  stroke: string, isLeftSide: boolean, family: CaixaStickFamily,
  nextKind: CaixaNextStrokeKind, durationMs: number, flaRole: 'none' | 'main' | 'grace' = 'none'
) {
  if (!stickEl) return;
  const effectiveDuration = Math.max(80, Math.round(durationMs / getActiveCaixaSticksConfig(family).speedMultiplier));
  animRef.current?.cancel();
  stickEl.getAnimations?.().forEach((a) => a.cancel());
  animRef.current = stickEl.animate(
    generateCaixaPredictiveKeyframes(stroke, isLeftSide, family, nextKind, effectiveDuration, flaRole),
    { duration: effectiveDuration, iterations: 1, fill: 'forwards' }
  );
  const shadowEl = stickEl.querySelector('[data-stick-shadow]') as SVGGElement | null;
  if (shadowEl) {
    shadowEl.getAnimations().forEach((a) => a.cancel());
    shadowEl.animate(generateCaixaShadowKeyframes(stroke, isLeftSide, nextKind, family), { duration: effectiveDuration, iterations: 1, fill: 'forwards' });
  }
}

function animateCaixaStickBarulho(
  stickEl: SVGSVGElement | null, animRef: React.MutableRefObject<Animation | null>,
  isLeftSide: boolean, family: CaixaStickFamily, nextKind: CaixaNextStrokeKind,
  stepDurationMs: number, leadMs: number, plan: BarulhoStepPlan, oneShotStepMode = false
) {
  if (!stickEl) return;
  const c = getActiveCaixaSticksConfig(family), prof = c[family], cycleMs = Math.max(52, Math.round(82 / c.speedMultiplier));
  const loopFrames = generateCaixaBarulhoLoopFrames(isLeftSide, family, plan.amplitude || 0.7);
  const { startTransform, endTransform } = resolveStickStartAndEndTransforms(isLeftSide, prof.scale, c.restOffsetY, getCaixaStickRestTransform(isLeftSide, family), c.transitions, plan.amplitude >= 0.85, nextKind);
  if (plan.action === 'stop') {
    releaseWaapiBarulhoRoll({ el: stickEl, animRef, contactTransform: String(loopFrames[0].transform), endTransform, loopFrames, cycleMs, leadMs });
  } else {
    runWaapiBarulhoRoll({ el: stickEl, animRef, startTransform, loopFrames, endTransform, cycleMs, stepDurationMs, leadMs, plan, oneShotStepMode });
  }
  const shadowEl = stickEl.querySelector('[data-stick-shadow]') as SVGGElement | null;
  if (shadowEl && (plan.action !== 'continue' || !plan.sustain || oneShotStepMode)) {
    shadowEl.getAnimations().forEach((a) => a.cancel());
    const restSh = getCaixaShadowRestTransform(isLeftSide, family), restOp = +(c.shadowOpacity * 0.42).toFixed(2);
    const shFrames = plan.action === 'stop'
      ? [{ transform: 'translate(0px, 3px) scale(0.95)', opacity: c.shadowOpacity, offset: 0 }, { transform: restSh, opacity: restOp, offset: 1 }]
      : plan.sustain && !oneShotStepMode
        ? [{ transform: 'translate(0px, 3px) scale(0.95)', opacity: c.shadowOpacity, offset: 0 }, { transform: 'translate(0px, 3px) scale(0.95)', opacity: c.shadowOpacity, offset: 1 }]
        : [{ transform: 'translate(0px, 3px) scale(0.95)', opacity: c.shadowOpacity, offset: 0 }, { transform: 'translate(0px, 3px) scale(0.95)', opacity: c.shadowOpacity, offset: 0.78 }, { transform: restSh, opacity: restOp, offset: 1 }];
    shadowEl.animate(shFrames, { delay: Math.max(0, Math.round(leadMs)), duration: plan.action === 'stop' ? 120 : Math.max(100, Math.round(stepDurationMs)), fill: 'forwards' });
  }
}

export function dispatchCaixaPredictiveStroke(
  instId: string, stroke: string, isVibrate: boolean, isSubStep: boolean, isLeftHanded: boolean,
  activePlayingSteps: any[] | undefined, currentStep: number, stepDurationMs: number,
  leftStickEl: SVGSVGElement | null, rightStickEl: SVGSVGElement | null, haloEl: HTMLDivElement | null,
  leftAnimRef: React.MutableRefObject<Animation | null>, rightAnimRef: React.MutableRefObject<Animation | null>,
  geometry: { targetX: number; targetY: number }, leadMs = 0, oneShotStepMode = false
) {
  const family = resolveCaixaActiveFamily(instId), norm = (stroke || '').trim(), sUp = norm.toUpperCase();
  const domLook = findCaixaSameHandLookahead(activePlayingSteps, currentStep, stepDurationMs, true, isSubStep);
  const secLook = findCaixaSameHandLookahead(activePlayingSteps, currentStep, stepDurationMs, false, isSubStep);
  const domEl = isLeftHanded ? leftStickEl : rightStickEl, domRef = isLeftHanded ? leftAnimRef : rightAnimRef;
  const secEl = isLeftHanded ? rightStickEl : leftStickEl, secRef = isLeftHanded ? rightAnimRef : leftAnimRef;

  const plan = consumeBarulhoStepPlan(family, isVibrate ? '~' : norm, activePlayingSteps, currentStep, isSubStep);
  if (plan.action !== 'none') {
    animateCaixaStickBarulho(domEl, domRef, isLeftHanded, family, domLook.nextKind, stepDurationMs, leadMs, plan, oneShotStepMode);
    animateCaixaStickBarulho(secEl, secRef, !isLeftHanded, family, secLook.nextKind, stepDurationMs, leadMs, plan, oneShotStepMode);
    if (haloEl && (plan.action === 'start' || norm === 'B')) triggerAoVivoShockwave(haloEl, { x: geometry.targetX, y: geometry.targetY, isRoll: true, delayMs: leadMs });
    return;
  }
  if (!norm || norm === '0' || norm === '-' || norm === '.' || norm === '/') return;

  if (norm === 'F') {
    animateCaixaStick(secEl, secRef, 'e', !isLeftHanded, family, secLook.nextKind, secLook.msUntilNext, 'grace');
    animateCaixaStick(domEl, domRef, 'D', isLeftHanded, family, domLook.nextKind, domLook.msUntilNext, 'main');
  } else if (norm === 'f') {
    animateCaixaStick(domEl, domRef, 'd', isLeftHanded, family, domLook.nextKind, domLook.msUntilNext, 'grace');
    animateCaixaStick(secEl, secRef, 'E', !isLeftHanded, family, secLook.nextKind, secLook.msUntilNext, 'main');
  } else if (norm === 'R') animateCaixaStick(domEl, domRef, 'R', isLeftHanded, family, domLook.nextKind, Math.max(stepDurationMs, domLook.msUntilNext));
  else if (norm === 'r') animateCaixaStick(secEl, secRef, 'r', !isLeftHanded, family, secLook.nextKind, Math.max(stepDurationMs, secLook.msUntilNext));
  else if (norm === 'A') animateCaixaStick(domEl, domRef, 'A', isLeftHanded, family, domLook.nextKind, domLook.msUntilNext);
  else if (norm === 'a') animateCaixaStick(secEl, secRef, 'a', !isLeftHanded, family, secLook.nextKind, secLook.msUntilNext);
  else {
    if (['C', 'X', 'D', 'S'].includes(sUp)) animateCaixaStick(domEl, domRef, norm, isLeftHanded, family, domLook.nextKind, domLook.msUntilNext);
    if (['C', 'X', 'E', 'V'].includes(sUp)) animateCaixaStick(secEl, secRef, norm, !isLeftHanded, family, secLook.nextKind, secLook.msUntilNext);
  }
  if (haloEl && ['D', 'E', 'A', 'a', 'F', 'f', 'R'].includes(norm)) {
    triggerAoVivoShockwave(haloEl, { x: geometry.targetX, y: geometry.targetY, isRoll: norm === 'R', isRimshot: norm === 'A' || norm === 'a' });
  }
}

export function resetCaixaSticksAndShadows(instId: string, leftStickEl: SVGSVGElement | null, rightStickEl: SVGSVGElement | null) {
  const family = resolveCaixaActiveFamily(instId);
  [leftStickEl, rightStickEl].forEach((el, idx) => {
    if (!el) return;
    const isLeft = idx === 0;
    el.getAnimations().forEach((a) => a.cancel());
    el.style.transition = 'none';
    el.style.transform = getCaixaStickRestTransform(isLeft, family);
    const sh = el.querySelector('[data-stick-shadow]') as SVGGElement | null;
    if (sh) { sh.getAnimations().forEach((a) => a.cancel()); sh.style.transform = getCaixaShadowRestTransform(isLeft, family); }
  });
}
