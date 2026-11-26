/**
 * aoVivoWaapiClockSync.ts — Asservissement horloge Web Audio sans `el.getAnimations()` (< 120 lignes).
 * - `deltaMs = (nowCtxSec - targetHitDrawSec) * 1000` :
 *   * `deltaMs < -1.5` (swing futur) : `delay = -deltaMs`, `fill = 'both'` (ou `'none'` pour halo).
 *   * `0 <= deltaMs <= tHoldEndMs + 12` : `anim.currentTime = Math.min(deltaMs, tImpactMs + 6)` (zéro saut d'impact).
 *   * `tHoldEndMs + 12 < deltaMs < durationMs * 0.85` : `anim.currentTime = deltaMs`.
 *   * `deltaMs >= durationMs * 0.85` : ignore la frame expirée et applique `endTransform`.
 */

import {
  cancelTrackedElementAnimation,
  getTrackedElementAnimation,
  trackElementAnimation,
} from '../../audio/animations/waapiAnimTracker';

export { cancelTrackedElementAnimation, getTrackedElementAnimation, trackElementAnimation };

export interface ClockSyncedWaapiOptions {
  el: Element | null | undefined;
  keyframes: Keyframe[];
  durationMs: number;
  deltaMs?: number;
  lagMs?: number;
  delayMs?: number;
  tImpactMs?: number;
  tHoldEndMs?: number;
  easing?: string;
  fill?: FillMode;
  iterations?: number;
  animRef?: { current: Animation | null };
  onExpire?: () => void;
}

export function extractLagAndLeadMs(deltaMs = 0, explicitLagMs = 0): { leadMs: number; lagMs: number } {
  const safeDelta = typeof deltaMs === 'number' && Number.isFinite(deltaMs) ? deltaMs : 0;
  const safeLag = typeof explicitLagMs === 'number' && Number.isFinite(explicitLagMs) ? Math.max(0, explicitLagMs) : 0;
  if (safeDelta < -1.5) return { leadMs: Math.round(-safeDelta), lagMs: 0 };
  return { leadMs: 0, lagMs: Math.max(safeLag, Math.max(0, safeDelta)) };
}

function applyFinalPoseOnExpire(el: Element, keyframes: Keyframe[], fill: FillMode): void {
  const style = (el as HTMLElement | SVGElement).style;
  if (!style || keyframes.length === 0) return;
  const last = keyframes[keyframes.length - 1];
  if (fill !== 'none' && typeof last.transform === 'string') style.transform = last.transform;
  if (last.opacity !== undefined) style.opacity = String(last.opacity);
}

export function runClockSyncedWaapi(opts: ClockSyncedWaapiOptions): Animation | null {
  const {
    el, keyframes, durationMs, deltaMs, lagMs = 0, delayMs = 0,
    tImpactMs, tHoldEndMs, easing, fill = 'forwards', iterations = 1, animRef, onExpire,
  } = opts;
  if (!el || keyframes.length === 0) return null;

  const refAnim = animRef?.current;
  if (animRef) animRef.current = null;
  const trackedAnim = getTrackedElementAnimation(el);
  cancelTrackedElementAnimation(el);
  if (refAnim && refAnim !== trackedAnim) {
    try { refAnim.cancel(); } catch (_) {}
  }

  const safeDur = Math.max(16, Math.round(durationMs));
  const safeIters = Number.isFinite(iterations) && iterations > 0 ? iterations : 1;
  const totalSpanMs = safeDur * safeIters;

  const effImpactMs = tImpactMs ?? Math.min(18, safeDur * 0.22);
  const effHoldEndMs = tHoldEndMs ?? Math.min(effImpactMs + 34, safeDur * 0.52);

  const rawDelta = typeof deltaMs === 'number' && Number.isFinite(deltaMs)
    ? deltaMs
    : delayMs > 0
      ? -delayMs
      : Math.max(0, lagMs);

  let effectiveDelay = 0;
  let effectiveFill: FillMode = fill;
  let seekTimeMs = 0;

  if (rawDelta < -1.5) {
    effectiveDelay = Math.round(-rawDelta);
    if (fill !== 'none') effectiveFill = 'both';
  } else {
    const posDelta = Math.max(0, rawDelta);
    if (Number.isFinite(totalSpanMs) && posDelta >= totalSpanMs * 0.85) {
      applyFinalPoseOnExpire(el, keyframes, fill);
      onExpire?.();
      return null;
    }
    seekTimeMs = posDelta <= effHoldEndMs + 12
      ? Math.min(posDelta, effImpactMs + 6)
      : posDelta;
  }

  const animOpts: KeyframeAnimationOptions = { duration: safeDur, iterations, fill: effectiveFill };
  if (effectiveDelay > 0) animOpts.delay = effectiveDelay;
  if (easing) animOpts.easing = easing;

  const anim = el.animate(keyframes, animOpts);
  trackElementAnimation(el, anim);
  if (effectiveDelay === 0 && Number.isFinite(seekTimeMs) && seekTimeMs > 0.5) {
    try {
      anim.currentTime = Number.isFinite(totalSpanMs) ? seekTimeMs : seekTimeMs % safeDur;
    } catch (_) {}
  }
  if (animRef) animRef.current = anim;
  return anim;
}
