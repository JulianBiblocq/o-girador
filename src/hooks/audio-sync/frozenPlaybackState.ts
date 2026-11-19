/**
 * Socle temps-réel mutable hors cycle React (Zéro Render Thrashing, < 80 lignes).
 * Porte la position exacte figée en Pause (« Arrêt sur image » / Hard Freeze)
 * et sert d'ancre synchrone pour la reprise audio/visuelle et l'avance pas-à-pas.
 */

export interface FrozenPlaybackSnapshot {
  active: boolean;
  measure: number;
  step: number;
  totalSteps: number;
  progress: number;
  tick: number;
  maxTicks: number;
  iteration: number;
  loopIteration: number;
}

export interface FreezeAtParams {
  measure: number;
  step: number;
  totalSteps: number;
  progress: number;
  tick?: number;
  maxTicks?: number;
  iteration?: number;
  loopIteration?: number;
}

export const frozenPlaybackState: FrozenPlaybackSnapshot = {
  active: false, measure: 0, step: 0, totalSteps: 16, progress: 0,
  tick: 0, maxTicks: 96, iteration: 1, loopIteration: 1,
};

function clampProgress(raw: number): number {
  if (!Number.isFinite(raw) || raw <= 0) return 0;
  return raw >= 1 ? 0.999999 : raw;
}

export function freezeAt(params: FreezeAtParams): FrozenPlaybackSnapshot {
  const safeTotalSteps = Math.max(1, Math.floor(params.totalSteps || 16));
  const safeMaxTicks = Math.max(1, Math.floor(params.maxTicks || 96));
  const safeMeasure = Math.max(0, Math.floor(params.measure || 0));
  const safeProgress = clampProgress(params.progress);
  const rawStep = Number.isFinite(params.step) ? Math.floor(params.step) : Math.floor(safeProgress * safeTotalSteps);
  const safeStep = Math.max(0, Math.min(safeTotalSteps - 1, rawStep));
  const rawTick = params.tick !== undefined && Number.isFinite(params.tick)
    ? Math.floor(params.tick)
    : Math.floor(safeProgress * safeMaxTicks);

  frozenPlaybackState.active = true;
  frozenPlaybackState.measure = safeMeasure;
  frozenPlaybackState.step = safeStep;
  frozenPlaybackState.totalSteps = safeTotalSteps;
  frozenPlaybackState.progress = safeProgress;
  frozenPlaybackState.tick = Math.max(0, Math.min(safeMaxTicks - 1, rawTick));
  frozenPlaybackState.maxTicks = safeMaxTicks;
  frozenPlaybackState.iteration = Math.max(1, Math.floor(params.iteration ?? 1));
  frozenPlaybackState.loopIteration = Math.max(1, Math.floor(params.loopIteration ?? 1));
  return frozenPlaybackState;
}

export function setFrozenStep(
  measure: number,
  step: number,
  totalSteps: number = frozenPlaybackState.totalSteps || 16,
  maxTicks: number = frozenPlaybackState.maxTicks || 96
): FrozenPlaybackSnapshot {
  const safeTotal = Math.max(1, Math.floor(totalSteps));
  const safeTicks = Math.max(1, Math.floor(maxTicks));
  const safeStep = ((Math.floor(step) % safeTotal) + safeTotal) % safeTotal;
  const progress = clampProgress(safeStep / safeTotal);
  const tick = Math.max(0, Math.min(safeTicks - 1, Math.round(progress * safeTicks)));
  return freezeAt({
    measure: Math.max(0, Math.floor(measure)), step: safeStep, totalSteps: safeTotal,
    progress, tick, maxTicks: safeTicks,
    iteration: frozenPlaybackState.iteration, loopIteration: frozenPlaybackState.loopIteration,
  });
}

export function clearFreeze(): void {
  Object.assign(frozenPlaybackState, {
    active: false, measure: 0, step: 0, totalSteps: 16, progress: 0,
    tick: 0, maxTicks: 96, iteration: 1, loopIteration: 1,
  });
}
