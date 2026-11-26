/**
 * Gel, reprise et préparation pas-à-pas WAAPI double-slot (`active` + `queued`) pour Ao Vivo (< 115 lignes).
 */
import React from 'react';
import { getHandMemory } from '../../audio/animations/handTransitionEngine';
import { resetBarulhoRollState } from '../../audio/animations/barulhoRollPlanner';
import {
  cancelTrackedElementAnimation,
  pauseTrackedElementAnimations,
  resumeTrackedElementAnimations,
} from '../../audio/animations/waapiAnimTracker';
import {
  computeMeasurePatternStepOffset,
  getRodaMeasureGeometry,
  resolveActiveBeatResolutions,
} from '../../utils/rodaTimeSigGeometry';
import { getPhysicalStepFromRatio } from '../circle-sequencer/measurePatternHelpers';
import { resolveAlfaiaSecondaryFamily } from './AlfaiaSticksOverlay';
import { isMufflingStickRef, releaseMufflingStickImmediately } from './alfaiaMuffleReleaseHelper';
import { cancelAoVivoShockwave, pauseAoVivoShockwave, resumeAoVivoShockwave } from './AoVivoShockwave';

function forEachAoVivoAnimatedNode(roots: (Element | null | undefined)[], fn: (node: Element) => void): void {
  for (let i = 0; i < roots.length; i++) {
    const root = roots[i];
    if (!root) continue;
    fn(root);
    if (typeof root.querySelectorAll === 'function') {
      const subs = root.querySelectorAll('[data-stick-shadow], [data-hand-shadow], [data-bacalhau-tip], [data-finger-mult]');
      for (let k = 0; k < subs.length; k++) fn(subs[k]);
    }
  }
}

export function pauseAoVivoAnimations(
  animRefs: React.MutableRefObject<Animation | null>[],
  haloEl: HTMLDivElement | null,
  rootElements?: (Element | null | undefined)[]
): void {
  if (rootElements) forEachAoVivoAnimatedNode(rootElements, pauseTrackedElementAnimations);
  for (let i = 0; i < animRefs.length; i++) {
    const anim = animRefs[i].current;
    if (anim && anim.playState === 'running') {
      try { anim.pause(); } catch (_) {}
    }
  }
  pauseAoVivoShockwave(haloEl);
}

export function resumeAoVivoAnimations(
  animRefs: React.MutableRefObject<Animation | null>[],
  haloEl: HTMLDivElement | null,
  rootElements?: (Element | null | undefined)[]
): void {
  if (rootElements) forEachAoVivoAnimatedNode(rootElements, resumeTrackedElementAnimations);
  for (let i = 0; i < animRefs.length; i++) {
    const anim = animRefs[i].current;
    if (anim && anim.playState === 'paused') {
      try { anim.play(); } catch (_) {}
    }
  }
  resumeAoVivoShockwave(haloEl);
}

export function cancelAllAoVivoElementSlots(rootElements: (Element | null | undefined)[]): void {
  forEachAoVivoAnimatedNode(rootElements, cancelTrackedElementAnimation);
}

export function resolveAoVivoMeasureStepInfo(
  currentSig: string,
  pattern: any,
  measure: number,
  ratio: number
): { stepsPerMeasure: number; targetStep: number } {
  const geom = getRodaMeasureGeometry(currentSig);
  const beatRes = resolveActiveBeatResolutions(currentSig, pattern);
  const stepsPerMeasure = Math.max(1, beatRes.reduce((acc, v) => acc + Math.max(1, v), 0) || geom.defaultSteps);
  const stepOffset = computeMeasurePatternStepOffset(pattern, stepsPerMeasure, measure);
  const stepInMeasure = Math.max(0, getPhysicalStepFromRatio(ratio, pattern, stepsPerMeasure, geom.beatsCount, beatRes));
  const patSteps = Math.max(stepsPerMeasure, pattern?.steps || stepsPerMeasure);
  return { stepsPerMeasure, targetStep: Math.min(patSteps - 1, stepOffset + stepInMeasure) };
}

function hasAbafadoToken(rawVal: any): boolean {
  if (!rawVal) return false;
  if (Array.isArray(rawVal)) return rawVal.some((s) => String(s || '').trim().toUpperCase() === 'A');
  if (typeof rawVal === 'object' && Array.isArray(rawVal.sim)) {
    return rawVal.sim.some((s: any) => String(s || '').trim().toUpperCase() === 'A');
  }
  return String(rawVal).trim().toUpperCase() === 'A';
}

export function prepareAoVivoForStepPreview(
  animRefs: React.MutableRefObject<Animation | null>[],
  haloEl: HTMLDivElement | null,
  family: string | null | undefined,
  isLeftHanded: boolean,
  activeTrack: any,
  rawVal: any,
  leftStickEl: SVGSVGElement | null,
  rightStickEl: SVGSVGElement | null,
  leftAnimRef: React.MutableRefObject<Animation | null>,
  rightAnimRef: React.MutableRefObject<Animation | null>
): void {
  resetBarulhoRollState();
  for (let i = 0; i < animRefs.length; i++) {
    const anim = animRefs[i].current;
    if (anim && anim.playState === 'paused') {
      try { anim.finish(); } catch (_) { try { anim.cancel(); } catch (__) {} }
    }
  }
  cancelAoVivoShockwave(haloEl);
  if (family === 'alfaia' && !hasAbafadoToken(rawVal)) {
    const secSide = !isLeftHanded;
    if (isMufflingStickRef.current || getHandMemory(secSide).posture === 'pressed_skin') {
      const secStickEl = isLeftHanded ? rightStickEl : leftStickEl;
      const secAnimRef = isLeftHanded ? rightAnimRef : leftAnimRef;
      releaseMufflingStickImmediately(secStickEl, secAnimRef, secSide, resolveAlfaiaSecondaryFamily(activeTrack), 65);
    }
  }
}
