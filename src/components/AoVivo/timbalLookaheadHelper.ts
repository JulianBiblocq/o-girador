import React from 'react';
import { computeBallisticDurationMs, computeImpactHoldTiming } from '../../audio/animations/aoVivoBallisticMath';
import {
  CONFIG_TIMBAL_HANDS, generateTimbalBarulhoLoopFrames, generateTimbalPredictiveKeyframes,
  getTimbalHandRestTransform, getTimbalShadowRestTransform, resolveTimbalBarulhoBounds,
} from '../../audio/animations/timbalKinematics';
import { BarulhoStepPlan, consumeBarulhoStepPlan, releaseWaapiBarulhoRoll, runWaapiBarulhoRoll } from '../../audio/animations/barulhoWaapiRunner';
import { triggerAoVivoShockwave } from './AoVivoShockwave';
import { cancelTrackedElementAnimation, runClockSyncedWaapi } from './aoVivoWaapiClockSync';
import { applyTimbalSlapBiomechanics } from './TimbalHandSvgs';
import { findTimbalSameHandLookahead, TimbalLookaheadResult } from './timbalSameHandLookahead';

export { findTimbalSameHandLookahead };
export type { TimbalLookaheadResult };

const timbalSubCache = new WeakMap<SVGSVGElement, { fingers: SVGGElement[]; shEl: SVGGElement | null }>();
function getTimbalSubNodes(handEl: SVGSVGElement) {
  let cached = timbalSubCache.get(handEl);
  if (!cached) {
    cached = {
      fingers: Array.from(handEl.querySelectorAll<SVGGElement>('[data-finger-mult]')),
      shEl: handEl.querySelector('[data-hand-shadow]') as SVGGElement | null,
    };
    timbalSubCache.set(handEl, cached);
  }
  return cached;
}

function animateTimbalHand(
  handEl: SVGSVGElement | null, animRef: React.MutableRefObject<Animation | null>,
  stroke: string, isLeftSide: boolean, look: TimbalLookaheadResult, flaRole: 'none' | 'main' | 'grace' = 'none', deltaMs = 0
) {
  if (!handEl) return;
  const { speedMultiplier, strokes, shadowDepthPx, shadowOpacity } = CONFIG_TIMBAL_HANDS;
  const sUp = stroke.toUpperCase();
  const isStrong = !(['g', 'a', 's', 't', 'd', 'p', 'D'].includes(stroke) || flaRole === 'grace');
  const customNom = sUp === 'P' ? Math.max(225, 18 + strokes.presoHoldMs + 90) : undefined;
  const dur = computeBallisticDurationMs(isStrong, look.msUntilNext, speedMultiplier, customNom);
  const { impactOff, holdEndOff, tImpactMs, tHoldEndMs } = computeImpactHoldTiming(dur, flaRole === 'main' ? strokes.flaGraceDelayMs : 0);

  runClockSyncedWaapi({
    el: handEl,
    keyframes: generateTimbalPredictiveKeyframes(stroke, isLeftSide, look.nextKind, dur, flaRole, look.nextSymbol, look.isNextWeak, look.msUntilNext),
    durationMs: dur, deltaMs, tImpactMs, tHoldEndMs, animRef,
  });
  applyTimbalSlapBiomechanics(handEl, sUp === 'S' || sUp === 'T' || sUp === 'C' || sUp === 'X');
  const { fingers, shEl } = getTimbalSubNodes(handEl);
  if (sUp === 'S' || sUp === 'T') {
    for (let i = 0; i < fingers.length; i++) {
      const fEl = fingers[i], m = Number(fEl.getAttribute('data-finger-mult') || 0);
      const tr = `translateY(${+(-m * strokes.slapThumbLift * 11).toFixed(1)}px) rotate(${+(m * strokes.slapFingerSplayDeg).toFixed(2)}deg)`;
      runClockSyncedWaapi({ el: fEl, keyframes: [{ transform: tr }, { transform: tr, offset: holdEndOff }, { transform: 'translateY(0px) rotate(0deg)' }], durationMs: dur, deltaMs, tImpactMs, tHoldEndMs });
    }
  }
  if (shEl) {
    const sign = isLeftSide ? -1 : 1, isClap = sUp === 'C' || sUp === 'X';
    const mid = isClap
      ? { transform: `translate3d(${sign * 26}px, ${Math.round(shadowDepthPx * 1.9)}px, 0) scale(1.22)`, opacity: +(shadowOpacity * 0.22).toFixed(2) }
      : { transform: `translate3d(${sign * 2}px, 3px, 0) scale(0.98)`, opacity: +shadowOpacity.toFixed(2) };
    runClockSyncedWaapi({
      el: shEl,
      keyframes: [
        { transform: `translate3d(${sign * 18}px, ${Math.round(shadowDepthPx * 1.45)}px, 0) scale(1.13)`, opacity: +(shadowOpacity * 0.32).toFixed(2), offset: 0 },
        { ...mid, offset: impactOff }, { ...mid, offset: holdEndOff },
        { transform: getTimbalShadowRestTransform(isLeftSide, true), opacity: +(shadowOpacity * 0.45).toFixed(2), offset: 1 },
      ],
      durationMs: dur, deltaMs, tImpactMs, tHoldEndMs,
    });
  }
}

function animateTimbalHandBarulho(
  handEl: SVGSVGElement | null, animRef: React.MutableRefObject<Animation | null>,
  isLeftSide: boolean, look: TimbalLookaheadResult, rollStepDurMs: number, leadMs: number, plan: BarulhoStepPlan, oneShotStepMode = false
) {
  if (!handEl) return;
  applyTimbalSlapBiomechanics(handEl, false);
  const cycleMs = Math.max(55, Math.round(90 / CONFIG_TIMBAL_HANDS.speedMultiplier));
  const loopFrames = generateTimbalBarulhoLoopFrames(isLeftSide, plan.amplitude || 0.7);
  const { startTr, endTr } = resolveTimbalBarulhoBounds(isLeftSide, look.nextSymbol, look.isNextWeak);
  if (plan.action === 'stop') releaseWaapiBarulhoRoll({ el: handEl, animRef, contactTransform: String(loopFrames[0].transform), endTransform: endTr, loopFrames, cycleMs, leadMs });
  else runWaapiBarulhoRoll({ el: handEl, animRef, startTransform: startTr, loopFrames, endTransform: endTr, cycleMs, stepDurationMs: rollStepDurMs, leadMs, plan, oneShotStepMode });
}

export function dispatchTimbalPredictiveStroke(
  stroke: string, isVibrate: boolean, isSubStep: boolean, isLeftHanded: boolean,
  activePlayingSteps: any[] | undefined, currentStep: number, stepDurationMs: number,
  leftStickEl: SVGSVGElement | null, rightStickEl: SVGSVGElement | null, haloEl: HTMLDivElement | null,
  leftAnimRef: React.MutableRefObject<Animation | null>, rightAnimRef: React.MutableRefObject<Animation | null>,
  geometry: { targetX: number; targetY: number }, leadMs = 0, oneShotStepMode = false, stepDurationsMs?: readonly number[]
) {
  const norm = (stroke || '').trim(), sUp = norm.toUpperCase();
  const domLook = findTimbalSameHandLookahead(activePlayingSteps, currentStep, stepDurationMs, true, isSubStep, stepDurationsMs);
  const secLook = findTimbalSameHandLookahead(activePlayingSteps, currentStep, stepDurationMs, false, isSubStep, stepDurationsMs);
  const domEl = isLeftHanded ? leftStickEl : rightStickEl, domRef = isLeftHanded ? leftAnimRef : rightAnimRef;
  const secEl = isLeftHanded ? rightStickEl : leftStickEl, secRef = isLeftHanded ? rightAnimRef : leftAnimRef;

  const plan = consumeBarulhoStepPlan('timbal', isVibrate ? '~' : norm, activePlayingSteps, currentStep, isSubStep);
  if (plan.action !== 'none') {
    const rollStepDurMs = isSubStep ? Math.max(40, Math.round(stepDurationMs * 0.5)) : stepDurationMs;
    animateTimbalHandBarulho(domEl, domRef, isLeftHanded, domLook, rollStepDurMs, leadMs, plan, oneShotStepMode);
    animateTimbalHandBarulho(secEl, secRef, !isLeftHanded, secLook, rollStepDurMs, leadMs, plan, oneShotStepMode);
    if (haloEl && (plan.action === 'start' || norm === 'B')) triggerAoVivoShockwave(haloEl, { x: geometry.targetX, y: geometry.targetY, isRoll: true, deltaMs: -leadMs });
    return;
  }
  if (!norm || norm === '0' || norm === '-' || norm === '.' || norm === '/') return;

  const deltaMs = -leadMs;
  if (norm === 'F' || norm === 'V') { const k = norm === 'F' ? 'A' : 'S'; animateTimbalHand(secEl, secRef, k.toLowerCase(), !isLeftHanded, secLook, 'grace', deltaMs); animateTimbalHand(domEl, domRef, k, isLeftHanded, domLook, 'main', deltaMs); }
  else if (norm === 'f' || norm === 'v') { const k = norm === 'f' ? 'A' : 'S'; animateTimbalHand(domEl, domRef, k, isLeftHanded, domLook, 'grace', deltaMs); animateTimbalHand(secEl, secRef, k.toLowerCase(), !isLeftHanded, secLook, 'main', deltaMs); }
  else if (sUp === 'C' || sUp === 'X') { animateTimbalHand(domEl, domRef, 'C', isLeftHanded, domLook, 'none', deltaMs); animateTimbalHand(secEl, secRef, 'C', !isLeftHanded, secLook, 'none', deltaMs); }
  else if (['G', 'A', 'S', 'T', 'D', 'P'].includes(norm)) animateTimbalHand(domEl, domRef, norm, isLeftHanded, domLook, 'none', deltaMs);
  else if (['g', 'a', 's', 't', 'd', 'p'].includes(norm)) animateTimbalHand(secEl, secRef, norm, !isLeftHanded, secLook, 'none', deltaMs);
  if (haloEl && ['G', 'A', 'S', 'T', 'P', 'F', 'V'].includes(norm)) triggerAoVivoShockwave(haloEl, { x: geometry.targetX, y: geometry.targetY, deltaMs });
}

export function resetTimbalHandsAndShadows(leftStickEl: SVGSVGElement | null, rightStickEl: SVGSVGElement | null) {
  [leftStickEl, rightStickEl].forEach((el, idx) => {
    if (!el) return;
    const isLeft = idx === 0;
    cancelTrackedElementAnimation(el); el.style.transition = 'none'; el.style.transform = getTimbalHandRestTransform(isLeft);
    applyTimbalSlapBiomechanics(el, CONFIG_TIMBAL_HANDS.posePreview === 'slap');
    const { shEl } = getTimbalSubNodes(el);
    if (shEl) { cancelTrackedElementAnimation(shEl); shEl.style.transform = getTimbalShadowRestTransform(isLeft); }
  });
}
