/**
 * waapiAnimTracker.ts — Registre WeakMap O(1) des instances WAAPI par élément DOM/SVG (< 35 lignes).
 * Élimine tout appel `el.getAnimations()` (zéro allocation tableau, zéro thrashing compositeur).
 */

const activeAnimByEl = new WeakMap<Element, Animation>();

export function trackElementAnimation(el: Element, anim: Animation): void {
  activeAnimByEl.set(el, anim);
}

export function getTrackedElementAnimation(el: Element | null | undefined): Animation | null {
  return el ? activeAnimByEl.get(el) ?? null : null;
}

export function cancelTrackedElementAnimation(el: Element | null | undefined): void {
  if (!el) return;
  const prev = activeAnimByEl.get(el);
  if (prev) {
    try { prev.cancel(); } catch (_) {}
    activeAnimByEl.delete(el);
  }
}
