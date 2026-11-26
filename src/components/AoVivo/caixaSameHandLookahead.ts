/**
 * caixaSameHandLookahead.ts — Analyse prédictive de la prochaine frappe par main pour Caixa/Tarol (< 65 lignes).
 * - Intègre `isSubStep ? offset - 0.5 : offset` et `stepDurationsMs` (`M` + `M+1`).
 */
import { sumLookaheadDurationMs } from '../../audio/animations/aoVivoBallisticMath';
import { CaixaNextStrokeKind } from '../../audio/animations/caixaKinematics';

export function isCaixaStrokeForHand(token: string, isDominantHand: boolean): boolean {
  const s = (token || '').trim();
  if (!s || s === '-' || s === '.' || s === '/' || s === '0') return false;
  const up = s.toUpperCase();
  if (['C', 'X', 'B', 'F', '~'].includes(up)) return true;
  if (s === 'R' || s === 'A') return isDominantHand;
  if (s === 'r' || s === 'a') return !isDominantHand;
  return isDominantHand ? up === 'D' || up === 'S' : up === 'E' || up === 'V';
}

export function classifyCaixaNextKind(token: string): CaixaNextStrokeKind {
  if (token === 'R' || token === 'r' || token === 'B' || token === 'b' || token === '~') return 'rufada';
  if (['D', 'E', 'A', 'a', 'F', 'f', 'C', 'X', 'S', 'V'].includes(token)) return 'strong';
  return 'weak';
}

function extractTokens(raw: any): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map((x) => String(x || '').trim());
  if (typeof raw === 'object' && Array.isArray(raw.sim)) return raw.sim.map((x: any) => String(x || '').trim());
  return [String(raw).trim()];
}

export function findCaixaSameHandLookahead(
  activePlayingSteps: any[] | undefined,
  currentStep: number,
  stepDurationMs: number,
  isDominantHand: boolean,
  isSubStep = false,
  stepDurationsMs?: readonly number[]
): { nextKind: CaixaNextStrokeKind; msUntilNext: number } {
  if (!activePlayingSteps || activePlayingSteps.length === 0) {
    return { nextKind: 'idle', msUntilNext: Math.max(240, Math.round(stepDurationMs * 3)) };
  }
  const len = activePlayingSteps.length;
  if (!isSubStep && Array.isArray(activePlayingSteps[currentStep]) && activePlayingSteps[currentStep].length > 1) {
    const subTok = String(activePlayingSteps[currentStep][1] || '').trim();
    if (isCaixaStrokeForHand(subTok, isDominantHand)) {
      return { nextKind: classifyCaixaNextKind(subTok), msUntilNext: sumLookaheadDurationMs(currentStep, currentStep, false, true, stepDurationMs, stepDurationsMs) };
    }
  }
  for (let offset = 1; offset <= Math.min(len, 8); offset++) {
    const nextIdx = currentStep + offset;
    if (nextIdx >= len) break;
    const raw = activePlayingSteps[nextIdx], list = extractTokens(raw);
    for (let i = 0; i < list.length; i++) {
      const token = list[i];
      if (isCaixaStrokeForHand(token, isDominantHand)) {
        const msUntilNext = sumLookaheadDurationMs(currentStep, nextIdx, isSubStep, i > 0 && Array.isArray(raw), stepDurationMs, stepDurationsMs);
        return { nextKind: classifyCaixaNextKind(token), msUntilNext };
      }
    }
  }
  return { nextKind: 'idle', msUntilNext: Math.max(240, Math.round(stepDurationMs * 3)) };
}
