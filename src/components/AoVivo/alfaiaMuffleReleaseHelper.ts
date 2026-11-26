/**
 * alfaiaMuffleReleaseHelper.ts — Verrou impératif & Lookahead inter-mains Abafado (A/a) Alfaia (< 120L, zéro `getAnimations()`).
 */
import React from 'react';
import { getAlfaiaAbafadoPoseTransform } from '../../audio/animations/alfaiaAbafadoKinematics';
import { AlfaiaSecondaryStickFamily, CONFIG_ALFAIA_STICKS, getProfileScale } from '../../audio/animations/alfaiaStickConfig';
import { sumLookaheadDurationMs } from '../../audio/animations/aoVivoBallisticMath';
import { buildTuckedLowTransform, getHandMemory, setHandMemory } from '../../audio/animations/handTransitionEngine';
import { runClockSyncedWaapi } from './aoVivoWaapiClockSync';

export const isMufflingStickRef: { current: boolean } = { current: false };

export interface AlfaiaCrossHandLookahead {
  msUntilNextAnyHand: number | null;
  nextIsOtherHand: boolean;
}

const OTHER_HAND_OR_DUAL_UPPER = new Set(['D', 'S', 'C', 'X', 'B', 'T', 'R', 'F', '~']);

function extractStepTokens(raw: any): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map((x) => String(x || '').trim());
  if (typeof raw === 'object' && Array.isArray(raw.sim)) return raw.sim.map((x: any) => String(x || '').trim());
  return [String(raw).trim()];
}

function isActiveStrokeToken(tok: string): boolean {
  return Boolean(tok && tok !== '-' && tok !== '.' && tok !== '/' && tok !== '0');
}

export function findAlfaiaCrossHandLookahead(
  activePlayingSteps: any[] | undefined,
  currentStep: number,
  stepDurationMs: number,
  _isLeftHanded: boolean,
  isSubStep = false,
  stepDurationsMs?: readonly number[]
): AlfaiaCrossHandLookahead {
  if (!activePlayingSteps || activePlayingSteps.length === 0) {
    return { msUntilNextAnyHand: null, nextIsOtherHand: false };
  }
  const len = activePlayingSteps.length;
  if (!isSubStep && Array.isArray(activePlayingSteps[currentStep]) && activePlayingSteps[currentStep].length > 1) {
    const subTok = String(activePlayingSteps[currentStep][1] || '').trim();
    if (isActiveStrokeToken(subTok)) {
      return {
        msUntilNextAnyHand: sumLookaheadDurationMs(currentStep, currentStep, false, true, stepDurationMs, stepDurationsMs),
        nextIsOtherHand: OTHER_HAND_OR_DUAL_UPPER.has(subTok.toUpperCase()),
      };
    }
  }
  const maxScan = Math.min(len, 16);
  for (let offset = 1; offset <= maxScan; offset++) {
    const nextIdx = currentStep + offset;
    if (nextIdx >= len) break;
    const raw = activePlayingSteps[nextIdx];
    const tokens = extractStepTokens(raw);
    for (let i = 0; i < tokens.length; i++) {
      const tok = tokens[i];
      if (!isActiveStrokeToken(tok)) continue;
      const msUntilNextAnyHand = sumLookaheadDurationMs(currentStep, nextIdx, isSubStep, i > 0 && Array.isArray(raw), stepDurationMs, stepDurationsMs);
      const sameSliceHasOther = Array.isArray(raw)
        ? OTHER_HAND_OR_DUAL_UPPER.has(tok.toUpperCase())
        : tokens.some((t) => isActiveStrokeToken(t) && OTHER_HAND_OR_DUAL_UPPER.has(t.toUpperCase()));
      return { msUntilNextAnyHand, nextIsOtherHand: sameSliceHasOther };
    }
  }
  return { msUntilNextAnyHand: null, nextIsOtherHand: false };
}

export function releaseMufflingStickImmediately(
  secStickEl: SVGSVGElement | null,
  secAnimRef: React.MutableRefObject<Animation | null>,
  isLeftSide: boolean,
  fam: AlfaiaSecondaryStickFamily,
  releaseDurationMs = 65,
  deltaMs = 0
): void {
  isMufflingStickRef.current = false;
  if (!secStickEl) return;
  const c = CONFIG_ALFAIA_STICKS, profScale = getProfileScale(fam);
  const mem = getHandMemory(isLeftSide);
  const fromTr = mem.transform || getAlfaiaAbafadoPoseTransform(isLeftSide, fam);
  const lowTr = buildTuckedLowTransform(isLeftSide, profScale, c.transitions);
  const dur = Math.max(40, Math.min(90, Math.round(releaseDurationMs / c.speedMultiplier)));

  setHandMemory(isLeftSide, 'low_tucked', lowTr);
  runClockSyncedWaapi({
    el: secStickEl,
    keyframes: [{ transform: fromTr, offset: 0, easing: 'ease-out' }, { transform: lowTr, offset: 1 }],
    durationMs: dur, deltaMs, animRef: secAnimRef,
  });

  const tipEl = secStickEl.querySelector('[data-bacalhau-tip]') as SVGGElement | null;
  if (tipEl && fam === 'bacalhau') {
    runClockSyncedWaapi({ el: tipEl, keyframes: [{ transform: 'rotateZ(0deg) skewX(0deg) scaleX(1)', offset: 1 }], durationMs: dur, deltaMs });
  }
  const shadowEl = secStickEl.querySelector('[data-stick-shadow]') as SVGGElement | null;
  if (shadowEl) {
    const inSign = isLeftSide ? 1 : -1, lowAirY = -Math.round(c.shadowDepthPx * 0.5), lowOp = +(c.shadowOpacity * 0.72).toFixed(2);
    runClockSyncedWaapi({
      el: shadowEl,
      keyframes: [
        { transform: 'translate(0px, 0px) scale(1)', opacity: c.shadowOpacity, offset: 0, easing: 'ease-out' },
        { transform: `translate(${inSign * 4}px, ${lowAirY}px) scale(0.92)`, opacity: lowOp, offset: 1 },
      ],
      durationMs: dur, deltaMs,
    });
  }
}

export function resetAlfaiaMuffleState(): void {
  isMufflingStickRef.current = false;
}
