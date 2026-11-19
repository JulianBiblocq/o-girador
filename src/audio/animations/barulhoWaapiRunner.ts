/**
 * barulhoWaapiRunner.ts — Ordonnanceur WAAPI du Barulho synchronisé sur hitTime (leadMs).
 */
import { BarulhoStepPlan } from './barulhoRollPlanner';

export * from './barulhoRollPlanner';

function buildBoundedStepRollFrames(loopFrames: Keyframe[], endTransform: string, postDurMs: number, cycleMs: number): Keyframe[] {
  const cycles = Math.max(2, Math.min(6, Math.round((postDurMs * 0.78) / Math.max(45, cycleMs))));
  const out: Keyframe[] = [];
  const inner = Math.max(1, loopFrames.length - 1);
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
  el: Element | null;
  animRef?: { current: Animation | null };
  startTransform: string;
  loopFrames: Keyframe[];
  endTransform: string;
  cycleMs: number;
  stepDurationMs: number;
  leadMs: number;
  plan: BarulhoStepPlan;
  oneShotStepMode?: boolean;
}): void {
  const { el, animRef, startTransform, loopFrames, endTransform, cycleMs, stepDurationMs, leadMs, plan, oneShotStepMode = false } = opts;
  if (!el || loopFrames.length === 0) return;
  const isCont = plan.action === 'continue';
  if (isCont && plan.sustain && !plan.ampChanged && !oneShotStepMode) return;
  const safeLead = Math.max(0, Math.round(leadMs));
  animRef?.current?.cancel();
  el.getAnimations?.().forEach((a) => a.cancel());

  if (!isCont && safeLead >= 6) {
    el.animate(
      [
        { transform: startTransform, offset: 0, easing: 'cubic-bezier(0.7, 0, 1, 1)' },
        { transform: String(loopFrames[0].transform), offset: 1 },
      ],
      { duration: safeLead, iterations: 1, fill: 'forwards' }
    );
  } else if (isCont && safeLead >= 6) {
    el.animate(loopFrames, {
      duration: cycleMs,
      iterations: Math.max(0.25, +(safeLead / Math.max(40, cycleMs)).toFixed(2)),
      fill: 'forwards',
    });
  }

  const postDur = Math.max(100, Math.round(stepDurationMs));
  const shouldSustainLoop = Boolean(plan.sustain && !oneShotStepMode);
  const anim = shouldSustainLoop
    ? el.animate(loopFrames, { delay: safeLead, duration: cycleMs, iterations: Infinity })
    : el.animate(buildBoundedStepRollFrames(loopFrames, endTransform, postDur, cycleMs), {
      delay: safeLead,
      duration: postDur,
      iterations: 1,
      fill: 'forwards',
    });
  if (animRef) animRef.current = anim;
}

export function releaseWaapiBarulhoRoll(opts: {
  el: Element | null;
  animRef?: { current: Animation | null };
  contactTransform: string;
  endTransform: string;
  loopFrames: Keyframe[];
  cycleMs: number;
  leadMs: number;
  releaseDurMs?: number;
}): void {
  const { el, animRef, contactTransform, endTransform, loopFrames, cycleMs, leadMs, releaseDurMs = 125 } = opts;
  if (!el) return;
  const safeLead = Math.max(0, Math.round(leadMs));
  animRef?.current?.cancel();
  el.getAnimations?.().forEach((a) => a.cancel());
  if (safeLead >= 6 && loopFrames.length > 0) {
    el.animate(loopFrames, {
      duration: cycleMs,
      iterations: Math.max(0.25, +(safeLead / Math.max(40, cycleMs)).toFixed(2)),
      fill: 'forwards',
    });
  }
  const anim = el.animate(
    [
      { transform: contactTransform, offset: 0, easing: 'cubic-bezier(0.22, 0.85, 0.35, 1)' },
      { transform: endTransform, offset: 1 },
    ],
    { delay: safeLead, duration: releaseDurMs, iterations: 1, fill: 'forwards' }
  );
  if (animRef) animRef.current = anim;
}

export function syncBarulhoStickShadow(
  stickEl: Element | null, contactY: number, contactOpacity: number,
  restTransform: string, restOpacity: number, stepDurationMs: number, leadMs: number, plan: BarulhoStepPlan, oneShotStepMode = false
): void {
  const shadowEl = stickEl?.querySelector('[data-stick-shadow]') as SVGGElement | null;
  if (!shadowEl || (plan.action === 'continue' && plan.sustain && !oneShotStepMode)) return;
  shadowEl.getAnimations?.().forEach((a) => a.cancel());
  const contact = { transform: `translate(0px, ${contactY}px) scale(0.95)`, opacity: contactOpacity };
  const shouldSustainShadow = Boolean(plan.sustain && !oneShotStepMode);
  const frames = plan.action === 'stop'
    ? [{ ...contact, offset: 0 }, { transform: restTransform, opacity: restOpacity, offset: 1 }]
    : shouldSustainShadow
      ? [{ ...contact, offset: 0 }, { ...contact, offset: 1 }]
      : [{ ...contact, offset: 0 }, { ...contact, offset: 0.78 }, { transform: restTransform, opacity: restOpacity, offset: 1 }];
  shadowEl.animate(frames, {
    delay: Math.max(0, Math.round(leadMs)),
    duration: plan.action === 'stop' ? 120 : Math.max(100, Math.round(stepDurationMs)),
    fill: 'forwards',
  });
}
