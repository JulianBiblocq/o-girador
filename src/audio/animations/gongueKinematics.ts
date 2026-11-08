import {
  CONFIG_GONGUE_STICK,
  GongueDynamicState,
  GongueNextStrokeKind,
} from './gongueStickConfig';
import {
  getGongueStaticPoseState,
  updateGongueStickGeometry,
} from '../../components/AoVivo/GongueStickSvg';

export * from './gongueStickConfig';

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

function classifyGongueToken(tok: string): GongueNextStrokeKind | null {
  const s = (tok || '').trim();
  if (!s || s === '0' || s === '-' || s === '.') return null;
  if (s === 'G' || s === 'D') return 'grave_strong';
  if (s === 'g' || s === 'd') return 'grave_weak';
  if (s === 'A' || s === 'E') return 'aigu_strong';
  if (s === 'a' || s === 'e') return 'aigu_weak';
  return 'grave_strong';
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

export function buildGonguePoseForStroke(stroke: string, isImpact: boolean, customAmp?: number): GongueDynamicState {
  const { hand, tip, weakStrokeRatio, flancOffsetX, flancOffsetY } = CONFIG_GONGUE_STICK;
  const s = (stroke || 'G').trim();
  const sUp = s.toUpperCase();
  if (sUp === 'X') {
    const tx = tip.graveX + flancOffsetX, ty = tip.graveY + flancOffsetY;
    if (isImpact) return { handX: hand.graveX + 12, handY: hand.graveY + 10, handScale: hand.graveScale, tipX: tx, tipY: ty, tipScale: +(tip.graveImpactScale * 1.06).toFixed(3), shadowDrop: 0.1 };
    return { handX: hand.graveX + 20, handY: hand.graveY - hand.windUpLiftY, handScale: +(hand.graveScale * hand.windUpScaleMult).toFixed(3), tipX: tx + 18, tipY: ty - 16, tipScale: tip.graveWindUpScale, shadowDrop: 1 };
  }
  const isAigu = sUp === 'A' || sUp === 'E';
  const isWeak = s === 'g' || s === 'a' || s === 'd' || s === 'e';
  const amp = customAmp !== undefined ? customAmp : isWeak ? weakStrokeRatio : 1.0;
  const hX = isAigu ? hand.aiguX : hand.graveX;
  const hY = isAigu ? hand.aiguY : hand.graveY;
  const hS = isAigu ? hand.aiguScale : hand.graveScale;
  const tX = isAigu ? tip.aiguX : tip.graveX;
  const tY = isAigu ? tip.aiguY : tip.graveY;
  const tImpS = isAigu ? tip.aiguImpactScale : tip.graveImpactScale;
  const tWindS = isAigu ? tip.aiguWindUpScale : tip.graveWindUpScale;
  const tLiftY = isAigu ? tip.aiguWindUpLiftY : tip.graveWindUpLiftY;
  if (isImpact) return { handX: hX, handY: hY, handScale: hS, tipX: tX, tipY: tY, tipScale: tImpS, shadowDrop: 0 };
  return {
    handX: hX + Math.round(8 * amp), handY: hY - Math.round(hand.windUpLiftY * amp),
    handScale: +(hS * (1 + (hand.windUpScaleMult - 1) * amp)).toFixed(3),
    tipX: tX + Math.round(14 * amp), tipY: tY - Math.round(tLiftY * amp),
    tipScale: +(tImpS + (tWindS - tImpS) * amp).toFixed(3), shadowDrop: Math.min(1, amp),
  };
}

function lerpState(a: GongueDynamicState, b: GongueDynamicState, t: number): GongueDynamicState {
  const k = Math.max(0, Math.min(1, t));
  return {
    handX: a.handX + (b.handX - a.handX) * k, handY: a.handY + (b.handY - a.handY) * k,
    handScale: a.handScale + (b.handScale - a.handScale) * k, tipX: a.tipX + (b.tipX - a.tipX) * k,
    tipY: a.tipY + (b.tipY - a.tipY) * k, tipScale: a.tipScale + (b.tipScale - a.tipScale) * k,
    shadowDrop: a.shadowDrop + (b.shadowDrop - a.shadowDrop) * k,
  };
}

export function startGongueTwoNodeAnimation(
  svgEl: SVGSVGElement | null, stroke: string, isLeftHanded: boolean, nextKind: GongueNextStrokeKind, durationMs: number
): void {
  if (!svgEl) return;
  stopGongueTwoNodeAnimation();
  const s = (stroke || 'G').trim();
  const isBarulho = s.toUpperCase() === 'B' || s === '~';
  const startPose = lastPreparedPose || buildGonguePoseForStroke(isBarulho ? 'G' : s, false);
  const impPose = buildGonguePoseForStroke(isBarulho ? 'G' : s, true);
  const altPose = buildGonguePoseForStroke('A', true);
  const rebPose = lerpState(impPose, startPose, CONFIG_GONGUE_STICK.reboundRatio);
  const nextTok = nextKind === 'aigu_strong' ? 'A' : nextKind === 'aigu_weak' ? 'a' : nextKind === 'grave_weak' ? 'g' : 'G';
  const isNextWeak = nextKind === 'grave_weak' || nextKind === 'aigu_weak';
  const nextAmp = isNextWeak ? CONFIG_GONGUE_STICK.stayLowBeforeWeakRatio : CONFIG_GONGUE_STICK.liftHighBeforeStrongMult;
  const endPose = nextKind === 'idle' ? getGongueStaticPoseState(true) : buildGonguePoseForStroke(nextTok, false, nextAmp);
  lastPreparedPose = nextKind === 'idle' ? null : endPose;

  const spd = CONFIG_GONGUE_STICK.speedMultiplier;
  const strikeMs = Math.max(18, CONFIG_GONGUE_STICK.strikeDurationMs / spd);
  const crushMs = Math.max(0, CONFIG_GONGUE_STICK.metalCrushMs / spd);
  const retMs = Math.max(40, (durationMs - strikeMs - crushMs) / Math.max(0.25, CONFIG_GONGUE_STICK.returnSpeedMult));
  const totalMs = strikeMs + crushMs + retMs;
  const t0 = performance.now();

  const stepFrame = (now: number) => {
    const elapsed = now - t0;
    let cur: GongueDynamicState;
    if (isBarulho) {
      const osc = 0.5 + 0.5 * Math.sin((elapsed / 45) * Math.PI * 2);
      cur = lerpState(impPose, altPose, osc * 0.35);
    } else if (elapsed <= strikeMs) {
      cur = lerpState(startPose, impPose, Math.pow(elapsed / strikeMs, 2.0));
    } else if (elapsed <= strikeMs + crushMs) {
      cur = lerpState(impPose, rebPose, (elapsed - strikeMs) / Math.max(1, crushMs));
    } else {
      const k = Math.min(1, (elapsed - strikeMs - crushMs) / retMs);
      cur = lerpState(rebPose, endPose, 1 - Math.pow(1 - k, 2.1));
    }
    updateGongueStickGeometry(svgEl, cur, isLeftHanded);
    if (elapsed < totalMs) activeRafId = requestAnimationFrame(stepFrame);
    else activeRafId = null;
  };
  activeRafId = requestAnimationFrame(stepFrame);
}
