import {
  CONFIG_GONGUE_STICK,
  GongueDynamicState,
  GongueNextStrokeKind,
} from './gongueStickConfig';
import {
  getGongueStaticPoseState,
  updateGongueStickGeometry,
} from '../../components/AoVivo/GongueStickSvg';
import {
  buildGonguePoseForStroke,
  classifyGongueToken,
  lerpGongueState,
} from './gonguePoseBuilder';

export * from './gongueStickConfig';
export { buildGonguePoseForStroke };

let activeRafId: number | null = null;
let lastPreparedPose: GongueDynamicState | null = null;

export function stopGongueTwoNodeAnimation(): void {
  if (activeRafId !== null) {
    cancelAnimationFrame(activeRafId);
    activeRafId = null;
  }
}

export function resetGonguePostureMemory(): void {
  lastPreparedPose = null;
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
      if (k) {
        const mult = offset + (i > 0 && Array.isArray(raw) ? 0.5 : 0);
        return { nextKind: k, msUntilNext: Math.max(90, Math.round(mult * stepDurationMs)) };
      }
    }
  }
  return { nextKind: 'idle', msUntilNext: Math.max(180, Math.round(stepDurationMs * 2)) };
}

export function startGongueTwoNodeAnimation(
  svgEl: SVGSVGElement | null, stroke: string, isLeftHanded: boolean, nextKind: GongueNextStrokeKind, durationMs: number
): void {
  if (!svgEl) return;
  stopGongueTwoNodeAnimation();
  const s = (stroke || 'G').trim();
  const sUp = s.toUpperCase();
  const isBarulho = sUp === 'B' || s === '~';
  const isAbafadoX = sUp === 'X';

  const startPose = lastPreparedPose || buildGonguePoseForStroke(isBarulho ? 'G' : s, false);
  const impPose = buildGonguePoseForStroke(isBarulho ? 'G' : s, true);
  const altPose = buildGonguePoseForStroke('A', true);
  const rebPose = isAbafadoX ? impPose : lerpGongueState(impPose, startPose, CONFIG_GONGUE_STICK.reboundRatio);

  const nextTok = nextKind === 'aigu_strong' ? 'A' : nextKind === 'aigu_weak' ? 'a' : nextKind === 'grave_weak' ? 'g' : 'G';
  const isNextWeak = nextKind === 'grave_weak' || nextKind === 'aigu_weak';
  const nextAmp = isNextWeak ? CONFIG_GONGUE_STICK.stayLowBeforeWeakRatio : CONFIG_GONGUE_STICK.liftHighBeforeStrongMult;
  const endPose = nextKind === 'idle'
    ? (isAbafadoX ? impPose : getGongueStaticPoseState(true))
    : buildGonguePoseForStroke(nextTok, false, nextAmp);
  lastPreparedPose = endPose;

  const spd = CONFIG_GONGUE_STICK.speedMultiplier;
  const strikeMs = Math.max(18, CONFIG_GONGUE_STICK.strikeDurationMs / spd);
  const holdOrCrushMs = isAbafadoX
    ? Math.max(80, (durationMs - strikeMs) * 0.72)
    : Math.max(0, CONFIG_GONGUE_STICK.metalCrushMs / spd);
  const retMs = Math.max(35, (durationMs - strikeMs - holdOrCrushMs) / Math.max(0.25, CONFIG_GONGUE_STICK.returnSpeedMult));
  const totalMs = strikeMs + holdOrCrushMs + retMs;
  const t0 = performance.now();

  const stepFrame = (now: number) => {
    const elapsed = now - t0;
    let cur: GongueDynamicState;
    if (isBarulho) {
      const osc = 0.5 + 0.5 * Math.sin((elapsed / 45) * Math.PI * 2);
      cur = lerpGongueState(impPose, altPose, osc * 0.35);
    } else if (elapsed <= strikeMs) {
      cur = lerpGongueState(startPose, impPose, Math.pow(elapsed / strikeMs, 2.0));
    } else if (elapsed <= strikeMs + holdOrCrushMs) {
      cur = isAbafadoX ? impPose : lerpGongueState(impPose, rebPose, (elapsed - strikeMs) / Math.max(1, holdOrCrushMs));
    } else {
      const k = Math.min(1, (elapsed - strikeMs - holdOrCrushMs) / retMs);
      cur = lerpGongueState(rebPose, endPose, 1 - Math.pow(1 - k, 2.1));
    }
    updateGongueStickGeometry(svgEl, cur, isLeftHanded);
    if (elapsed < totalMs) activeRafId = requestAnimationFrame(stepFrame);
    else activeRafId = null;
  };
  activeRafId = requestAnimationFrame(stepFrame);
}
