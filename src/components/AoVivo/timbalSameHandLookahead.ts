/**
 * timbalSameHandLookahead.ts — Prédiction de la prochaine frappe par main sur Timbal Ao Vivo (< 65 lignes).
 * - Intègre `isSubStep ? offset - 0.5 : offset` et `stepDurationsMs` (`M` + `M+1`).
 */
import { sumLookaheadDurationMs } from '../../audio/animations/aoVivoBallisticMath';
import { TimbalNextStrokeKind } from '../../audio/animations/timbalKinematics';

export interface TimbalLookaheadResult {
  nextKind: TimbalNextStrokeKind;
  nextSymbol: string;
  isNextWeak: boolean;
  msUntilNext: number;
}

function isTimbalStrokeForHand(token: string, isDominantHand: boolean): boolean {
  const s = (token || '').trim();
  if (!s || s === '-' || s === '.' || s === '/' || s === '0') return false;
  if (['C', 'c', 'X', 'x', 'B', 'b', 'F', 'f', 'V', 'v', '~'].includes(s)) return true;
  return isDominantHand ? ['G', 'A', 'S', 'T', 'D', 'P'].includes(s) : ['g', 'a', 's', 't', 'd', 'p'].includes(s);
}

function classifyTimbalNextKind(token: string): TimbalNextStrokeKind {
  const up = token.toUpperCase();
  if (up === 'S' || up === 'T' || up === 'V') return 'slap';
  if (up === 'G' || up === 'P') return 'grave';
  if (up === 'A' || up === 'F' || up === 'B') return 'aberto';
  return up === 'D' ? 'ghost' : 'idle';
}

const isWeakTimbalToken = (token: string): boolean => ['g', 'a', 's', 't', 'd', 'p', 'D'].includes(token);

function extractTokens(raw: any): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map((x) => String(x || '').trim());
  if (typeof raw === 'object' && Array.isArray(raw.sim)) return raw.sim.map((x: any) => String(x || '').trim());
  return [String(raw).trim()];
}

export function findTimbalSameHandLookahead(
  activePlayingSteps: any[] | undefined,
  currentStep: number,
  stepDurationMs: number,
  isDominantHand: boolean,
  isSubStep = false,
  stepDurationsMs?: readonly number[]
): TimbalLookaheadResult {
  const idleRes: TimbalLookaheadResult = { nextKind: 'idle', nextSymbol: 'idle', isNextWeak: false, msUntilNext: Math.max(240, Math.round(stepDurationMs * 3)) };
  if (!activePlayingSteps || activePlayingSteps.length === 0) return idleRes;
  const len = activePlayingSteps.length;
  if (!isSubStep && Array.isArray(activePlayingSteps[currentStep]) && activePlayingSteps[currentStep].length > 1) {
    const subTok = String(activePlayingSteps[currentStep][1] || '').trim();
    if (isTimbalStrokeForHand(subTok, isDominantHand)) {
      return { nextKind: classifyTimbalNextKind(subTok), nextSymbol: subTok, isNextWeak: isWeakTimbalToken(subTok), msUntilNext: sumLookaheadDurationMs(currentStep, currentStep, false, true, stepDurationMs, stepDurationsMs) };
    }
  }
  for (let offset = 1; offset <= Math.min(len, 8); offset++) {
    const nextIdx = currentStep + offset;
    if (nextIdx >= len) break;
    const raw = activePlayingSteps[nextIdx], list = extractTokens(raw);
    for (let i = 0; i < list.length; i++) {
      const tok = list[i];
      if (isTimbalStrokeForHand(tok, isDominantHand)) {
        const msUntilNext = sumLookaheadDurationMs(currentStep, nextIdx, isSubStep, i > 0 && Array.isArray(raw), stepDurationMs, stepDurationsMs);
        return { nextKind: classifyTimbalNextKind(tok), nextSymbol: tok, isNextWeak: isWeakTimbalToken(tok), msUntilNext };
      }
    }
  }
  return idleRes;
}
