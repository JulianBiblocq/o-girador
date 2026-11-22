/**
 * caixaSameHandLookahead.ts — Analyse prédictive de la prochaine frappe par main pour Caixa/Tarol (< 65 lignes).
 * - Inclut `A` (Rimshot main dominante) et `a` (Rimshot main secondaire) comme frappes fortes.
 */

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
  isSubStep = false
): { nextKind: CaixaNextStrokeKind; msUntilNext: number } {
  if (!activePlayingSteps || activePlayingSteps.length === 0) {
    return { nextKind: 'idle', msUntilNext: Math.round(stepDurationMs * 2) };
  }
  const len = activePlayingSteps.length;
  if (!isSubStep && Array.isArray(activePlayingSteps[currentStep]) && activePlayingSteps[currentStep].length > 1) {
    const subTok = String(activePlayingSteps[currentStep][1] || '').trim();
    if (isCaixaStrokeForHand(subTok, isDominantHand)) {
      return { nextKind: classifyCaixaNextKind(subTok), msUntilNext: Math.max(65, Math.round(stepDurationMs * 0.5)) };
    }
  }
  for (let offset = 1; offset <= Math.min(len, 4); offset++) {
    const nextIdx = currentStep + offset;
    if (nextIdx >= len) break;
    const raw = activePlayingSteps[nextIdx];
    const list = extractTokens(raw);
    for (let i = 0; i < list.length; i++) {
      const token = list[i];
      if (isCaixaStrokeForHand(token, isDominantHand)) {
        const stepMult = offset + (i > 0 && Array.isArray(raw) ? 0.5 : 0);
        return { nextKind: classifyCaixaNextKind(token), msUntilNext: Math.max(85, Math.round(stepMult * stepDurationMs)) };
      }
    }
  }
  return { nextKind: 'idle', msUntilNext: Math.max(170, Math.round(stepDurationMs * 2)) };
}
