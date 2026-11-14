/**
 * caixaLookaheadHelper.ts — Dispatch prédictif WAAPI des baguettes Caixa/Tarol (< 95 lignes).
 * - Anime `A` (Rimshot main dominante) et `a` (Rimshot main secondaire) avec onde de peau + rebond franc.
 */
import React from 'react';
import {
  CaixaNextStrokeKind,
  CaixaStickFamily,
  CONFIG_CAIXA_STICKS,
  generateCaixaPredictiveKeyframes,
  generateCaixaShadowKeyframes,
  getCaixaShadowRestTransform,
  getCaixaStickRestTransform,
  resolveCaixaActiveFamily,
} from '../../audio/animations/caixaKinematics';
import { KEYFRAMES_SKIN_BARULHO, KEYFRAMES_SKIN_WAVE } from '../../audio/animations/alfaiaKinematics';
import { findCaixaSameHandLookahead } from './caixaSameHandLookahead';

export { findCaixaSameHandLookahead };

function animateCaixaStick(
  stickEl: SVGSVGElement | null,
  animRef: React.MutableRefObject<Animation | null>,
  stroke: string,
  isLeftSide: boolean,
  family: CaixaStickFamily,
  nextKind: CaixaNextStrokeKind,
  durationMs: number,
  flaRole: 'none' | 'main' | 'grace' = 'none'
) {
  if (!stickEl) return;
  const effectiveDuration = Math.max(80, Math.round(durationMs / CONFIG_CAIXA_STICKS.speedMultiplier));
  animRef.current?.cancel();
  animRef.current = stickEl.animate(
    generateCaixaPredictiveKeyframes(stroke, isLeftSide, family, nextKind, effectiveDuration, flaRole),
    { duration: effectiveDuration, iterations: 1, fill: 'forwards' }
  );
  const shadowEl = stickEl.querySelector('[data-stick-shadow]') as SVGGElement | null;
  if (shadowEl) {
    shadowEl.getAnimations().forEach((a) => a.cancel());
    shadowEl.animate(generateCaixaShadowKeyframes(stroke, isLeftSide, nextKind), {
      duration: effectiveDuration,
      iterations: 1,
      fill: 'forwards',
    });
  }
}

export function dispatchCaixaPredictiveStroke(
  instId: string, stroke: string, isVibrate: boolean, isSubStep: boolean, isLeftHanded: boolean,
  activePlayingSteps: any[] | undefined, currentStep: number, stepDurationMs: number,
  leftStickEl: SVGSVGElement | null, rightStickEl: SVGSVGElement | null, haloEl: HTMLDivElement | null,
  leftAnimRef: React.MutableRefObject<Animation | null>, rightAnimRef: React.MutableRefObject<Animation | null>,
  geometry: { targetX: number; targetY: number }
) {
  const family = resolveCaixaActiveFamily(instId);
  const norm = (stroke || '').trim();
  const sUp = norm.toUpperCase();
  const isBarulho = isVibrate || sUp === 'B' || sUp === 'T';
  const domLook = findCaixaSameHandLookahead(activePlayingSteps, currentStep, stepDurationMs, true, isSubStep);
  const secLook = findCaixaSameHandLookahead(activePlayingSteps, currentStep, stepDurationMs, false, isSubStep);
  const domEl = isLeftHanded ? leftStickEl : rightStickEl;
  const domRef = isLeftHanded ? leftAnimRef : rightAnimRef;
  const secEl = isLeftHanded ? rightStickEl : leftStickEl;
  const secRef = isLeftHanded ? rightAnimRef : leftAnimRef;

  if (norm === 'F') {
    animateCaixaStick(secEl, secRef, 'e', !isLeftHanded, family, secLook.nextKind, secLook.msUntilNext, 'grace');
    animateCaixaStick(domEl, domRef, 'D', isLeftHanded, family, domLook.nextKind, domLook.msUntilNext, 'main');
  } else if (norm === 'f') {
    animateCaixaStick(domEl, domRef, 'd', isLeftHanded, family, domLook.nextKind, domLook.msUntilNext, 'grace');
    animateCaixaStick(secEl, secRef, 'E', !isLeftHanded, family, secLook.nextKind, secLook.msUntilNext, 'main');
  } else if (norm === 'R') {
    animateCaixaStick(domEl, domRef, 'R', isLeftHanded, family, domLook.nextKind, Math.max(stepDurationMs, domLook.msUntilNext));
  } else if (norm === 'r') {
    animateCaixaStick(secEl, secRef, 'r', !isLeftHanded, family, secLook.nextKind, Math.max(stepDurationMs, secLook.msUntilNext));
  } else if (norm === 'A') {
    animateCaixaStick(domEl, domRef, 'A', isLeftHanded, family, domLook.nextKind, domLook.msUntilNext);
  } else if (norm === 'a') {
    animateCaixaStick(secEl, secRef, 'a', !isLeftHanded, family, secLook.nextKind, secLook.msUntilNext);
  } else {
    if (isBarulho || ['C', 'X', 'D', 'S'].includes(sUp)) animateCaixaStick(domEl, domRef, isBarulho ? 'B' : norm, isLeftHanded, family, domLook.nextKind, domLook.msUntilNext);
    if (isBarulho || ['C', 'X', 'E', 'V'].includes(sUp)) animateCaixaStick(secEl, secRef, isBarulho ? 'B' : norm, !isLeftHanded, family, secLook.nextKind, secLook.msUntilNext);
  }

  if (haloEl && (['D', 'E', 'A', 'F', 'R', 'B', 'X'].includes(sUp) || isBarulho)) {
    haloEl.style.left = `${geometry.targetX}px`;
    haloEl.style.top = `${geometry.targetY}px`;
    haloEl.getAnimations().forEach((a) => a.cancel());
    const isRoll = sUp === 'R' || isBarulho;
    haloEl.animate(isRoll ? KEYFRAMES_SKIN_BARULHO : KEYFRAMES_SKIN_WAVE, { duration: isRoll ? 90 : 140, iterations: isRoll ? 3 : 1, easing: 'ease-out' });
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
    if (sh) { sh.getAnimations().forEach((a) => a.cancel()); sh.style.transform = getCaixaShadowRestTransform(isLeft); }
  });
}
