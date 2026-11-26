/**
 * caixaLookaheadHelper.ts — Dispatch balistique invariant WAAPI Caixa/Tarol & Barulho (< 128L, zéro `getAnimations()`).
 */
import React from 'react';
import { computeBallisticDurationMs, computeImpactHoldTiming, isFastRepeatCompactPrep } from '../../audio/animations/aoVivoBallisticMath';
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
import { BarulhoStepPlan, consumeBarulhoStepPlan, releaseWaapiBarulhoRoll, runWaapiBarulhoRoll, syncBarulhoStickShadow } from '../../audio/animations/barulhoWaapiRunner';
import { triggerAoVivoShockwave } from './AoVivoShockwave';
import { cancelTrackedElementAnimation, runClockSyncedWaapi } from './aoVivoWaapiClockSync';
import { findCaixaSameHandLookahead } from './caixaSameHandLookahead';

export { findCaixaSameHandLookahead };

const shadowNodeCache = new WeakMap<SVGSVGElement, SVGGElement | null>();
function getCaixaShadowNode(stickEl: SVGSVGElement): SVGGElement | null {
  if (!shadowNodeCache.has(stickEl)) {
    shadowNodeCache.set(stickEl, stickEl.querySelector('[data-stick-shadow]') as SVGGElement | null);
  }
  return shadowNodeCache.get(stickEl) ?? null;
}

function animateCaixaStick(
  stickEl: SVGSVGElement | null, animRef: React.MutableRefObject<Animation | null>,
  stroke: string, isLeftSide: boolean, family: CaixaStickFamily,
  nextKind: CaixaNextStrokeKind, realMsUntilNext: number, flaRole: 'none' | 'main' | 'grace' = 'none', deltaMs = 0, customNominalMs?: number
) {
  if (!stickEl) return;
  const c = getActiveCaixaSticksConfig(family);
  const sUp = stroke.toUpperCase();
  const isStrong = flaRole !== 'grace' && (stroke === 'D' || stroke === 'E' || sUp === 'A' || sUp === 'F' || stroke === 'S' || stroke === 'V' || sUp === 'C' || sUp === 'X' || sUp === 'R');
  const effectiveDuration = computeBallisticDurationMs(isStrong, realMsUntilNext, c.speedMultiplier, customNominalMs);
  const { tImpactMs, tHoldEndMs } = computeImpactHoldTiming(effectiveDuration, flaRole === 'main' ? c.flaGraceDelayMs : 0);

  runClockSyncedWaapi({
    el: stickEl,
    keyframes: generateCaixaPredictiveKeyframes(stroke, isLeftSide, family, nextKind, effectiveDuration, flaRole, realMsUntilNext),
    durationMs: effectiveDuration, deltaMs, tImpactMs, tHoldEndMs, animRef,
  });
  const shadowEl = getCaixaShadowNode(stickEl);
  if (shadowEl) {
    runClockSyncedWaapi({
      el: shadowEl,
      keyframes: generateCaixaShadowKeyframes(stroke, isLeftSide, nextKind, family, effectiveDuration, isFastRepeatCompactPrep(realMsUntilNext)),
      durationMs: effectiveDuration, deltaMs, tImpactMs, tHoldEndMs,
    });
  }
}

function animateCaixaStickBarulho(
  stickEl: SVGSVGElement | null, animRef: React.MutableRefObject<Animation | null>,
  isLeftSide: boolean, family: CaixaStickFamily, nextKind: CaixaNextStrokeKind,
  rollStepDurMs: number, leadMs: number, plan: BarulhoStepPlan, oneShotStepMode = false
) {
  if (!stickEl) return;
  const c = getActiveCaixaSticksConfig(family), prof = c[family], cycleMs = Math.max(52, Math.round(82 / c.speedMultiplier));
  const loopFrames = generateCaixaBarulhoLoopFrames(isLeftSide, family, plan.amplitude || 0.7);
  const { startTransform, endTransform } = resolveStickStartAndEndTransforms(isLeftSide, prof.scale, c.restOffsetY, getCaixaStickRestTransform(isLeftSide, family), c.transitions, plan.amplitude >= 0.85, nextKind);
  if (plan.action === 'stop') releaseWaapiBarulhoRoll({ el: stickEl, animRef, contactTransform: String(loopFrames[0].transform), endTransform, loopFrames, cycleMs, leadMs });
  else runWaapiBarulhoRoll({ el: stickEl, animRef, startTransform, loopFrames, endTransform, cycleMs, stepDurationMs: rollStepDurMs, leadMs, plan, oneShotStepMode });
  syncBarulhoStickShadow(stickEl, 3, c.shadowOpacity, getCaixaShadowRestTransform(isLeftSide, family), +(c.shadowOpacity * 0.42).toFixed(2), rollStepDurMs, leadMs, plan, oneShotStepMode);
}

export function dispatchCaixaPredictiveStroke(
  instId: string, stroke: string, isVibrate: boolean, isSubStep: boolean, isLeftHanded: boolean,
  activePlayingSteps: any[] | undefined, currentStep: number, stepDurationMs: number,
  leftStickEl: SVGSVGElement | null, rightStickEl: SVGSVGElement | null, haloEl: HTMLDivElement | null,
  leftAnimRef: React.MutableRefObject<Animation | null>, rightAnimRef: React.MutableRefObject<Animation | null>,
  geometry: { targetX: number; targetY: number }, leadMs = 0, oneShotStepMode = false, stepDurationsMs?: readonly number[]
) {
  const family = resolveCaixaActiveFamily(instId), norm = (stroke || '').trim(), sUp = norm.toUpperCase();
  const domLook = findCaixaSameHandLookahead(activePlayingSteps, currentStep, stepDurationMs, true, isSubStep, stepDurationsMs);
  const secLook = findCaixaSameHandLookahead(activePlayingSteps, currentStep, stepDurationMs, false, isSubStep, stepDurationsMs);
  const domEl = isLeftHanded ? leftStickEl : rightStickEl, domRef = isLeftHanded ? leftAnimRef : rightAnimRef;
  const secEl = isLeftHanded ? rightStickEl : leftStickEl, secRef = isLeftHanded ? rightAnimRef : leftAnimRef;

  const plan = consumeBarulhoStepPlan(family, isVibrate ? '~' : norm, activePlayingSteps, currentStep, isSubStep);
  if (plan.action !== 'none') {
    const rollStepDurMs = isSubStep ? Math.max(40, Math.round(stepDurationMs * 0.5)) : stepDurationMs;
    animateCaixaStickBarulho(domEl, domRef, isLeftHanded, family, domLook.nextKind, rollStepDurMs, leadMs, plan, oneShotStepMode);
    animateCaixaStickBarulho(secEl, secRef, !isLeftHanded, family, secLook.nextKind, rollStepDurMs, leadMs, plan, oneShotStepMode);
    if (haloEl && (plan.action === 'start' || norm === 'B')) triggerAoVivoShockwave(haloEl, { x: geometry.targetX, y: geometry.targetY, isRoll: true, deltaMs: -leadMs });
    return;
  }
  if (!norm || norm === '0' || norm === '-' || norm === '.' || norm === '/') return;

  const deltaMs = -leadMs;
  if (norm === 'F') {
    animateCaixaStick(secEl, secRef, 'e', !isLeftHanded, family, secLook.nextKind, secLook.msUntilNext, 'grace', deltaMs);
    animateCaixaStick(domEl, domRef, 'D', isLeftHanded, family, domLook.nextKind, domLook.msUntilNext, 'main', deltaMs);
  } else if (norm === 'f') {
    animateCaixaStick(domEl, domRef, 'd', isLeftHanded, family, domLook.nextKind, domLook.msUntilNext, 'grace', deltaMs);
    animateCaixaStick(secEl, secRef, 'E', !isLeftHanded, family, secLook.nextKind, secLook.msUntilNext, 'main', deltaMs);
  } else if (norm === 'R') animateCaixaStick(domEl, domRef, 'R', isLeftHanded, family, domLook.nextKind, domLook.msUntilNext, 'none', deltaMs, Math.max(225, stepDurationMs));
  else if (norm === 'r') animateCaixaStick(secEl, secRef, 'r', !isLeftHanded, family, secLook.nextKind, secLook.msUntilNext, 'none', deltaMs, Math.max(200, stepDurationMs));
  else if (norm === 'A') animateCaixaStick(domEl, domRef, 'A', isLeftHanded, family, domLook.nextKind, domLook.msUntilNext, 'none', deltaMs);
  else if (norm === 'a') animateCaixaStick(secEl, secRef, 'a', !isLeftHanded, family, secLook.nextKind, secLook.msUntilNext, 'none', deltaMs);
  else {
    if (['C', 'X', 'D', 'S'].includes(sUp)) animateCaixaStick(domEl, domRef, norm, isLeftHanded, family, domLook.nextKind, domLook.msUntilNext, 'none', deltaMs);
    if (['C', 'X', 'E', 'V'].includes(sUp)) animateCaixaStick(secEl, secRef, norm, !isLeftHanded, family, secLook.nextKind, secLook.msUntilNext, 'none', deltaMs);
  }
  if (haloEl && ['D', 'E', 'A', 'a', 'F', 'f', 'R'].includes(norm)) {
    triggerAoVivoShockwave(haloEl, { x: geometry.targetX, y: geometry.targetY, isRoll: norm === 'R', isRimshot: norm === 'A' || norm === 'a', deltaMs });
  }
}

export function resetCaixaSticksAndShadows(instId: string, leftStickEl: SVGSVGElement | null, rightStickEl: SVGSVGElement | null) {
  const family = resolveCaixaActiveFamily(instId);
  [leftStickEl, rightStickEl].forEach((el, idx) => {
    if (!el) return;
    const isLeft = idx === 0;
    cancelTrackedElementAnimation(el); el.style.transition = 'none'; el.style.transform = getCaixaStickRestTransform(isLeft, family);
    const sh = getCaixaShadowNode(el);
    if (sh) { cancelTrackedElementAnimation(sh); sh.style.transform = getCaixaShadowRestTransform(isLeft, family); }
  });
}
