import { computeBallisticDurationMs } from './aoVivoBallisticMath';
import { CONFIG_GONGUE_STICK, GongueDynamicState, GongueNextStrokeKind } from './gongueStickConfig';
import { updateGongueStickGeometry } from '../../components/AoVivo/GongueStickSvg';
import { buildGonguePoseForStroke, lerpGongueState } from './gonguePoseBuilder';
import { BarulhoStepPlan } from './barulhoRollPlanner';
import { findGongueLookahead, resolveGongueEndPose } from './gongueLookahead';

export * from './gongueStickConfig';
export { buildGonguePoseForStroke, findGongueLookahead };

let activeRafId: number | null = null;
let lastPreparedPose: GongueDynamicState | null = null;
let lastRenderedPose: GongueDynamicState | null = null;
const gongueRollCtrl = { active: false, amp: 1, releaseAtMs: Infinity, endPose: null as GongueDynamicState | null };
const reqRaf = (cb: FrameRequestCallback): number => (typeof requestAnimationFrame === 'function' ? requestAnimationFrame(cb) : (setTimeout(() => cb(performance.now()), 16) as unknown as number));
const cancelRaf = (id: number): void => { if (typeof cancelAnimationFrame === 'function') cancelAnimationFrame(id); else clearTimeout(id); };

export function stopGongueTwoNodeAnimation(): void {
  if (activeRafId !== null) { cancelRaf(activeRafId); activeRafId = null; }
  gongueRollCtrl.active = false;
}

export function resetGonguePostureMemory(): void {
  lastPreparedPose = null;
  lastRenderedPose = null;
  gongueRollCtrl.active = false;
}

export function startGongueBarulhoAnimation(
  svgEl: SVGSVGElement | null, isLeftHanded: boolean, nextKind: GongueNextStrokeKind,
  stepDurationMs: number, leadMs: number, plan: BarulhoStepPlan
): void {
  if (!svgEl) return;
  const endPose = resolveGongueEndPose(nextKind);
  lastPreparedPose = endPose;
  const lagMs = Number.isFinite(leadMs) && leadMs < 0 ? -leadMs : 0;
  const safeLead = Number.isFinite(leadMs) && leadMs > 0 ? Math.round(leadMs) : 0;
  const rollSpanMs = Math.max(75, Math.round(stepDurationMs * 0.78));
  if (plan.action === 'continue' && gongueRollCtrl.active && activeRafId !== null) {
    gongueRollCtrl.amp = plan.amplitude;
    gongueRollCtrl.endPose = endPose;
    gongueRollCtrl.releaseAtMs = plan.sustain ? Infinity : performance.now() - lagMs + safeLead + rollSpanMs;
    return;
  }
  stopGongueTwoNodeAnimation();
  if (!plan.sustain && lagMs >= (rollSpanMs + 125) * 0.85) {
    lastRenderedPose = endPose;
    updateGongueStickGeometry(svgEl, endPose, isLeftHanded);
    return;
  }
  const startPose = lastRenderedPose || lastPreparedPose || buildGonguePoseForStroke('G', false);
  const impPose = buildGonguePoseForStroke('G', true), altPose = buildGonguePoseForStroke('A', true);
  let relFromPose = impPose;
  const t0 = performance.now() - lagMs;
  gongueRollCtrl.active = true; gongueRollCtrl.amp = plan.amplitude; gongueRollCtrl.endPose = endPose;
  gongueRollCtrl.releaseAtMs = plan.sustain ? Infinity : t0 + safeLead + rollSpanMs;

  const stepFrame = (now: number) => {
    const elapsed = now - t0;
    let cur: GongueDynamicState;
    if (elapsed < safeLead) {
      cur = lerpGongueState(startPose, impPose, Math.pow(elapsed / Math.max(1, safeLead), 1.8));
    } else if (now < gongueRollCtrl.releaseAtMs) {
      const osc = 0.5 - 0.5 * Math.cos(((elapsed - safeLead) / 52) * Math.PI * 2);
      cur = lerpGongueState(impPose, altPose, osc * 0.36 * gongueRollCtrl.amp);
      relFromPose = cur;
    } else {
      const k = Math.min(1, (now - gongueRollCtrl.releaseAtMs) / 125);
      cur = lerpGongueState(relFromPose, gongueRollCtrl.endPose || endPose, 1 - Math.pow(1 - k, 2.1));
      if (k >= 1) { gongueRollCtrl.active = false; activeRafId = null; lastRenderedPose = cur; updateGongueStickGeometry(svgEl, cur, isLeftHanded); return; }
    }
    lastRenderedPose = cur;
    updateGongueStickGeometry(svgEl, cur, isLeftHanded);
    activeRafId = reqRaf(stepFrame);
  };
  activeRafId = reqRaf(stepFrame);
}

export function releaseGongueBarulho(svgEl: SVGSVGElement | null, isLeftHanded: boolean, nextKind: GongueNextStrokeKind, leadMs: number): void {
  if (!svgEl) return;
  const endPose = resolveGongueEndPose(nextKind);
  lastPreparedPose = endPose;
  if (gongueRollCtrl.active && activeRafId !== null) {
    gongueRollCtrl.endPose = endPose;
    gongueRollCtrl.releaseAtMs = performance.now() + Math.max(0, Math.round(leadMs));
  }
}

export function startGongueTwoNodeAnimation(
  svgEl: SVGSVGElement | null, stroke: string, isLeftHanded: boolean, nextKind: GongueNextStrokeKind, realMsUntilNext: number, deltaMs = 0
): void {
  if (!svgEl) return;
  const s = (stroke || 'G').trim(), sUp = s.toUpperCase();
  if (sUp === 'B' || s === '~') {
    startGongueBarulhoAnimation(svgEl, isLeftHanded, nextKind, realMsUntilNext, -deltaMs, { action: 'start', sustain: false, amplitude: s === 'b' ? 0.6 : 1, ampChanged: true });
    return;
  }
  const startPose = lastRenderedPose || lastPreparedPose || buildGonguePoseForStroke(s, false);
  stopGongueTwoNodeAnimation();
  const isAbafadoX = sUp === 'X', isStrong = s === 'G' || s === 'A' || isAbafadoX;
  const impPose = buildGonguePoseForStroke(s, true);
  const rebPose = isAbafadoX ? impPose : lerpGongueState(impPose, startPose, CONFIG_GONGUE_STICK.reboundRatio);
  const endPose = resolveGongueEndPose(nextKind, isAbafadoX, impPose, realMsUntilNext);
  lastPreparedPose = endPose;
  const spd = CONFIG_GONGUE_STICK.speedMultiplier;
  const totalMs = isAbafadoX ? Math.max(85, Math.round(realMsUntilNext / spd)) : computeBallisticDurationMs(isStrong, realMsUntilNext, spd);
  const strikeMs = Math.min(18, totalMs * 0.22);
  const holdMs = isAbafadoX ? Math.max(50, (totalMs - strikeMs) * 0.72) : Math.max(34, Math.min(CONFIG_GONGUE_STICK.metalCrushMs / spd, totalMs * 0.52 - strikeMs));
  const retMs = Math.max(20, totalMs - strikeMs - holdMs);

  const leadWaitMs = Number.isFinite(deltaMs) && deltaMs < -1.5 ? Math.round(-deltaMs) : 0;
  const posDelta = Number.isFinite(deltaMs) && deltaMs > 0 ? deltaMs : 0;
  if (leadWaitMs === 0 && posDelta >= totalMs * 0.85) {
    lastRenderedPose = endPose;
    updateGongueStickGeometry(svgEl, endPose, isLeftHanded);
    return;
  }
  const seekMs = leadWaitMs > 0 ? 0 : posDelta <= strikeMs + holdMs + 12 ? Math.min(posDelta, strikeMs + 6) : posDelta;
  const t0 = performance.now() + leadWaitMs - seekMs;
  const stepFrame = (now: number) => {
    const elapsed = now - t0;
    const cur = elapsed <= 0 ? startPose
      : elapsed <= strikeMs ? lerpGongueState(startPose, impPose, Math.pow(elapsed / strikeMs, 2.0))
        : elapsed <= strikeMs + holdMs ? (isAbafadoX ? impPose : lerpGongueState(impPose, rebPose, (elapsed - strikeMs) / Math.max(1, holdMs)))
          : lerpGongueState(rebPose, endPose, 1 - Math.pow(1 - Math.min(1, (elapsed - strikeMs - holdMs) / retMs), 2.1));
    lastRenderedPose = cur;
    updateGongueStickGeometry(svgEl, cur, isLeftHanded);
    activeRafId = elapsed < totalMs ? reqRaf(stepFrame) : null;
  };
  activeRafId = reqRaf(stepFrame);
}
