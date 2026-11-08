import React from 'react';
import {
  CONFIG_ALFAIA_STICKS,
  AlfaiaNextStrokeKind,
  AlfaiaSecondaryStickFamily,
  generateAlfaiaPredictiveKeyframes,
  generateAlfaiaShadowKeyframes,
  generateBacalhauTipKeyframes,
  getAlfaiaShadowRestTransform,
  getAlfaiaStickRestTransform,
  KEYFRAMES_SKIN_BARULHO,
  KEYFRAMES_SKIN_WAVE,
} from '../../audio/animations/alfaiaKinematics';
import { resolveAlfaiaSecondaryFamily } from './AlfaiaSticksOverlay';

function isStrokeForHand(token: string, isDominantHand: boolean): boolean {
  const s = (token || '').trim();
  if (!s || s === '-' || s === '.' || s === '0') return false;
  const up = s.toUpperCase();
  if (['C', 'X', 'B', 'T', 'R', 'F', '~'].includes(up)) return true;
  return isDominantHand ? up === 'D' || up === 'S' : up === 'E' || up === 'I' || up === 'V';
}

function extractTokens(raw: any): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map((x) => String(x || '').trim());
  if (typeof raw === 'object' && Array.isArray(raw.sim)) return raw.sim.map((x: any) => String(x || '').trim());
  return [String(raw).trim()];
}

export function findSameHandLookahead(
  activePlayingSteps: any[] | undefined,
  currentStep: number,
  stepDurationMs: number,
  isDominantHand: boolean,
  isSubStep: boolean = false
): { nextKind: AlfaiaNextStrokeKind; msUntilNext: number } {
  if (!activePlayingSteps || activePlayingSteps.length === 0) {
    return { nextKind: 'idle', msUntilNext: Math.round(stepDurationMs * 2) };
  }
  const len = activePlayingSteps.length;
  if (!isSubStep && Array.isArray(activePlayingSteps[currentStep]) && activePlayingSteps[currentStep].length > 1) {
    const subTok = String(activePlayingSteps[currentStep][1] || '').trim();
    if (isStrokeForHand(subTok, isDominantHand)) {
      return { nextKind: subTok === subTok.toUpperCase() ? 'strong' : 'weak', msUntilNext: Math.max(70, Math.round(stepDurationMs * 0.5)) };
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
  stickEl: SVGSVGElement | null,
  animRef: React.MutableRefObject<Animation | null>,
  stroke: string,
  isLeftSide: boolean,
  family: AlfaiaSecondaryStickFamily,
  nextKind: AlfaiaNextStrokeKind,
  durationMs: number,
  isBarulho: boolean
) {
  if (!stickEl) return;
  const rate = CONFIG_ALFAIA_STICKS.speedMultiplier;
  const effectiveDuration = isBarulho ? Math.round(90 / rate) : Math.max(85, Math.round(durationMs / rate));
  const iterations = isBarulho ? Math.max(2, Math.min(8, Math.round(CONFIG_ALFAIA_STICKS.barulhoBounces))) : 1;
  animRef.current?.cancel();
  animRef.current = stickEl.animate(generateAlfaiaPredictiveKeyframes(stroke, isLeftSide, family, nextKind, effectiveDuration), {
    duration: effectiveDuration, iterations, fill: 'forwards',
  });
  const tipEl = stickEl.querySelector('[data-bacalhau-tip]') as SVGGElement | null;
  if (tipEl && family === 'bacalhau' && !isBarulho && !['C', 'X'].includes(stroke.toUpperCase())) {
    tipEl.getAnimations().forEach((a) => a.cancel());
    tipEl.animate(generateBacalhauTipKeyframes(isLeftSide, effectiveDuration), { duration: effectiveDuration, iterations: 1, fill: 'forwards' });
  }
  const shadowEl = stickEl.querySelector('[data-stick-shadow]') as SVGGElement | null;
  if (shadowEl) {
    shadowEl.getAnimations().forEach((a) => a.cancel());
    shadowEl.animate(generateAlfaiaShadowKeyframes(stroke, isLeftSide, nextKind), { duration: effectiveDuration, iterations, fill: 'forwards' });
  }
}

export function dispatchAlfaiaPredictiveStroke(
  activeTrack: any, stroke: string, isVibrate: boolean, isSubStep: boolean, isLeftHanded: boolean,
  activePlayingSteps: any[] | undefined, currentStep: number, stepDurationMs: number,
  leftStickEl: SVGSVGElement | null, rightStickEl: SVGSVGElement | null, haloEl: HTMLDivElement | null,
  leftAnimRef: React.MutableRefObject<Animation | null>, rightAnimRef: React.MutableRefObject<Animation | null>,
  geometry: { targetX: number; targetY: number }
) {
  const secFamily = resolveAlfaiaSecondaryFamily(activeTrack);
  const norm = (stroke || '').trim();
  const sUp = norm.toUpperCase();
  const isBarulho = isVibrate || sUp === 'B' || sUp === 'T' || sUp === 'R';
  const isDual = isBarulho || ['C', 'X', 'F'].includes(sUp);
  const domLook = findSameHandLookahead(activePlayingSteps, currentStep, stepDurationMs, true, isSubStep);
  const secLook = findSameHandLookahead(activePlayingSteps, currentStep, stepDurationMs, false, isSubStep);

  if (isDual || sUp === 'D' || sUp === 'S') {
    const domEl = isLeftHanded ? leftStickEl : rightStickEl;
    const domRef = isLeftHanded ? leftAnimRef : rightAnimRef;
    animateStickWithShadow(domEl, domRef, isBarulho ? 'B' : norm, isLeftHanded, 'macaneta', domLook.nextKind, domLook.msUntilNext, isBarulho);
  }
  if (isDual || sUp === 'E' || sUp === 'I' || sUp === 'V') {
    const secEl = isLeftHanded ? rightStickEl : leftStickEl;
    const secRef = isLeftHanded ? rightAnimRef : leftAnimRef;
    animateStickWithShadow(secEl, secRef, isBarulho ? 'B' : norm, !isLeftHanded, secFamily, secLook.nextKind, secLook.msUntilNext, isBarulho);
  }

  if (haloEl && (['D', 'E', 'I', 'B', 'S', 'V'].includes(sUp) || isBarulho)) {
    haloEl.style.left = `${geometry.targetX}px`;
    haloEl.style.top = `${geometry.targetY}px`;
    haloEl.getAnimations().forEach((a) => a.cancel());
    haloEl.animate(isBarulho ? KEYFRAMES_SKIN_BARULHO : KEYFRAMES_SKIN_WAVE, { duration: isBarulho ? 90 : 150, iterations: isBarulho ? 3 : 1, easing: 'ease-out' });
  }
}

export function resetAlfaiaSticksAndShadows(activeTrack: any, isLeftHanded: boolean, leftStickEl: SVGSVGElement | null, rightStickEl: SVGSVGElement | null) {
  const secFamily = resolveAlfaiaSecondaryFamily(activeTrack);
  const applyRest = (el: SVGSVGElement | null, isLeftSide: boolean, fam: AlfaiaSecondaryStickFamily) => {
    if (!el) return;
    el.getAnimations().forEach((a) => a.cancel());
    el.style.transition = 'none';
    el.style.transform = getAlfaiaStickRestTransform(isLeftSide, fam);
    const tip = el.querySelector('[data-bacalhau-tip]') as SVGGElement | null;
    if (tip) { tip.getAnimations().forEach((a) => a.cancel()); tip.style.transform = 'rotateZ(0deg) skewX(0deg) scaleX(1)'; }
    const sh = el.querySelector('[data-stick-shadow]') as SVGGElement | null;
    if (sh) { sh.getAnimations().forEach((a) => a.cancel()); sh.style.transform = getAlfaiaShadowRestTransform(isLeftSide); }
  };
  applyRest(leftStickEl, true, isLeftHanded ? 'macaneta' : secFamily);
  applyRest(rightStickEl, false, isLeftHanded ? secFamily : 'macaneta');
}
