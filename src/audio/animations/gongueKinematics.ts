import { CONFIG_GONGUE_STICK, GongueDynamicState, GongueNextStrokeKind } from './gongueStickConfig';
import { getGongueStaticPoseState, updateGongueStickGeometry } from '../../components/AoVivo/GongueStickSvg';
import { buildGonguePoseForStroke, classifyGongueToken, lerpGongueState } from './gonguePoseBuilder';
import { BarulhoStepPlan } from './barulhoRollPlanner';

export * from './gongueStickConfig';
export { buildGonguePoseForStroke };

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

function resolveGongueEndPose(nextKind: GongueNextStrokeKind, isAbafadoX = false, impPose?: GongueDynamicState): GongueDynamicState {
  const nextTok = nextKind === 'aigu_strong' ? 'A' : nextKind === 'aigu_weak' ? 'a' : nextKind === 'grave_weak' ? 'g' : 'G';
  const nextAmp = nextKind === 'grave_weak' || nextKind === 'aigu_weak' ? CONFIG_GONGUE_STICK.stayLowBeforeWeakRatio : CONFIG_GONGUE_STICK.liftHighBeforeStrongMult;
  return nextKind === 'idle' ? (isAbafadoX && impPose ? impPose : getGongueStaticPoseState(true)) : buildGonguePoseForStroke(nextTok, false, nextAmp);
}

export function findGongueLookahead(
  activePlayingSteps: any[] | undefined, currentStep: number, stepDurationMs: number, isSubStep = false
): { nextKind: GongueNextStrokeKind; msUntilNext: number } {
  if (!activePlayingSteps || activePlayingSteps.length === 0) return { nextKind: 'idle', msUntilNext: Math.round(stepDurationMs * 2) };
  const len = activePlayingSteps.length;
  if (!isSubStep && Array.isArray(activePlayingSteps[currentStep]) && activePlayingSteps[currentStep].length > 1) {
    const subKind = classifyGongueToken(String(activePlayingSteps[currentStep][1] || ''));
    if (subKind) return { nextKind: subKind, msUntilNext: Math.max(70, Math.round(stepDurationMs * 0.5)) };
  }
  for (let offset = 1; offset <= Math.min(len, 4); offset++) {
    const raw = activePlayingSteps[(currentStep + offset) % len];
    const list = Array.isArray(raw) ? raw : typeof raw === 'object' && Array.isArray(raw?.sim) ? raw.sim : [raw];
    for (let i = 0; i < list.length; i++) {
      const k = classifyGongueToken(String(list[i] || ''));
      if (k) return { nextKind: k, msUntilNext: Math.max(90, Math.round((offset + (i > 0 && Array.isArray(raw) ? 0.5 : 0)) * stepDurationMs)) };
    }
  }
  return { nextKind: 'idle', msUntilNext: Math.max(180, Math.round(stepDurationMs * 2)) };
}

export function startGongueBarulhoAnimation(
  svgEl: SVGSVGElement | null, isLeftHanded: boolean, nextKind: GongueNextStrokeKind,
  stepDurationMs: number, leadMs: number, plan: BarulhoStepPlan
): void {
  if (!svgEl) return;
  const endPose = resolveGongueEndPose(nextKind);
  lastPreparedPose = endPose;
  const safeLead = Math.max(0, Math.round(leadMs)), rollSpanMs = Math.max(75, Math.round(stepDurationMs * 0.78));
  if (plan.action === 'continue' && gongueRollCtrl.active && activeRafId !== null) {
    gongueRollCtrl.amp = plan.amplitude;
    gongueRollCtrl.endPose = endPose;
    gongueRollCtrl.releaseAtMs = plan.sustain ? Infinity : performance.now() + safeLead + rollSpanMs;
    return;
  }
  stopGongueTwoNodeAnimation();
  const startPose = lastRenderedPose || lastPreparedPose || buildGonguePoseForStroke('G', false);
  const impPose = buildGonguePoseForStroke('G', true), altPose = buildGonguePoseForStroke('A', true);
  let relFromPose = impPose;
  const t0 = performance.now();
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
  svgEl: SVGSVGElement | null, stroke: string, isLeftHanded: boolean, nextKind: GongueNextStrokeKind, durationMs: number
): void {
  if (!svgEl) return;
  const s = (stroke || 'G').trim(), sUp = s.toUpperCase();
  if (sUp === 'B' || s === '~') {
    startGongueBarulhoAnimation(svgEl, isLeftHanded, nextKind, durationMs, 0, { action: 'start', sustain: false, amplitude: s === 'b' ? 0.6 : 1, ampChanged: true });
    return;
  }
  stopGongueTwoNodeAnimation();
  const isAbafadoX = sUp === 'X';
  const startPose = lastPreparedPose || buildGonguePoseForStroke(s, false), impPose = buildGonguePoseForStroke(s, true);
  const rebPose = isAbafadoX ? impPose : lerpGongueState(impPose, startPose, CONFIG_GONGUE_STICK.reboundRatio);
  const endPose = resolveGongueEndPose(nextKind, isAbafadoX, impPose);
  lastPreparedPose = endPose;
  const spd = CONFIG_GONGUE_STICK.speedMultiplier, strikeMs = Math.max(18, CONFIG_GONGUE_STICK.strikeDurationMs / spd);
  const holdOrCrushMs = isAbafadoX ? Math.max(80, (durationMs - strikeMs) * 0.72) : Math.max(0, CONFIG_GONGUE_STICK.metalCrushMs / spd);
  const retMs = Math.max(35, (durationMs - strikeMs - holdOrCrushMs) / Math.max(0.25, CONFIG_GONGUE_STICK.returnSpeedMult));
  const totalMs = strikeMs + holdOrCrushMs + retMs, t0 = performance.now();

  const stepFrame = (now: number) => {
    const elapsed = now - t0;
    const cur = elapsed <= strikeMs
      ? lerpGongueState(startPose, impPose, Math.pow(elapsed / strikeMs, 2.0))
      : elapsed <= strikeMs + holdOrCrushMs
        ? (isAbafadoX ? impPose : lerpGongueState(impPose, rebPose, (elapsed - strikeMs) / Math.max(1, holdOrCrushMs)))
        : lerpGongueState(rebPose, endPose, 1 - Math.pow(1 - Math.min(1, (elapsed - strikeMs - holdOrCrushMs) / retMs), 2.1));
    lastRenderedPose = cur;
    updateGongueStickGeometry(svgEl, cur, isLeftHanded);
    activeRafId = elapsed < totalMs ? reqRaf(stepFrame) : null;
  };
  activeRafId = reqRaf(stepFrame);
}
