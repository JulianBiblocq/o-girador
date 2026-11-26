/**
 * barulhoWaapiRunner.ts — Ordonnanceur WAAPI du Barulho sans `getAnimations()` et sans saut de phase `cos(0)` (< 138 lignes).
 */
import { BarulhoStepPlan } from './barulhoRollPlanner';
import { cancelTrackedElementAnimation, getTrackedElementAnimation, trackElementAnimation } from './waapiAnimTracker';

export * from './barulhoRollPlanner';

function splitSignedLead(leadMs: number): { safeLead: number; lagMs: number } {
  if (!Number.isFinite(leadMs)) return { safeLead: 0, lagMs: 0 };
  return leadMs < 0 ? { safeLead: 0, lagMs: -leadMs } : { safeLead: Math.round(leadMs), lagMs: 0 };
}

function applyElementPose(el: Element, transform: string, opacity?: number): void {
  const style = (el as HTMLElement | SVGElement).style;
  if (!style) return;
  style.transform = transform;
  if (opacity !== undefined) style.opacity = String(opacity);
}

function buildBoundedStepRollFrames(loopFrames: Keyframe[], endTransform: string, postDurMs: number, cycleMs: number): Keyframe[] {
  const cycles = Math.max(2, Math.min(6, Math.round((postDurMs * 0.78) / Math.max(45, cycleMs))));
  const out: Keyframe[] = [], inner = Math.max(1, loopFrames.length - 1);
  for (let c = 0; c < cycles; c++) {
    for (let i = 0; i < inner; i++) {
      const baseOff = loopFrames[i].offset ?? i / inner;
      out.push({ transform: loopFrames[i].transform, offset: +(((c + baseOff) / cycles) * 0.78).toFixed(3) });
    }
  }
  out.push(
    { transform: loopFrames[0].transform, offset: 0.78, easing: 'cubic-bezier(0.22, 0.85, 0.35, 1)' },
    { transform: endTransform, offset: 1 }
  );
  return out;
}

export function runWaapiBarulhoRoll(opts: {
  el: Element | null; animRef?: { current: Animation | null };
  startTransform: string; loopFrames: Keyframe[]; endTransform: string;
  cycleMs: number; stepDurationMs: number; leadMs: number; plan: BarulhoStepPlan; oneShotStepMode?: boolean;
}): void {
  const { el, animRef, startTransform, loopFrames, endTransform, cycleMs, stepDurationMs, leadMs, plan, oneShotStepMode = false } = opts;
  if (!el || loopFrames.length === 0) return;
  const isCont = plan.action === 'continue';
  const shouldSustainLoop = Boolean(plan.sustain && !oneShotStepMode);
  if (isCont && shouldSustainLoop && !plan.ampChanged) return;

  const { safeLead, lagMs } = splitSignedLead(leadMs);
  const prevAnim = animRef?.current || getTrackedElementAnimation(el);
  if (isCont && shouldSustainLoop && safeLead < 6 && prevAnim && prevAnim.playState === 'running' && typeof (prevAnim.effect as KeyframeEffect | null)?.setKeyframes === 'function') {
    (prevAnim.effect as KeyframeEffect).setKeyframes(loopFrames);
    return;
  }
  const prevPhaseMs = isCont && typeof prevAnim?.currentTime === 'number' && Number.isFinite(prevAnim.currentTime)
    ? Math.max(0, prevAnim.currentTime) % Math.max(16, cycleMs)
    : 0;

  animRef?.current?.cancel();
  if (animRef) animRef.current = null;
  cancelTrackedElementAnimation(el);

  if (!isCont && safeLead >= 6) {
    el.animate(
      [{ transform: startTransform, offset: 0, easing: 'cubic-bezier(0.7, 0, 1, 1)' }, { transform: String(loopFrames[0].transform), offset: 1 }],
      { duration: safeLead, iterations: 1, fill: 'forwards' }
    );
  } else if (isCont && safeLead >= 6) {
    el.animate(loopFrames, { duration: cycleMs, iterations: Math.max(0.25, +(safeLead / Math.max(40, cycleMs)).toFixed(2)), fill: 'forwards' });
  }

  const postDur = Math.max(100, Math.round(stepDurationMs));
  if (!shouldSustainLoop && safeLead === 0 && lagMs >= postDur * 0.85) {
    applyElementPose(el, endTransform);
    return;
  }
  const anim = shouldSustainLoop
    ? el.animate(loopFrames, { delay: safeLead, duration: cycleMs, iterations: Infinity })
    : el.animate(buildBoundedStepRollFrames(loopFrames, endTransform, postDur, cycleMs), { delay: safeLead, duration: postDur, iterations: 1, fill: 'forwards' });
  trackElementAnimation(el, anim);
  const seekMs = shouldSustainLoop ? (prevPhaseMs + (safeLead === 0 ? lagMs : 0)) % Math.max(16, cycleMs) : (safeLead === 0 ? lagMs : 0);
  if (seekMs > 0.5) {
    try { anim.currentTime = seekMs; } catch (_) {}
  }
  if (animRef) animRef.current = anim;
}

export function releaseWaapiBarulhoRoll(opts: {
  el: Element | null; animRef?: { current: Animation | null };
  contactTransform: string; endTransform: string; loopFrames: Keyframe[];
  cycleMs: number; leadMs: number; releaseDurMs?: number;
}): void {
  const { el, animRef, contactTransform, endTransform, loopFrames, cycleMs, leadMs, releaseDurMs = 125 } = opts;
  if (!el) return;
  const { safeLead, lagMs } = splitSignedLead(leadMs);
  animRef?.current?.cancel();
  if (animRef) animRef.current = null;
  cancelTrackedElementAnimation(el);
  if (safeLead === 0 && lagMs >= releaseDurMs * 0.85) {
    applyElementPose(el, endTransform);
    return;
  }
  if (safeLead >= 6 && loopFrames.length > 0) {
    el.animate(loopFrames, { duration: cycleMs, iterations: Math.max(0.25, +(safeLead / Math.max(40, cycleMs)).toFixed(2)), fill: 'forwards' });
  }
  const anim = el.animate(
    [{ transform: contactTransform, offset: 0, easing: 'cubic-bezier(0.22, 0.85, 0.35, 1)' }, { transform: endTransform, offset: 1 }],
    { delay: safeLead, duration: releaseDurMs, iterations: 1, fill: 'forwards' }
  );
  trackElementAnimation(el, anim);
  if (safeLead === 0 && lagMs > 0.5) {
    try { anim.currentTime = lagMs; } catch (_) {}
  }
  if (animRef) animRef.current = anim;
}

export function syncBarulhoStickShadow(
  stickEl: Element | null, contactY: number, contactOpacity: number,
  restTransform: string, restOpacity: number, stepDurationMs: number, leadMs: number, plan: BarulhoStepPlan, oneShotStepMode = false
): void {
  const shadowEl = stickEl?.querySelector('[data-stick-shadow]') as SVGGElement | null;
  if (!shadowEl || (plan.action === 'continue' && plan.sustain && !oneShotStepMode)) return;
  cancelTrackedElementAnimation(shadowEl);
  const { safeLead, lagMs } = splitSignedLead(leadMs);
  const dur = plan.action === 'stop' ? 120 : Math.max(100, Math.round(stepDurationMs));
  const shouldSustainShadow = Boolean(plan.sustain && !oneShotStepMode);
  if (!shouldSustainShadow && safeLead === 0 && lagMs >= dur * 0.85) {
    applyElementPose(shadowEl, restTransform, restOpacity);
    return;
  }
  const contact = { transform: `translate(0px, ${contactY}px) scale(0.95)`, opacity: contactOpacity };
  const frames = plan.action === 'stop'
    ? [{ ...contact, offset: 0 }, { transform: restTransform, opacity: restOpacity, offset: 1 }]
    : shouldSustainShadow
      ? [{ ...contact, offset: 0 }, { ...contact, offset: 1 }]
      : [{ ...contact, offset: 0 }, { ...contact, offset: 0.78 }, { transform: restTransform, opacity: restOpacity, offset: 1 }];
  const shAnim = shadowEl.animate(frames, { delay: safeLead, duration: dur, fill: 'forwards' });
  trackElementAnimation(shadowEl, shAnim);
  if (safeLead === 0 && lagMs > 0.5 && !shouldSustainShadow) {
    try { shAnim.currentTime = lagMs; } catch (_) {}
  }
}
