/**
 * barulhoRollPlanner.ts — Planificateur d'état du Barulho (B, b, /, .) sur les 7 familles Ao Vivo.
 */

export type BarulhoStepAction = 'start' | 'continue' | 'stop' | 'none';

export interface BarulhoStepPlan {
  action: BarulhoStepAction;
  sustain: boolean;
  amplitude: number;
  ampChanged: boolean;
}

const activeRollState = { active: false, family: '', amplitude: 1 };

export function isBarulhoRollActive(family?: string): boolean {
  return activeRollState.active && (!family || activeRollState.family === family);
}

export function resetBarulhoRollState(): void {
  activeRollState.active = false;
  activeRollState.family = '';
  activeRollState.amplitude = 1;
}

const isHeadTok = (t: string, allowT: boolean) =>
  t === 'B' || t === 'b' || t === '~' || (allowT && (t === 'T' || t === 't'));

const isRollTok = (t: string, allowT: boolean) => t === '/' || isHeadTok(t, allowT);

function pickToken(raw: any, pickLast: boolean, allowT: boolean): string {
  if (!raw || raw === 0) return '';
  if (Array.isArray(raw)) return String(raw[pickLast ? raw.length - 1 : 0] ?? '').trim();
  if (typeof raw === 'object' && Array.isArray(raw.sim)) {
    const found = raw.sim.map((x: any) => String(x || '').trim()).find((x: string) => isRollTok(x, allowT) || x === '.');
    return found ?? String(raw.sim[0] ?? '').trim();
  }
  return String(raw).trim();
}

function hasPrecedingHead(steps: any[] | undefined, curIdx: number, isSub: boolean, allowT: boolean): boolean {
  if (!steps || steps.length === 0) return false;
  if (isSub && Array.isArray(steps[curIdx])) {
    const first = String(steps[curIdx][0] ?? '').trim();
    if (isHeadTok(first, allowT)) return true;
    if (first !== '/') return false;
  }
  for (let off = 1; off <= Math.min(steps.length, 16); off++) {
    const prevIdx = curIdx - off;
    if (prevIdx < 0) break;
    const tok = pickToken(steps[prevIdx], true, allowT);
    if (isHeadTok(tok, allowT)) return true;
    if (tok !== '/') return false;
  }
  return false;
}

function resolveSlashAmplitude(steps: any[] | undefined, curIdx: number, allowT: boolean, fallback: number): number {
  if (!steps || steps.length === 0) return fallback;
  const len = steps.length;
  let startAmp = fallback, backDist = 1;
  for (let off = 1; off <= Math.min(len, 16); off++) {
    const prevIdx = curIdx - off;
    if (prevIdx < 0) break;
    const tok = pickToken(steps[prevIdx], true, allowT);
    if (isHeadTok(tok, allowT)) { startAmp = tok === 'b' || tok === 't' ? 0.6 : 1; backDist = off; break; }
    if (tok !== '/') break;
  }
  let endAmp = startAmp, fwdDist = 1;
  for (let off = 1; off <= Math.min(len, 16); off++) {
    const nextIdx = curIdx + off;
    if (nextIdx >= len) break;
    const tok = pickToken(steps[nextIdx], false, allowT);
    if (isHeadTok(tok, allowT)) { endAmp = tok === 'b' || tok === 't' ? 0.6 : 1; fwdDist = off; break; }
    if (tok === '.') { endAmp = +(startAmp * 0.72).toFixed(2); fwdDist = off; break; }
    if (tok !== '/') break;
  }
  return +(startAmp + (endAmp - startAmp) * (backDist / Math.max(1, backDist + fwdDist))).toFixed(2);
}

export function consumeBarulhoStepPlan(
  family: string, stroke: string, steps: any[] | undefined, curIdx: number, isSub = false
): BarulhoStepPlan {
  const s = (stroke || '').trim();
  const allowT = family === 'alfaia' || family === 'caixa' || family === 'tarol';
  const wasRolling = activeRollState.active && activeRollState.family === family;
  if (s === '.' || !s || s === '0' || s === '-') {
    if (!wasRolling) return { action: 'none', sustain: false, amplitude: 0, ampChanged: false };
    resetBarulhoRollState();
    return { action: 'stop', sustain: false, amplitude: 0, ampChanged: true };
  }
  if (!isRollTok(s, allowT)) {
    if (activeRollState.active) resetBarulhoRollState();
    return { action: 'none', sustain: false, amplitude: 0, ampChanged: false };
  }
  if (s === '/' && !wasRolling && !hasPrecedingHead(steps, curIdx, isSub, allowT)) {
    return { action: 'none', sustain: false, amplitude: 0, ampChanged: false };
  }
  const nextTok =
    !isSub && steps && Array.isArray(steps[curIdx]) && steps[curIdx].length > 1
      ? pickToken(steps[curIdx][1], false, allowT)
      : steps && curIdx + 1 < steps.length
        ? pickToken(steps[curIdx + 1], false, allowT)
        : '0';
  const sustain = nextTok === '/' || nextTok === '.' || isRollTok(nextTok, allowT);
  const amplitude = s === '/' ? resolveSlashAmplitude(steps, curIdx, allowT, activeRollState.amplitude) : (s === 'b' || s === 't' ? 0.6 : 1);
  const ampChanged = !wasRolling || Math.abs(amplitude - activeRollState.amplitude) >= 0.08;
  activeRollState.active = sustain;
  activeRollState.family = sustain ? family : '';
  activeRollState.amplitude = amplitude;
  return { action: wasRolling ? 'continue' : 'start', sustain, amplitude, ampChanged };
}
