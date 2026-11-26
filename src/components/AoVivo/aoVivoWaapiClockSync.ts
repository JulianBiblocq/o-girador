/**
 * aoVivoWaapiClockSync.ts — Asservissement horloge Web Audio double-slot WAAPI sans fuite (< 125 lignes).
 * - Si `rawDelta < -1.5` (pré-programmation GPU `delay` anticipée) :
 *   * Si une animation est déjà en cours sur `el` : `fill: 'forwards'` + slot `queued` (ne coupe jamais le rebond précédent).
 *   * Sinon (départ depuis le repos) : `fill: 'both'`.
 * - Si `rawDelta >= -1.5` (déclenchement immédiat) : annule l'ancien slot et borne `currentTime` avant/proche du pic d'impact.
 */
import {
  cancelTrackedElementAnimation,
  getTrackedElementAnimation,
  getTrackedSlotCount,
  hasRunningActiveAnimation,
  pauseTrackedElementAnimations,
  resumeTrackedElementAnimations,
  trackElementAnimation,
} from '../../audio/animations/waapiAnimTracker';

export {
  cancelTrackedElementAnimation,
  getTrackedElementAnimation,
  getTrackedSlotCount,
  pauseTrackedElementAnimations,
  resumeTrackedElementAnimations,
  trackElementAnimation,
};

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

export function alignHitLeadToStrokeStartDeltaMs(signedHitLeadMs: number, tImpactMs: number, isOneShotPreview = false): number {
  if (isOneShotPreview || !Number.isFinite(signedHitLeadMs)) return 0;
  return -signedHitLeadMs + Math.max(0, tImpactMs);
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

  const safeDur = Math.max(16, Math.round(durationMs));
  const safeIters = Number.isFinite(iterations) && iterations > 0 ? iterations : 1;
  const totalSpanMs = safeDur * safeIters;
  const effImpactMs = tImpactMs ?? Math.min(24, safeDur * 0.24);
  const effHoldEndMs = tHoldEndMs ?? Math.min(effImpactMs + 22, safeDur * 0.48);

  const rawDelta = typeof deltaMs === 'number' && Number.isFinite(deltaMs)
    ? deltaMs
    : delayMs > 0
      ? -delayMs
      : Math.max(0, lagMs);

  const hasActive = hasRunningActiveAnimation(el);
  let effectiveDelay = 0;
  let effectiveFill: FillMode = fill;
  let seekTimeMs = 0;

  if (rawDelta < -1.5) {
    effectiveDelay = Math.round(-rawDelta);
    if (fill !== 'none') {
      effectiveFill = hasActive ? 'forwards' : 'both';
    }
  } else {
    const refAnim = animRef?.current;
    if (animRef) animRef.current = null;
    const tracked = getTrackedElementAnimation(el);
    cancelTrackedElementAnimation(el);
    if (refAnim && refAnim !== tracked) {
      try { refAnim.cancel(); } catch (_) {}
    }

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

  const lastKf = keyframes[keyframes.length - 1];
  const finalTransform = fill !== 'none' && typeof lastKf?.transform === 'string' ? lastKf.transform : undefined;
  const finalOpacity = lastKf?.opacity !== undefined ? String(lastKf.opacity) : undefined;

  const anim = el.animate(keyframes, animOpts);
  trackElementAnimation(el, anim, {
    isQueued: effectiveDelay > 0 && hasActive,
    delayMs: effectiveDelay,
    finalTransform,
    finalOpacity,
    isInfinite: !Number.isFinite(iterations),
  });

  if (effectiveDelay === 0 && Number.isFinite(seekTimeMs) && seekTimeMs > 0.5) {
    try {
      anim.currentTime = Number.isFinite(totalSpanMs) ? seekTimeMs : seekTimeMs % safeDur;
    } catch (_) {}
  }
  if (animRef) animRef.current = anim;
  return anim;
}
