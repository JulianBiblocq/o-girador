/**
 * gongueLookahead.ts — Prédiction d'anticipation et pose finale pour le Gonguê Ao Vivo (< 55 lignes).
 */
import { isFastRepeatCompactPrep, sumLookaheadDurationMs } from './aoVivoBallisticMath';
import { CONFIG_GONGUE_STICK, GongueDynamicState, GongueNextStrokeKind } from './gongueStickConfig';
import { getGongueStaticPoseState } from '../../components/AoVivo/GongueStickSvg';
import { buildGonguePoseForStroke, classifyGongueToken } from './gonguePoseBuilder';

export function resolveGongueEndPose(
  nextKind: GongueNextStrokeKind,
  isAbafadoX = false,
  impPose?: GongueDynamicState,
  realMsUntilNext?: number
): GongueDynamicState {
  const nextTok = nextKind === 'aigu_strong' ? 'A' : nextKind === 'aigu_weak' ? 'a' : nextKind === 'grave_weak' ? 'g' : 'G';
  const compact = nextKind === 'grave_weak' || nextKind === 'aigu_weak' || isFastRepeatCompactPrep(realMsUntilNext);
  const nextAmp = compact ? CONFIG_GONGUE_STICK.stayLowBeforeWeakRatio : CONFIG_GONGUE_STICK.liftHighBeforeStrongMult;
  return nextKind === 'idle' ? (isAbafadoX && impPose ? impPose : getGongueStaticPoseState(true)) : buildGonguePoseForStroke(nextTok, false, nextAmp);
}

export function findGongueLookahead(
  activePlayingSteps: any[] | undefined,
  currentStep: number,
  stepDurationMs: number,
  isSubStep = false,
  stepDurationsMs?: readonly number[]
): { nextKind: GongueNextStrokeKind; msUntilNext: number } {
  if (!activePlayingSteps || activePlayingSteps.length === 0) {
    return { nextKind: 'idle', msUntilNext: Math.max(240, Math.round(stepDurationMs * 3)) };
  }
  const len = activePlayingSteps.length;
  if (!isSubStep && Array.isArray(activePlayingSteps[currentStep]) && activePlayingSteps[currentStep].length > 1) {
    const subKind = classifyGongueToken(String(activePlayingSteps[currentStep][1] || ''));
    if (subKind) return { nextKind: subKind, msUntilNext: sumLookaheadDurationMs(currentStep, currentStep, false, true, stepDurationMs, stepDurationsMs) };
  }
  for (let offset = 1; offset <= Math.min(len, 8); offset++) {
    const nextIdx = currentStep + offset;
    if (nextIdx >= len) break;
    const raw = activePlayingSteps[nextIdx];
    const list = Array.isArray(raw) ? raw : typeof raw === 'object' && Array.isArray(raw?.sim) ? raw.sim : [raw];
    for (let i = 0; i < list.length; i++) {
      const k = classifyGongueToken(String(list[i] || ''));
      if (k) return { nextKind: k, msUntilNext: sumLookaheadDurationMs(currentStep, nextIdx, isSubStep, i > 0 && Array.isArray(raw), stepDurationMs, stepDurationsMs) };
    }
  }
  return { nextKind: 'idle', msUntilNext: Math.max(240, Math.round(stepDurationMs * 3)) };
}
