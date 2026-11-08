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

function isCaixaStrokeForHand(token: string, isDominantHand: boolean): boolean {
  const s = (token || '').trim();
  if (!s || s === '-' || s === '.' || s === '0') return false;
  const up = s.toUpperCase();
  if (['C', 'X', 'B', 'F', '~'].includes(up)) return true;
  if (s === 'R') return isDominantHand;
  if (s === 'r') return !isDominantHand;
  return isDominantHand ? up === 'D' || up === 'S' : up === 'E' || up === 'V';
}

function classifyCaixaNextKind(token: string): CaixaNextStrokeKind {
  if (token === 'R' || token === 'r' || token === 'B' || token === 'b' || token === '~') return 'rufada';
  if (['D', 'E', 'F', 'f', 'C', 'X', 'S', 'V'].includes(token)) return 'strong';
  return 'weak';
}

function extractTokens(raw: any): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map((x) => String(x || '').trim());
  if (typeof raw === 'object' && Array.isArray(raw.sim)) return raw.sim.map((x: any) => String(x || '').trim());
  return [String(raw).trim()];
}

export function findCaixaSameHandLookahead(
  activePlayingSteps: any[] | undefined,
  currentStep: number,
  stepDurationMs: number,
  isDominantHand: boolean,
  isSubStep: boolean = false
): { nextKind: CaixaNextStrokeKind; msUntilNext: number } {
  if (!activePlayingSteps || activePlayingSteps.length === 0) {
    return { nextKind: 'idle', msUntilNext: Math.round(stepDurationMs * 2) };
  }
  const len = activePlayingSteps.length;
  if (!isSubStep && Array.isArray(activePlayingSteps[currentStep]) && activePlayingSteps[currentStep].length > 1) {
    const subTok = String(activePlayingSteps[currentStep][1] || '').trim();
    if (isCaixaStrokeForHand(subTok, isDominantHand)) {
      return { nextKind: classifyCaixaNextKind(subTok), msUntilNext: Math.max(65, Math.round(stepDurationMs * 0.5)) };
    }
  }
  for (let offset = 1; offset <= Math.min(len, 4); offset++) {
    const raw = activePlayingSteps[(currentStep + offset) % len];
    const list = extractTokens(raw);
    for (let i = 0; i < list.length; i++) {
      const token = list[i];
      if (isCaixaStrokeForHand(token, isDominantHand)) {
        const stepMult = offset + (i > 0 && Array.isArray(raw) ? 0.5 : 0);
        return { nextKind: classifyCaixaNextKind(token), msUntilNext: Math.max(85, Math.round(stepMult * stepDurationMs)) };
      }
    }
  }
  return { nextKind: 'idle', msUntilNext: Math.max(170, Math.round(stepDurationMs * 2)) };
}

function animateCaixaStick(
  stickEl: SVGSVGElement | null, animRef: React.MutableRefObject<Animation | null>,
  stroke: string, isLeftSide: boolean, family: CaixaStickFamily,
  nextKind: CaixaNextStrokeKind, durationMs: number, flaRole: 'none' | 'main' | 'grace' = 'none'
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
    shadowEl.animate(generateCaixaShadowKeyframes(stroke, isLeftSide, nextKind), { duration: effectiveDuration, iterations: 1, fill: 'forwards' });
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
  } else {
    if (isBarulho || ['C', 'X', 'D', 'S'].includes(sUp)) animateCaixaStick(domEl, domRef, isBarulho ? 'B' : norm, isLeftHanded, family, domLook.nextKind, domLook.msUntilNext);
    if (isBarulho || ['C', 'X', 'E', 'V'].includes(sUp)) animateCaixaStick(secEl, secRef, isBarulho ? 'B' : norm, !isLeftHanded, family, secLook.nextKind, secLook.msUntilNext);
  }

  if (haloEl && (['D', 'E', 'F', 'R', 'B', 'X'].includes(sUp) || isBarulho)) {
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
