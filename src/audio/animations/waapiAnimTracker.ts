/**
 * waapiAnimTracker.ts — Double-slot WAAPI `[active, queued]` sans fuite `fill: 'forwards'` (< 128 lignes).
 * - Plafond strict `<= 2` instances `Animation` par élément DOM/SVG, `0` appel `el.getAnimations()`.
 * - Garde `if (slot.active !== finishedAnim) return` dans `onfinish` + promotion atomique `queued -> active`
 *   sans toucher à `el.style.transform` lorsqu'un successeur `queued` prend le relais.
 */

export interface TrackAnimMetadata {
  isQueued?: boolean;
  delayMs?: number;
  finalTransform?: string;
  finalOpacity?: string;
  isInfinite?: boolean;
}

interface ElementAnimSlots {
  active: Animation | null;
  activeFinalTransform?: string;
  activeFinalOpacity?: string;
  queued: Animation | null;
  queuedDelayMs: number;
  queuedFinalTransform?: string;
  queuedFinalOpacity?: string;
}

const slotsByEl = new WeakMap<Element, ElementAnimSlots>();

function commitStylePose(el: Element, transform?: string, opacity?: string): void {
  const style = (el as HTMLElement | SVGElement).style;
  if (!style) return;
  if (typeof transform === 'string' && transform.length > 0) style.transform = transform;
  if (typeof opacity === 'string' && opacity.length > 0) style.opacity = opacity;
}

function safeCancel(anim: Animation | null | undefined): void {
  if (!anim) return;
  try { anim.onfinish = null; } catch (_) {}
  try { anim.cancel(); } catch (_) {}
}

export function hasRunningActiveAnimation(el: Element | null | undefined): boolean {
  const s = el ? slotsByEl.get(el) : undefined;
  return Boolean(s && ((s.active && s.active.playState === 'running') || (s.queued && s.queued.playState === 'running')));
}

export function getTrackedSlotCount(el: Element | null | undefined): number {
  const s = el ? slotsByEl.get(el) : undefined;
  return s ? (s.active ? 1 : 0) + (s.queued ? 1 : 0) : 0;
}

export function getTrackedElementAnimation(el: Element | null | undefined): Animation | null {
  const s = el ? slotsByEl.get(el) : undefined;
  return s ? (s.queued ?? s.active) : null;
}

export function trackElementAnimation(el: Element, anim: Animation, meta?: TrackAnimMetadata): void {
  let s = slotsByEl.get(el);
  if (!s) { s = { active: null, queued: null, queuedDelayMs: 0 }; slotsByEl.set(el, s); }

  const isQueued = Boolean(meta?.isQueued && (meta?.delayMs ?? 0) > 0);
  if (!isQueued) {
    safeCancel(s.queued); safeCancel(s.active);
    s.queued = null; s.queuedDelayMs = 0;
    s.active = anim; s.activeFinalTransform = meta?.finalTransform; s.activeFinalOpacity = meta?.finalOpacity;
  } else {
    if (s.queued) {
      const qCurMs = typeof s.queued.currentTime === 'number' ? s.queued.currentTime : 0;
      if (qCurMs >= s.queuedDelayMs) {
        safeCancel(s.active);
        s.active = s.queued; s.activeFinalTransform = s.queuedFinalTransform; s.activeFinalOpacity = s.queuedFinalOpacity;
      } else safeCancel(s.queued);
      s.queued = null; s.queuedDelayMs = 0;
    }
    if (s.active && s.active.playState === 'finished') {
      commitStylePose(el, s.activeFinalTransform, s.activeFinalOpacity);
      safeCancel(s.active); s.active = null;
    }
    if (!s.active) {
      s.active = anim; s.activeFinalTransform = meta?.finalTransform; s.activeFinalOpacity = meta?.finalOpacity;
    } else {
      s.queued = anim; s.queuedDelayMs = meta?.delayMs ?? 0;
      s.queuedFinalTransform = meta?.finalTransform; s.queuedFinalOpacity = meta?.finalOpacity;
    }
  }

  if (!meta?.isInfinite) {
    const finishedAnim = anim;
    try {
      finishedAnim.onfinish = () => {
        const slot = slotsByEl.get(el);
        if (!slot || slot.active !== finishedAnim) return;
        if (slot.queued) {
          slot.active = slot.queued;
          slot.activeFinalTransform = slot.queuedFinalTransform;
          slot.activeFinalOpacity = slot.queuedFinalOpacity;
          slot.queued = null; slot.queuedDelayMs = 0;
          slot.queuedFinalTransform = undefined; slot.queuedFinalOpacity = undefined;
          safeCancel(finishedAnim);
          return;
        }
        commitStylePose(el, slot.activeFinalTransform ?? meta?.finalTransform, slot.activeFinalOpacity ?? meta?.finalOpacity);
        safeCancel(finishedAnim);
        slot.active = null;
      };
    } catch (_) {}
  }
}

export function cancelTrackedElementAnimation(el: Element | null | undefined): void {
  const s = el ? slotsByEl.get(el) : undefined;
  if (!el || !s) return;
  safeCancel(s.queued); safeCancel(s.active); slotsByEl.delete(el);
}

export function pauseTrackedElementAnimations(el: Element | null | undefined): void {
  const s = el ? slotsByEl.get(el) : undefined;
  if (!s) return;
  if (s.active?.playState === 'running') { try { s.active.pause(); } catch (_) {} }
  if (s.queued?.playState === 'running') { try { s.queued.pause(); } catch (_) {} }
}

export function resumeTrackedElementAnimations(el: Element | null | undefined): void {
  const s = el ? slotsByEl.get(el) : undefined;
  if (!s) return;
  if (s.active?.playState === 'paused') { try { s.active.play(); } catch (_) {} }
  if (s.queued?.playState === 'paused') { try { s.queued.play(); } catch (_) {} }
}
