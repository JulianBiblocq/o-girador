import React from 'react';
import {
  CONFIG_TIMBAL_HANDS, generateTimbalBarulhoLoopFrames, generateTimbalPredictiveKeyframes,
  getTimbalHandRestTransform, getTimbalShadowRestTransform, resolveTimbalBarulhoBounds, TimbalNextStrokeKind,
} from '../../audio/animations/timbalKinematics';
import { BarulhoStepPlan, consumeBarulhoStepPlan, releaseWaapiBarulhoRoll, runWaapiBarulhoRoll } from '../../audio/animations/barulhoWaapiRunner';
import { triggerAoVivoShockwave } from './AoVivoShockwave';
import { applyTimbalSlapBiomechanics } from './TimbalHandSvgs';

function isTimbalStrokeForHand(token: string, isDominantHand: boolean): boolean {
  const s = (token || '').trim();
  if (!s || s === '-' || s === '.' || s === '/' || s === '0') return false;
  if (['C', 'c', 'X', 'x', 'B', 'b', 'F', 'f', 'V', 'v', '~'].includes(s)) return true;
  return isDominantHand ? ['G', 'A', 'S', 'D', 'P'].includes(s) : ['g', 'a', 's', 'd', 'p'].includes(s);
}

function classifyTimbalNextKind(token: string): TimbalNextStrokeKind {
  const up = token.toUpperCase();
  if (up === 'S' || up === 'V') return 'slap';
  if (up === 'G' || up === 'P') return 'grave';
  if (up === 'A' || up === 'F' || up === 'B') return 'aberto';
  return up === 'D' ? 'ghost' : 'idle';
}

const isWeakTimbalToken = (token: string): boolean => ['g', 'a', 's', 'd', 'p', 'D'].includes(token);

function extractTokens(raw: any): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map((x) => String(x || '').trim());
  if (typeof raw === 'object' && Array.isArray(raw.sim)) return raw.sim.map((x: any) => String(x || '').trim());
  return [String(raw).trim()];
}

export interface TimbalLookaheadResult { nextKind: TimbalNextStrokeKind; nextSymbol: string; isNextWeak: boolean; msUntilNext: number; }

export function findTimbalSameHandLookahead(
  activePlayingSteps: any[] | undefined, currentStep: number, stepDurationMs: number, isDominantHand: boolean, isSubStep = false
): TimbalLookaheadResult {
  const idleRes: TimbalLookaheadResult = { nextKind: 'idle', nextSymbol: 'idle', isNextWeak: false, msUntilNext: Math.max(170, Math.round(stepDurationMs * 2)) };
  if (!activePlayingSteps || activePlayingSteps.length === 0) return idleRes;
  const len = activePlayingSteps.length;
  if (!isSubStep && Array.isArray(activePlayingSteps[currentStep]) && activePlayingSteps[currentStep].length > 1) {
    const subTok = String(activePlayingSteps[currentStep][1] || '').trim();
    if (isTimbalStrokeForHand(subTok, isDominantHand)) return { nextKind: classifyTimbalNextKind(subTok), nextSymbol: subTok, isNextWeak: isWeakTimbalToken(subTok), msUntilNext: Math.max(65, Math.round(stepDurationMs * 0.5)) };
  }
  for (let offset = 1; offset <= Math.min(len, 4); offset++) {
    const raw = activePlayingSteps[(currentStep + offset) % len], list = extractTokens(raw);
    for (let i = 0; i < list.length; i++) {
      const tok = list[i];
      if (isTimbalStrokeForHand(tok, isDominantHand)) return { nextKind: classifyTimbalNextKind(tok), nextSymbol: tok, isNextWeak: isWeakTimbalToken(tok), msUntilNext: Math.max(85, Math.round((offset + (i > 0 && Array.isArray(raw) ? 0.5 : 0)) * stepDurationMs)) };
    }
  }
  return idleRes;
}

function animateTimbalHand(
  handEl: SVGSVGElement | null, animRef: React.MutableRefObject<Animation | null>,
  stroke: string, isLeftSide: boolean, look: TimbalLookaheadResult, flaRole: 'none' | 'main' | 'grace' = 'none'
) {
  if (!handEl) return;
  const { speedMultiplier, strokes, attackSpeed, shadowDepthPx, shadowOpacity } = CONFIG_TIMBAL_HANDS;
  const dur = Math.max(80, Math.round(look.msUntilNext / speedMultiplier)), sUp = stroke.toUpperCase();
  animRef.current?.cancel(); handEl.getAnimations?.().forEach((a) => a.cancel());
  animRef.current = handEl.animate(generateTimbalPredictiveKeyframes(stroke, isLeftSide, look.nextKind, dur, flaRole, look.nextSymbol, look.isNextWeak), { duration: dur, iterations: 1, fill: 'forwards' });
  applyTimbalSlapBiomechanics(handEl, sUp === 'S' || sUp === 'C' || sUp === 'X');
  if (sUp === 'S') {
    handEl.querySelectorAll<SVGGElement>('[data-finger-mult]').forEach((fEl) => {
      const m = Number(fEl.getAttribute('data-finger-mult') || 0), tr = `translateY(${+(-m * strokes.slapThumbLift * 11).toFixed(1)}px) rotate(${+(m * strokes.slapFingerSplayDeg).toFixed(2)}deg)`;
      fEl.getAnimations().forEach((a) => a.cancel());
      fEl.animate([{ transform: tr }, { transform: tr, offset: 0.4 }, { transform: 'translateY(0px) rotate(0deg)' }], { duration: dur, fill: 'forwards' });
    });
  }
  const shEl = handEl.querySelector('[data-hand-shadow]') as SVGGElement | null;
  if (shEl) {
    shEl.getAnimations().forEach((a) => a.cancel());
    const sign = isLeftSide ? -1 : 1, isClap = sUp === 'C' || sUp === 'X';
    const mid = isClap
      ? { transform: `translate3d(${sign * 26}px, ${Math.round(shadowDepthPx * 1.9)}px, 0) scale(1.22)`, opacity: +(shadowOpacity * 0.22).toFixed(2), offset: 0.26 }
      : { transform: `translate3d(${sign * 2}px, 3px, 0) scale(0.98)`, opacity: +shadowOpacity.toFixed(2), offset: Math.min(0.5, Math.max(0.08, attackSpeed)) };
    shEl.animate([{ transform: `translate3d(${sign * 18}px, ${Math.round(shadowDepthPx * 1.45)}px, 0) scale(1.13)`, opacity: +(shadowOpacity * 0.32).toFixed(2) }, mid, { transform: getTimbalShadowRestTransform(isLeftSide, true), opacity: +(shadowOpacity * 0.45).toFixed(2) }], { duration: dur, iterations: 1, fill: 'forwards' });
  }
}

function animateTimbalHandBarulho(
  handEl: SVGSVGElement | null, animRef: React.MutableRefObject<Animation | null>,
  isLeftSide: boolean, look: TimbalLookaheadResult, stepDurationMs: number, leadMs: number, plan: BarulhoStepPlan
) {
  if (!handEl) return;
  applyTimbalSlapBiomechanics(handEl, false);
  const cycleMs = Math.max(55, Math.round(90 / CONFIG_TIMBAL_HANDS.speedMultiplier));
  const loopFrames = generateTimbalBarulhoLoopFrames(isLeftSide, plan.amplitude || 0.7);
  const { startTr, endTr } = resolveTimbalBarulhoBounds(isLeftSide, look.nextSymbol, look.isNextWeak);
  if (plan.action === 'stop') releaseWaapiBarulhoRoll({ el: handEl, animRef, contactTransform: String(loopFrames[0].transform), endTransform: endTr, loopFrames, cycleMs, leadMs });
  else runWaapiBarulhoRoll({ el: handEl, animRef, startTransform: startTr, loopFrames, endTransform: endTr, cycleMs, stepDurationMs, leadMs, plan });
}

export function dispatchTimbalPredictiveStroke(
  stroke: string, isVibrate: boolean, isSubStep: boolean, isLeftHanded: boolean,
  activePlayingSteps: any[] | undefined, currentStep: number, stepDurationMs: number,
  leftStickEl: SVGSVGElement | null, rightStickEl: SVGSVGElement | null, haloEl: HTMLDivElement | null,
  leftAnimRef: React.MutableRefObject<Animation | null>, rightAnimRef: React.MutableRefObject<Animation | null>,
  geometry: { targetX: number; targetY: number }, leadMs = 0
) {
  const norm = (stroke || '').trim(), sUp = norm.toUpperCase();
  const domLook = findTimbalSameHandLookahead(activePlayingSteps, currentStep, stepDurationMs, true, isSubStep);
  const secLook = findTimbalSameHandLookahead(activePlayingSteps, currentStep, stepDurationMs, false, isSubStep);
  const domEl = isLeftHanded ? leftStickEl : rightStickEl, domRef = isLeftHanded ? leftAnimRef : rightAnimRef;
  const secEl = isLeftHanded ? rightStickEl : leftStickEl, secRef = isLeftHanded ? rightAnimRef : leftAnimRef;

  const plan = consumeBarulhoStepPlan('timbal', isVibrate ? '~' : norm, activePlayingSteps, currentStep, isSubStep);
  if (plan.action !== 'none') {
    animateTimbalHandBarulho(domEl, domRef, isLeftHanded, domLook, stepDurationMs, leadMs, plan);
    animateTimbalHandBarulho(secEl, secRef, !isLeftHanded, secLook, stepDurationMs, leadMs, plan);
    if (haloEl && (plan.action === 'start' || norm === 'B')) triggerAoVivoShockwave(haloEl, { x: geometry.targetX, y: geometry.targetY, isRoll: true, delayMs: leadMs });
    return;
  }
  if (!norm || norm === '0' || norm === '-' || norm === '.' || norm === '/') return;

  if (norm === 'F' || norm === 'V') { const k = norm === 'F' ? 'A' : 'S'; animateTimbalHand(secEl, secRef, k.toLowerCase(), !isLeftHanded, secLook, 'grace'); animateTimbalHand(domEl, domRef, k, isLeftHanded, domLook, 'main'); }
  else if (norm === 'f' || norm === 'v') { const k = norm === 'f' ? 'A' : 'S'; animateTimbalHand(domEl, domRef, k, isLeftHanded, domLook, 'grace'); animateTimbalHand(secEl, secRef, k.toLowerCase(), !isLeftHanded, secLook, 'main'); }
  else if (sUp === 'C' || sUp === 'X') { animateTimbalHand(domEl, domRef, 'C', isLeftHanded, domLook); animateTimbalHand(secEl, secRef, 'C', !isLeftHanded, secLook); }
  else if (['G', 'A', 'S', 'D', 'P'].includes(norm)) animateTimbalHand(domEl, domRef, norm, isLeftHanded, domLook);
  else if (['g', 'a', 's', 'd', 'p'].includes(norm)) animateTimbalHand(secEl, secRef, norm, !isLeftHanded, secLook);
  if (haloEl && ['G', 'A', 'S', 'P', 'F', 'V'].includes(norm)) triggerAoVivoShockwave(haloEl, { x: geometry.targetX, y: geometry.targetY });
}

export function resetTimbalHandsAndShadows(leftStickEl: SVGSVGElement | null, rightStickEl: SVGSVGElement | null) {
  [leftStickEl, rightStickEl].forEach((el, idx) => {
    if (!el) return;
    const isLeft = idx === 0;
    el.getAnimations().forEach((a) => a.cancel()); el.style.transition = 'none'; el.style.transform = getTimbalHandRestTransform(isLeft);
    applyTimbalSlapBiomechanics(el, CONFIG_TIMBAL_HANDS.posePreview === 'slap');
    const sh = el.querySelector('[data-hand-shadow]') as SVGGElement | null;
    if (sh) { sh.getAnimations().forEach((a) => a.cancel()); sh.style.transform = getTimbalShadowRestTransform(isLeft); }
  });
}
