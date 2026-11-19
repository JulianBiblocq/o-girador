import React from 'react';
import {
  CONFIG_ALFAIA_STICKS, AlfaiaNextStrokeKind, AlfaiaSecondaryStickFamily,
  generateAlfaiaBarulhoLoopFrames, generateAlfaiaPredictiveKeyframes, generateAlfaiaShadowKeyframes,
  generateBacalhauAbafadoTipKeyframes, generateBacalhauTipKeyframes,
  getAlfaiaShadowRestTransform, getAlfaiaStickRestTransform, getHandMemory, getProfileScale,
} from '../../audio/animations/alfaiaKinematics';
import { resolveStickStartAndEndTransforms } from '../../audio/animations/handTransitionEngine';
import { BarulhoStepPlan, consumeBarulhoStepPlan, releaseWaapiBarulhoRoll, runWaapiBarulhoRoll, syncBarulhoStickShadow } from '../../audio/animations/barulhoWaapiRunner';
import { triggerAoVivoShockwave } from './AoVivoShockwave';
import { resolveAlfaiaSecondaryFamily } from './AlfaiaSticksOverlay';
import { findAlfaiaCrossHandLookahead, isMufflingStickRef, releaseMufflingStickImmediately, resetAlfaiaMuffleState } from './alfaiaMuffleReleaseHelper';

function isStrokeForHand(token: string, isDominantHand: boolean): boolean {
  const s = (token || '').trim(), up = s.toUpperCase();
  if (!s || s === '-' || s === '.' || s === '/' || s === '0') return false;
  if (['C', 'X', 'B', 'T', 'R', 'F', '~'].includes(up)) return true;
  return isDominantHand ? up === 'D' || up === 'S' : up === 'E' || up === 'A' || up === 'I' || up === 'V';
}

function extractTokens(raw: any): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map((x) => String(x || '').trim());
  if (typeof raw === 'object' && Array.isArray(raw.sim)) return raw.sim.map((x: any) => String(x || '').trim());
  return [String(raw).trim()];
}

export function findSameHandLookahead(
  activePlayingSteps: any[] | undefined, currentStep: number, stepDurationMs: number, isDominantHand: boolean, isSubStep = false
): { nextKind: AlfaiaNextStrokeKind; msUntilNext: number } {
  if (!activePlayingSteps || activePlayingSteps.length === 0) return { nextKind: 'idle', msUntilNext: Math.round(stepDurationMs * 2) };
  const len = activePlayingSteps.length;
  if (!isSubStep && Array.isArray(activePlayingSteps[currentStep]) && activePlayingSteps[currentStep].length > 1) {
    const subTok = String(activePlayingSteps[currentStep][1] || '').trim();
    if (isStrokeForHand(subTok, isDominantHand)) return { nextKind: subTok === subTok.toUpperCase() && subTok.toUpperCase() !== 'A' ? 'strong' : 'weak', msUntilNext: Math.max(70, Math.round(stepDurationMs * 0.5)) };
  }
  for (let offset = 1; offset <= Math.min(len, 4); offset++) {
    const raw = activePlayingSteps[(currentStep + offset) % len], list = extractTokens(raw);
    for (let i = 0; i < list.length; i++) {
      const token = list[i];
      if (isStrokeForHand(token, isDominantHand)) {
        const isStrong = ['D', 'E', 'I', 'C', 'X', 'B', 'S', 'V', 'F', 'R'].includes(token);
        return { nextKind: isStrong ? 'strong' : 'weak', msUntilNext: Math.max(95, Math.round((offset + (i > 0 && Array.isArray(raw) ? 0.5 : 0)) * stepDurationMs)) };
      }
    }
  }
  return { nextKind: 'idle', msUntilNext: Math.max(180, Math.round(stepDurationMs * 2)) };
}

function animateStickWithShadow(
  stickEl: SVGSVGElement | null, animRef: React.MutableRefObject<Animation | null>,
  stroke: string, isLeftSide: boolean, family: AlfaiaSecondaryStickFamily,
  nextKind: AlfaiaNextStrokeKind, durationMs: number, autoLiftBeforeOtherHand = false
) {
  if (!stickEl) return;
  const sUp = stroke.toUpperCase(), effectiveDuration = Math.max(85, Math.round(durationMs / CONFIG_ALFAIA_STICKS.speedMultiplier));
  const wasPressed = getHandMemory(isLeftSide).posture === 'pressed_skin';
  animRef.current?.cancel(); stickEl.getAnimations?.().forEach((a) => a.cancel());
  animRef.current = stickEl.animate(generateAlfaiaPredictiveKeyframes(stroke, isLeftSide, family, nextKind, effectiveDuration, autoLiftBeforeOtherHand), { duration: effectiveDuration, iterations: 1, fill: 'forwards' });
  const tipEl = stickEl.querySelector('[data-bacalhau-tip]') as SVGGElement | null;
  if (tipEl && family === 'bacalhau' && !['C', 'X'].includes(sUp)) {
    tipEl.getAnimations().forEach((a) => a.cancel());
    tipEl.animate(sUp === 'A' ? generateBacalhauAbafadoTipKeyframes(isLeftSide, autoLiftBeforeOtherHand) : generateBacalhauTipKeyframes(isLeftSide, effectiveDuration), { duration: effectiveDuration, iterations: 1, fill: 'forwards' });
  }
  const shadowEl = stickEl.querySelector('[data-stick-shadow]') as SVGGElement | null;
  if (shadowEl) {
    shadowEl.getAnimations().forEach((a) => a.cancel());
    shadowEl.animate(generateAlfaiaShadowKeyframes(stroke, isLeftSide, nextKind, wasPressed, autoLiftBeforeOtherHand), { duration: effectiveDuration, iterations: 1, fill: 'forwards' });
  }
}

function animateAlfaiaStickBarulho(
  stickEl: SVGSVGElement | null, animRef: React.MutableRefObject<Animation | null>,
  isLeftSide: boolean, fam: AlfaiaSecondaryStickFamily, nextKind: AlfaiaNextStrokeKind,
  stepDurationMs: number, leadMs: number, plan: BarulhoStepPlan
) {
  if (!stickEl) return;
  const c = CONFIG_ALFAIA_STICKS, cycleMs = Math.max(55, Math.round(90 / c.speedMultiplier));
  const loopFrames = generateAlfaiaBarulhoLoopFrames(isLeftSide, fam, plan.amplitude || 0.7);
  const { startTransform, endTransform } = resolveStickStartAndEndTransforms(isLeftSide, getProfileScale(fam), c.restOffsetY, getAlfaiaStickRestTransform(isLeftSide, fam), c.transitions, plan.amplitude >= 0.85, nextKind);
  if (plan.action === 'stop') releaseWaapiBarulhoRoll({ el: stickEl, animRef, contactTransform: String(loopFrames[0].transform), endTransform, loopFrames, cycleMs, leadMs });
  else runWaapiBarulhoRoll({ el: stickEl, animRef, startTransform, loopFrames, endTransform, cycleMs, stepDurationMs, leadMs, plan });
  syncBarulhoStickShadow(stickEl, 4, c.shadowOpacity, getAlfaiaShadowRestTransform(isLeftSide), +(c.shadowOpacity * 0.45).toFixed(2), stepDurationMs, leadMs, plan);
}

export function dispatchAlfaiaPredictiveStroke(
  activeTrack: any, stroke: string, isVibrate: boolean, isSubStep: boolean, isLeftHanded: boolean,
  activePlayingSteps: any[] | undefined, currentStep: number, stepDurationMs: number,
  leftStickEl: SVGSVGElement | null, rightStickEl: SVGSVGElement | null, haloEl: HTMLDivElement | null,
  leftAnimRef: React.MutableRefObject<Animation | null>, rightAnimRef: React.MutableRefObject<Animation | null>,
  geometry: { targetX: number; targetY: number }, leadMs = 0
) {
  const secFamily = resolveAlfaiaSecondaryFamily(activeTrack), norm = (stroke || '').trim(), sUp = norm.toUpperCase();
  const domLook = findSameHandLookahead(activePlayingSteps, currentStep, stepDurationMs, true, isSubStep);
  const secLook = findSameHandLookahead(activePlayingSteps, currentStep, stepDurationMs, false, isSubStep);
  const domStickEl = isLeftHanded ? leftStickEl : rightStickEl, domAnimRef = isLeftHanded ? leftAnimRef : rightAnimRef;
  const secStickEl = isLeftHanded ? rightStickEl : leftStickEl, secAnimRef = isLeftHanded ? rightAnimRef : leftAnimRef, secSide = !isLeftHanded;

  const plan = consumeBarulhoStepPlan('alfaia', isVibrate ? '~' : norm, activePlayingSteps, currentStep, isSubStep);
  if (plan.action !== 'none') {
    isMufflingStickRef.current = false;
    animateAlfaiaStickBarulho(domStickEl, domAnimRef, isLeftHanded, 'macaneta', domLook.nextKind, stepDurationMs, leadMs, plan);
    animateAlfaiaStickBarulho(secStickEl, secAnimRef, secSide, secFamily, secLook.nextKind, stepDurationMs, leadMs, plan);
    if (haloEl && (plan.action === 'start' || norm === 'B')) triggerAoVivoShockwave(haloEl, { x: geometry.targetX, y: geometry.targetY, isRoll: true, delayMs: leadMs });
    return;
  }
  if (!norm || norm === '0' || norm === '-' || norm === '.' || norm === '/') return;

  const isDual = ['C', 'X', 'F', 'R'].includes(sUp);
  if ((sUp === 'D' || sUp === 'S') && (isMufflingStickRef.current || getHandMemory(secSide).posture === 'pressed_skin')) {
    releaseMufflingStickImmediately(secStickEl, secAnimRef, secSide, secFamily, 65);
  }
  if (isDual || sUp === 'D' || sUp === 'S') animateStickWithShadow(domStickEl, domAnimRef, sUp === 'R' ? 'D' : norm, isLeftHanded, 'macaneta', domLook.nextKind, domLook.msUntilNext);
  if (sUp === 'A') {
    const crossLook = findAlfaiaCrossHandLookahead(activePlayingSteps, currentStep, stepDurationMs, isLeftHanded, isSubStep);
    const autoLift = crossLook.nextIsOtherHand && crossLook.msUntilNextAnyHand !== null;
    isMufflingStickRef.current = !autoLift;
    animateStickWithShadow(secStickEl, secAnimRef, norm, secSide, secFamily, secLook.nextKind, autoLift && crossLook.msUntilNextAnyHand ? Math.max(90, crossLook.msUntilNextAnyHand - 22) : secLook.msUntilNext, autoLift);
  } else if (isDual || sUp === 'E' || sUp === 'I' || sUp === 'V') {
    isMufflingStickRef.current = false;
    animateStickWithShadow(secStickEl, secAnimRef, sUp === 'R' ? 'E' : norm, secSide, secFamily, secLook.nextKind, secLook.msUntilNext);
  }
  if (haloEl && ['D', 'E', 'I', 'S', 'V', 'R', 'F'].includes(norm)) triggerAoVivoShockwave(haloEl, { x: geometry.targetX, y: geometry.targetY });
}

export function resetAlfaiaSticksAndShadows(activeTrack: any, isLeftHanded: boolean, leftStickEl: SVGSVGElement | null, rightStickEl: SVGSVGElement | null) {
  resetAlfaiaMuffleState();
  const secFamily = resolveAlfaiaSecondaryFamily(activeTrack);
  const applyRest = (el: SVGSVGElement | null, isLeftSide: boolean, fam: AlfaiaSecondaryStickFamily) => {
    if (!el) return;
    el.getAnimations().forEach((a) => a.cancel()); el.style.transition = 'none'; el.style.transform = getAlfaiaStickRestTransform(isLeftSide, fam);
    const tip = el.querySelector('[data-bacalhau-tip]') as SVGGElement | null;
    if (tip) { tip.getAnimations().forEach((a) => a.cancel()); tip.style.transform = 'rotateZ(0deg) skewX(0deg) scaleX(1)'; }
    const sh = el.querySelector('[data-stick-shadow]') as SVGGElement | null;
    if (sh) { sh.getAnimations().forEach((a) => a.cancel()); sh.style.transform = getAlfaiaShadowRestTransform(isLeftSide); }
  };
  applyRest(leftStickEl, true, isLeftHanded ? 'macaneta' : secFamily);
  applyRest(rightStickEl, false, isLeftHanded ? secFamily : 'macaneta');
}
