/**
 * alfaiaSameHandLookahead.ts — Prédiction de la prochaine frappe par main sur Alfaia Ao Vivo (< 55 lignes).
 * - Intègre `isSubStep ? offset - 0.5 : offset` et les durées réelles `stepDurationsMs` (`M` + `M+1`).
 */
import { AlfaiaNextStrokeKind } from '../../audio/animations/alfaiaKinematics';
import { sumLookaheadDurationMs } from '../../audio/animations/aoVivoBallisticMath';

function isStrokeForHand(token: string, isDominantHand: boolean): boolean {
  const s = (token || '').trim(), up = s.toUpperCase();
  if (!s || s === '-' || s === '.' || s === '/' || s === '0') return false;
  if (['C', 'X', 'B', 'T', 'R', 'F', '~'].includes(up)) return true;
  return isDominantHand ? up === 'D' || up === 'S' : up === 'E' || up === 'A' || up === 'I' || up === 'V';
}

function extractTokens(raw: any): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map((x) => String(x || '').trim());
  if (typeof raw === 'object' && Array.isArray(raw.sim)) return raw.sim.map((x: any) => String(x || '').trim());
  return [String(raw).trim()];
}

export function findSameHandLookahead(
  activePlayingSteps: any[] | undefined,
  currentStep: number,
  stepDurationMs: number,
  isDominantHand: boolean,
  isSubStep = false,
  stepDurationsMs?: readonly number[]
): { nextKind: AlfaiaNextStrokeKind; msUntilNext: number } {
  if (!activePlayingSteps || activePlayingSteps.length === 0) {
    return { nextKind: 'idle', msUntilNext: Math.max(240, Math.round(stepDurationMs * 3)) };
  }
  const len = activePlayingSteps.length;
  if (!isSubStep && Array.isArray(activePlayingSteps[currentStep]) && activePlayingSteps[currentStep].length > 1) {
    const subTok = String(activePlayingSteps[currentStep][1] || '').trim();
    if (isStrokeForHand(subTok, isDominantHand)) {
      const nextKind = subTok === subTok.toUpperCase() && subTok.toUpperCase() !== 'A' ? 'strong' : 'weak';
      return { nextKind, msUntilNext: sumLookaheadDurationMs(currentStep, currentStep, false, true, stepDurationMs, stepDurationsMs) };
    }
  }
  for (let offset = 1; offset <= Math.min(len, 8); offset++) {
    const nextIdx = currentStep + offset;
    if (nextIdx >= len) break;
    const raw = activePlayingSteps[nextIdx], list = extractTokens(raw);
    for (let i = 0; i < list.length; i++) {
      const token = list[i];
      if (isStrokeForHand(token, isDominantHand)) {
        const isStrong = ['D', 'E', 'I', 'C', 'X', 'B', 'S', 'V', 'F', 'R'].includes(token);
        const msUntilNext = sumLookaheadDurationMs(currentStep, nextIdx, isSubStep, i > 0 && Array.isArray(raw), stepDurationMs, stepDurationsMs);
        return { nextKind: isStrong ? 'strong' : 'weak', msUntilNext };
      }
    }
  }
  return { nextKind: 'idle', msUntilNext: Math.max(240, Math.round(stepDurationMs * 3)) };
}
