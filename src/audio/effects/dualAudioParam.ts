/**
 * dualAudioParam.ts — Pont AudioParam double Zéro-GC pilotant simultanément les branches Instrumentale et Toada (< 40 lignes).
 */

export function createDualAudioParam(rawCtx: BaseAudioContext, a: AudioParam, b: AudioParam) {
  return {
    context: rawCtx,
    get defaultValue() { return a.defaultValue; },
    get minValue() { return a.minValue; },
    get maxValue() { return a.maxValue; },
    get value() { return a.value; },
    set value(v: number) { a.value = v; b.value = v; },
    rampTo(v: number, dur = 0.02) {
      const now = rawCtx.currentTime ?? 0, tau = Math.max(0.005, dur / 3);
      a.cancelScheduledValues?.(now); b.cancelScheduledValues?.(now);
      a.setTargetAtTime(v, now, tau); b.setTargetAtTime(v, now, tau);
    },
    setValueAtTime(v: number, t: number) { a.setValueAtTime(v, t); b.setValueAtTime(v, t); return a; },
    linearRampToValueAtTime(v: number, t: number) { a.linearRampToValueAtTime(v, t); b.linearRampToValueAtTime(v, t); return a; },
    exponentialRampToValueAtTime(v: number, t: number) { a.exponentialRampToValueAtTime(v, t); b.exponentialRampToValueAtTime(v, t); return a; },
    setTargetAtTime(v: number, t: number, tau: number) { a.setTargetAtTime(v, t, tau); b.setTargetAtTime(v, t, tau); return a; },
    setValueCurveAtTime(c: number[] | Float32Array, t: number, d: number) { a.setValueCurveAtTime(c, t, d); b.setValueCurveAtTime(c, t, d); return a; },
    cancelScheduledValues(t: number) { a.cancelScheduledValues(t); b.cancelScheduledValues(t); return a; },
    cancelAndHoldAtTime(t: number) {
      if (typeof (a as any).cancelAndHoldAtTime === 'function') (a as any).cancelAndHoldAtTime(t); else a.cancelScheduledValues(t);
      if (typeof (b as any).cancelAndHoldAtTime === 'function') (b as any).cancelAndHoldAtTime(t); else b.cancelScheduledValues(t);
      return a;
    },
  };
}
