import React from 'react';
import {
  CONFIG_ALFAIA_STICKS, AlfaiaNextStrokeKind, AlfaiaSecondaryStickFamily,
  generateAlfaiaPredictiveKeyframes, generateAlfaiaShadowKeyframes,
  generateBacalhauAbafadoTipKeyframes, generateBacalhauTipKeyframes,
  getAlfaiaShadowRestTransform, getAlfaiaStickRestTransform, getHandMemory,
  KEYFRAMES_SKIN_BARULHO, KEYFRAMES_SKIN_WAVE,
} from '../../audio/animations/alfaiaKinematics';
import { resolveAlfaiaSecondaryFamily } from './AlfaiaSticksOverlay';
import {
  findAlfaiaCrossHandLookahead, isMufflingStickRef,
  releaseMufflingStickImmediately, resetAlfaiaMuffleState,
} from './alfaiaMuffleReleaseHelper';

function isStrokeForHand(token: string, isDominantHand: boolean): boolean {
  const s = (token || '').trim();
  if (!s || s === '-' || s === '.' || s === '/' || s === '0') return false;
  const up = s.toUpperCase();
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
  activePlayingSteps: any[] | undefined, currentStep: number, stepDurationMs: number,
  isDominantHand: boolean, isSubStep: boolean = false
): { nextKind: AlfaiaNextStrokeKind; msUntilNext: number } {
  if (!activePlayingSteps || activePlayingSteps.length === 0) return { nextKind: 'idle', msUntilNext: Math.round(stepDurationMs * 2) };
  const len = activePlayingSteps.length;
  if (!isSubStep && Array.isArray(activePlayingSteps[currentStep]) && activePlayingSteps[currentStep].length > 1) {
    const subTok = String(activePlayingSteps[currentStep][1] || '').trim();
    if (isStrokeForHand(subTok, isDominantHand)) {
      const isSubStrong = subTok === subTok.toUpperCase() && subTok.toUpperCase() !== 'A';
      return { nextKind: isSubStrong ? 'strong' : 'weak', msUntilNext: Math.max(70, Math.round(stepDurationMs * 0.5)) };
    }
  }
  for (let offset = 1; offset <= Math.min(len, 4); offset++) {
    const raw = activePlayingSteps[(currentStep + offset) % len];
    const list = extractTokens(raw);
    for (let i = 0; i < list.length; i++) {
      const token = list[i];
      if (isStrokeForHand(token, isDominantHand)) {
        const isStrong = ['D', 'E', 'I', 'C', 'X', 'B', 'S', 'V', 'F', 'R'].includes(token);
        const stepMult = offset + (i > 0 && Array.isArray(raw) ? 0.5 : 0);
        return { nextKind: isStrong ? 'strong' : 'weak', msUntilNext: Math.max(95, Math.round(stepMult * stepDurationMs)) };
      }
    }
  }
  return { nextKind: 'idle', msUntilNext: Math.max(180, Math.round(stepDurationMs * 2)) };
}

function animateStickWithShadow(
  stickEl: SVGSVGElement | null, animRef: React.MutableRefObject<Animation | null>,
  stroke: string, isLeftSide: boolean, family: AlfaiaSecondaryStickFamily,
  nextKind: AlfaiaNextStrokeKind, durationMs: number, isBarulho: boolean, autoLiftBeforeOtherHand = false
) {
  if (!stickEl) return;
  const sUp = stroke.toUpperCase(), rate = CONFIG_ALFAIA_STICKS.speedMultiplier;
  const effectiveDuration = isBarulho ? Math.round(90 / rate) : Math.max(85, Math.round(durationMs / rate));
  const iterations = isBarulho ? Math.max(2, Math.min(8, Math.round(CONFIG_ALFAIA_STICKS.barulhoBounces))) : 1;
  const wasPressed = getHandMemory(isLeftSide).posture === 'pressed_skin';

  animRef.current?.cancel();
  animRef.current = stickEl.animate(generateAlfaiaPredictiveKeyframes(stroke, isLeftSide, family, nextKind, effectiveDuration, autoLiftBeforeOtherHand), {
    duration: effectiveDuration, iterations, fill: 'forwards',
  });
  const tipEl = stickEl.querySelector('[data-bacalhau-tip]') as SVGGElement | null;
  if (tipEl && family === 'bacalhau' && !isBarulho && !['C', 'X'].includes(sUp)) {
    tipEl.getAnimations().forEach((a) => a.cancel());
    const tipFrames = sUp === 'A' ? generateBacalhauAbafadoTipKeyframes(isLeftSide, autoLiftBeforeOtherHand) : generateBacalhauTipKeyframes(isLeftSide, effectiveDuration);
    tipEl.animate(tipFrames, { duration: effectiveDuration, iterations: 1, fill: 'forwards' });
  }
  const shadowEl = stickEl.querySelector('[data-stick-shadow]') as SVGGElement | null;
  if (shadowEl) {
    shadowEl.getAnimations().forEach((a) => a.cancel());
    shadowEl.animate(generateAlfaiaShadowKeyframes(stroke, isLeftSide, nextKind, wasPressed, autoLiftBeforeOtherHand), { duration: effectiveDuration, iterations, fill: 'forwards' });
  }
}

export function dispatchAlfaiaPredictiveStroke(
  activeTrack: any, stroke: string, isVibrate: boolean, isSubStep: boolean, isLeftHanded: boolean,
  activePlayingSteps: any[] | undefined, currentStep: number, stepDurationMs: number,
  leftStickEl: SVGSVGElement | null, rightStickEl: SVGSVGElement | null, haloEl: HTMLDivElement | null,
  leftAnimRef: React.MutableRefObject<Animation | null>, rightAnimRef: React.MutableRefObject<Animation | null>,
  geometry: { targetX: number; targetY: number }
) {
  const secFamily = resolveAlfaiaSecondaryFamily(activeTrack), norm = (stroke || '').trim(), sUp = norm.toUpperCase();
  const isBarulho = isVibrate || sUp === 'B' || sUp === 'T' || sUp === 'R', isDual = isBarulho || ['C', 'X', 'F'].includes(sUp);
  const domLook = findSameHandLookahead(activePlayingSteps, currentStep, stepDurationMs, true, isSubStep);
  const secLook = findSameHandLookahead(activePlayingSteps, currentStep, stepDurationMs, false, isSubStep);
  const domStickEl = isLeftHanded ? leftStickEl : rightStickEl, domAnimRef = isLeftHanded ? leftAnimRef : rightAnimRef;
  const secStickEl = isLeftHanded ? rightStickEl : leftStickEl, secAnimRef = isLeftHanded ? rightAnimRef : leftAnimRef, secSide = !isLeftHanded;

  if ((sUp === 'D' || sUp === 'S') && (isMufflingStickRef.current || getHandMemory(secSide).posture === 'pressed_skin')) {
    releaseMufflingStickImmediately(secStickEl, secAnimRef, secSide, secFamily, 65);
  }
  if (isDual || sUp === 'D' || sUp === 'S') {
    animateStickWithShadow(domStickEl, domAnimRef, isBarulho ? 'B' : norm, isLeftHanded, 'macaneta', domLook.nextKind, domLook.msUntilNext, isBarulho);
  }
  if (sUp === 'A') {
    const crossLook = findAlfaiaCrossHandLookahead(activePlayingSteps, currentStep, stepDurationMs, isLeftHanded, isSubStep);
    const autoLift = crossLook.nextIsOtherHand && crossLook.msUntilNextAnyHand !== null;
    const abafadoDur = autoLift && crossLook.msUntilNextAnyHand ? Math.max(90, crossLook.msUntilNextAnyHand - 22) : secLook.msUntilNext;
    isMufflingStickRef.current = !autoLift;
    animateStickWithShadow(secStickEl, secAnimRef, norm, secSide, secFamily, secLook.nextKind, abafadoDur, false, autoLift);
  } else if (isDual || sUp === 'E' || sUp === 'I' || sUp === 'V') {
    isMufflingStickRef.current = false;
    animateStickWithShadow(secStickEl, secAnimRef, isBarulho ? 'B' : norm, secSide, secFamily, secLook.nextKind, secLook.msUntilNext, isBarulho);
  }
  if (haloEl && (['D', 'E', 'I', 'B', 'S', 'V'].includes(sUp) || isBarulho)) {
    haloEl.style.left = `${geometry.targetX}px`; haloEl.style.top = `${geometry.targetY}px`;
    haloEl.getAnimations().forEach((a) => a.cancel());
    haloEl.animate(isBarulho ? KEYFRAMES_SKIN_BARULHO : KEYFRAMES_SKIN_WAVE, { duration: isBarulho ? 90 : 150, iterations: isBarulho ? 3 : 1, easing: 'ease-out' });
  }
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
