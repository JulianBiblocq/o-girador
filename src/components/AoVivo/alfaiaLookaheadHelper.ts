import React from 'react';
import {
  CONFIG_ALFAIA_STICKS, AlfaiaNextStrokeKind, AlfaiaSecondaryStickFamily,
  generateAlfaiaBarulhoLoopFrames, generateAlfaiaPredictiveKeyframes, generateAlfaiaShadowKeyframes,
  generateBacalhauAbafadoTipKeyframes, generateBacalhauTipKeyframes,
  getAlfaiaShadowRestTransform, getAlfaiaStickRestTransform, getHandMemory, getProfileScale,
} from '../../audio/animations/alfaiaKinematics';
import { computeBallisticDurationMs, computeImpactHoldTiming, isFastRepeatCompactPrep } from '../../audio/animations/aoVivoBallisticMath';
import { resolveStickStartAndEndTransforms } from '../../audio/animations/handTransitionEngine';
import { BarulhoStepPlan, consumeBarulhoStepPlan, releaseWaapiBarulhoRoll, runWaapiBarulhoRoll, syncBarulhoStickShadow } from '../../audio/animations/barulhoWaapiRunner';
import { triggerAoVivoShockwave } from './AoVivoShockwave';
import { cancelTrackedElementAnimation, alignHitLeadToStrokeStartDeltaMs, runClockSyncedWaapi } from './aoVivoWaapiClockSync';
import { resolveAlfaiaSecondaryFamily } from './AlfaiaSticksOverlay';
import { findAlfaiaCrossHandLookahead, isMufflingStickRef, releaseMufflingStickImmediately, resetAlfaiaMuffleState } from './alfaiaMuffleReleaseHelper';
import { findSameHandLookahead } from './alfaiaSameHandLookahead';

export { findSameHandLookahead };

const subNodesCache = new WeakMap<SVGSVGElement, { tipEl: SVGGElement | null; shadowEl: SVGGElement | null }>();
function getAlfaiaSubNodes(stickEl: SVGSVGElement) {
  let cached = subNodesCache.get(stickEl);
  if (!cached) {
    cached = {
      tipEl: stickEl.querySelector('[data-bacalhau-tip]') as SVGGElement | null,
      shadowEl: stickEl.querySelector('[data-stick-shadow]') as SVGGElement | null,
    };
    subNodesCache.set(stickEl, cached);
  }
  return cached;
}

function animateStickWithShadow(
  stickEl: SVGSVGElement | null, animRef: React.MutableRefObject<Animation | null>,
  stroke: string, isLeftSide: boolean, family: AlfaiaSecondaryStickFamily,
  nextKind: AlfaiaNextStrokeKind, realMsUntilNext: number, autoLiftBeforeOtherHand = false, deltaMs = 0
) {
  if (!stickEl) return;
  const sUp = stroke.toUpperCase(), spd = CONFIG_ALFAIA_STICKS.speedMultiplier;
  const isAbafado = sUp === 'A';
  const isStrong = stroke === 'D' || stroke === 'E' || stroke === 'I' || stroke === 'S' || stroke === 'V' || sUp === 'C' || sUp === 'X';
  const effectiveDuration = isAbafado
    ? Math.max(85, Math.round(realMsUntilNext / spd))
    : computeBallisticDurationMs(isStrong, realMsUntilNext, spd);
  const wasPressed = getHandMemory(isLeftSide).posture === 'pressed_skin';
  const { tImpactMs, tHoldEndMs } = computeImpactHoldTiming(effectiveDuration, wasPressed && !isAbafado ? Math.min(12, effectiveDuration * 0.08) : 0);
  const alignedDeltaMs = deltaMs < 0 ? deltaMs + tImpactMs : deltaMs;

  runClockSyncedWaapi({
    el: stickEl,
    keyframes: generateAlfaiaPredictiveKeyframes(stroke, isLeftSide, family, nextKind, effectiveDuration, autoLiftBeforeOtherHand, realMsUntilNext),
    durationMs: effectiveDuration, deltaMs: alignedDeltaMs, tImpactMs, tHoldEndMs, animRef,
  });
  const { tipEl, shadowEl } = getAlfaiaSubNodes(stickEl);
  if (tipEl && family === 'bacalhau' && !['C', 'X'].includes(sUp)) {
    runClockSyncedWaapi({
      el: tipEl,
      keyframes: isAbafado ? generateBacalhauAbafadoTipKeyframes(isLeftSide, autoLiftBeforeOtherHand) : generateBacalhauTipKeyframes(isLeftSide, effectiveDuration),
      durationMs: effectiveDuration, deltaMs: alignedDeltaMs, tImpactMs, tHoldEndMs,
    });
  }
  if (shadowEl) {
    runClockSyncedWaapi({
      el: shadowEl,
      keyframes: generateAlfaiaShadowKeyframes(stroke, isLeftSide, nextKind, wasPressed, autoLiftBeforeOtherHand, effectiveDuration, isFastRepeatCompactPrep(realMsUntilNext)),
      durationMs: effectiveDuration, deltaMs: alignedDeltaMs, tImpactMs, tHoldEndMs,
    });
  }
  void alignHitLeadToStrokeStartDeltaMs;
}

function animateAlfaiaStickBarulho(
  stickEl: SVGSVGElement | null, animRef: React.MutableRefObject<Animation | null>,
  isLeftSide: boolean, fam: AlfaiaSecondaryStickFamily, nextKind: AlfaiaNextStrokeKind,
  rollStepDurMs: number, leadMs: number, plan: BarulhoStepPlan, oneShotStepMode = false
) {
  if (!stickEl) return;
  const c = CONFIG_ALFAIA_STICKS, cycleMs = Math.max(55, Math.round(90 / c.speedMultiplier));
  const loopFrames = generateAlfaiaBarulhoLoopFrames(isLeftSide, fam, plan.amplitude || 0.7);
  const { startTransform, endTransform } = resolveStickStartAndEndTransforms(isLeftSide, getProfileScale(fam), c.restOffsetY, getAlfaiaStickRestTransform(isLeftSide, fam), c.transitions, plan.amplitude >= 0.85, nextKind);
  if (plan.action === 'stop') releaseWaapiBarulhoRoll({ el: stickEl, animRef, contactTransform: String(loopFrames[0].transform), endTransform, loopFrames, cycleMs, leadMs });
  else runWaapiBarulhoRoll({ el: stickEl, animRef, startTransform, loopFrames, endTransform, cycleMs, stepDurationMs: rollStepDurMs, leadMs, plan, oneShotStepMode });
  syncBarulhoStickShadow(stickEl, 4, c.shadowOpacity, getAlfaiaShadowRestTransform(isLeftSide), +(c.shadowOpacity * 0.45).toFixed(2), rollStepDurMs, leadMs, plan, oneShotStepMode);
}

export function dispatchAlfaiaPredictiveStroke(
  activeTrack: any, stroke: string, isVibrate: boolean, isSubStep: boolean, isLeftHanded: boolean,
  activePlayingSteps: any[] | undefined, currentStep: number, stepDurationMs: number,
  leftStickEl: SVGSVGElement | null, rightStickEl: SVGSVGElement | null, haloEl: HTMLDivElement | null,
  leftAnimRef: React.MutableRefObject<Animation | null>, rightAnimRef: React.MutableRefObject<Animation | null>,
  geometry: { targetX: number; targetY: number }, leadMs = 0, oneShotStepMode = false, stepDurationsMs?: readonly number[]
) {
  const secFamily = resolveAlfaiaSecondaryFamily(activeTrack), norm = (stroke || '').trim(), sUp = norm.toUpperCase();
  const domLook = findSameHandLookahead(activePlayingSteps, currentStep, stepDurationMs, true, isSubStep, stepDurationsMs);
  const secLook = findSameHandLookahead(activePlayingSteps, currentStep, stepDurationMs, false, isSubStep, stepDurationsMs);
  const domStickEl = isLeftHanded ? leftStickEl : rightStickEl, domAnimRef = isLeftHanded ? leftAnimRef : rightAnimRef;
  const secStickEl = isLeftHanded ? rightStickEl : leftStickEl, secAnimRef = isLeftHanded ? rightAnimRef : leftAnimRef, secSide = !isLeftHanded;

  const plan = consumeBarulhoStepPlan('alfaia', isVibrate ? '~' : norm, activePlayingSteps, currentStep, isSubStep);
  if (plan.action !== 'none') {
    isMufflingStickRef.current = false;
    const rollStepDurMs = isSubStep ? Math.max(40, Math.round(stepDurationMs * 0.5)) : stepDurationMs;
    animateAlfaiaStickBarulho(domStickEl, domAnimRef, isLeftHanded, 'macaneta', domLook.nextKind, rollStepDurMs, leadMs, plan, oneShotStepMode);
    animateAlfaiaStickBarulho(secStickEl, secAnimRef, secSide, secFamily, secLook.nextKind, rollStepDurMs, leadMs, plan, oneShotStepMode);
    if (haloEl && (plan.action === 'start' || norm === 'B')) triggerAoVivoShockwave(haloEl, { x: geometry.targetX, y: geometry.targetY, isRoll: true, deltaMs: -leadMs });
    return;
  }
  if (!norm || norm === '0' || norm === '-' || norm === '.' || norm === '/') return;

  const deltaMs = -leadMs;
  const isDual = ['C', 'X', 'F', 'R'].includes(sUp);
  if ((sUp === 'D' || sUp === 'S') && (isMufflingStickRef.current || getHandMemory(secSide).posture === 'pressed_skin')) {
    releaseMufflingStickImmediately(secStickEl, secAnimRef, secSide, secFamily, Math.min(65, Math.max(38, secLook.msUntilNext - 12)), deltaMs);
  }
  if (isDual || sUp === 'D' || sUp === 'S') animateStickWithShadow(domStickEl, domAnimRef, sUp === 'R' ? 'D' : norm, isLeftHanded, 'macaneta', domLook.nextKind, domLook.msUntilNext, false, deltaMs);
  if (sUp === 'A') {
    const crossLook = findAlfaiaCrossHandLookahead(activePlayingSteps, currentStep, stepDurationMs, isLeftHanded, isSubStep, stepDurationsMs);
    const autoLift = crossLook.nextIsOtherHand && crossLook.msUntilNextAnyHand !== null;
    isMufflingStickRef.current = !autoLift;
    const muffleHoldMs = autoLift && crossLook.msUntilNextAnyHand ? Math.max(90, crossLook.msUntilNextAnyHand - 22) : Math.max(140, secLook.msUntilNext);
    animateStickWithShadow(secStickEl, secAnimRef, norm, secSide, secFamily, secLook.nextKind, muffleHoldMs, autoLift, deltaMs);
  } else if (isDual || sUp === 'E' || sUp === 'I' || sUp === 'V') {
    isMufflingStickRef.current = false;
    animateStickWithShadow(secStickEl, secAnimRef, sUp === 'R' ? 'E' : norm, secSide, secFamily, secLook.nextKind, secLook.msUntilNext, false, deltaMs);
  }
  if (haloEl && ['D', 'E', 'I', 'S', 'V', 'R', 'F'].includes(norm)) triggerAoVivoShockwave(haloEl, { x: geometry.targetX, y: geometry.targetY, deltaMs });
}

export function resetAlfaiaSticksAndShadows(activeTrack: any, isLeftHanded: boolean, leftStickEl: SVGSVGElement | null, rightStickEl: SVGSVGElement | null) {
  resetAlfaiaMuffleState();
  const secFamily = resolveAlfaiaSecondaryFamily(activeTrack);
  const applyRest = (el: SVGSVGElement | null, isLeftSide: boolean, fam: AlfaiaSecondaryStickFamily) => {
    if (!el) return;
    cancelTrackedElementAnimation(el); el.style.transition = 'none'; el.style.transform = getAlfaiaStickRestTransform(isLeftSide, fam);
    const { tipEl, shadowEl } = getAlfaiaSubNodes(el);
    if (tipEl) { cancelTrackedElementAnimation(tipEl); tipEl.style.transform = 'rotateZ(0deg) skewX(0deg) scaleX(1)'; }
    if (shadowEl) { cancelTrackedElementAnimation(shadowEl); shadowEl.style.transform = getAlfaiaShadowRestTransform(isLeftSide); }
  };
  applyRest(leftStickEl, true, isLeftHanded ? 'macaneta' : secFamily);
  applyRest(rightStickEl, false, isLeftHanded ? secFamily : 'macaneta');
}
