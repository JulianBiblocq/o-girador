/**
 * apitoFallbackHoldResolver.ts — Calcul Web Audio Fallback & stage Worklet des pré-coupures d'Apito (< 95 L).
 */
import {
  APITO_NATURAL_STOP_FADE_SEC,
  APITO_TONGUE_FADE_SEC,
  computeApitoPreCutSpec,
  isApitoAttackSymbol,
  planApitoBreathCutsFromLookahead,
} from './apitoBreathCutPlanner';
import type { BarulhoLookaheadPoint } from './barulhoRampPlanner';
import {
  BARULHO_OP_STOP_DOT,
  CHOKE_NONE,
  VOICE_CLASS_GENERIC,
  packWorkletEventFlags,
} from '../worklet/processor/workletSkinPhysics';

export function stageWorkletApitoPreCutEvents(params: {
  seqId: number;
  measureStartSec: number;
  measureEndSec: number;
  sampleRate: number;
  currentFrame: number;
  minRebuildFrame: number;
  lookaheadPoints?: readonly BarulhoLookaheadPoint[];
  coveredTrackIds: Set<number>;
  getTrackSlot: (trackId: number) => number;
  stagedEvents: number[];
}): void {
  const { seqId, measureStartSec, measureEndSec, sampleRate, currentFrame, minRebuildFrame, lookaheadPoints, coveredTrackIds, getTrackSlot, stagedEvents } = params;
  if (!lookaheadPoints || lookaheadPoints.length === 0) return;
  const cuts = planApitoBreathCutsFromLookahead(lookaheadPoints);
  let added = 0;
  for (let i = 0; i < cuts.length; i++) {
    const cut = cuts[i];
    if (!coveredTrackIds.has(cut.trackId)) continue;
    if (cut.fadeStartSec < measureStartSec - 1e-6 || cut.fadeStartSec >= measureEndSec - 1e-6) continue;
    const rawFrame = Math.round(cut.fadeStartSec * sampleRate);
    if (minRebuildFrame > 0 && rawFrame < minRebuildFrame) continue;
    if (minRebuildFrame <= 0 && rawFrame < currentFrame - Math.round(0.015 * sampleRate)) continue;
    const triggerFrame = Math.max(currentFrame, rawFrame);
    const slot = getTrackSlot(cut.trackId);
    const flags = packWorkletEventFlags(seqId, CHOKE_NONE, VOICE_CLASS_GENERIC, false, false, BARULHO_OP_STOP_DOT, 0);
    stagedEvents.push(triggerFrame, cut.trackId, slot, 0, 0, 1.0, cut.fadeDurationSec, 1.0, flags);
    added++;
  }
  if (added > 0 && stagedEvents.length > 18) {
    const stride = 9, n = stagedEvents.length / stride;
    const order = Array.from({ length: n }, (_, idx) => idx).sort((a, b) => stagedEvents[a * stride] - stagedEvents[b * stride]);
    const copy = stagedEvents.slice();
    for (let idx = 0; idx < n; idx++) {
      const src = order[idx] * stride, dst = idx * stride;
      for (let k = 0; k < stride; k++) stagedEvents[dst + k] = copy[src + k];
    }
  }
}

export function resolveFallbackApitoHoldSpec(
  activeSteps: readonly any[] | undefined,
  startStepIdx: number,
  stepDurationSec: number
): { holdDurSec: number; fadeOutSec: number } {
  const safeStep = Math.max(0.030, Number.isFinite(stepDurationSec) ? stepDurationSec : 0.150);
  if (!Array.isArray(activeSteps) || activeSteps.length === 0) {
    return { holdDurSec: Math.max(0.020, safeStep - APITO_NATURAL_STOP_FADE_SEC), fadeOutSec: APITO_NATURAL_STOP_FADE_SEC };
  }
  const len = activeSteps.length;
  let elapsedSteps = 1;
  for (let offset = 1; offset < len; offset++) {
    const raw = activeSteps[(startStepIdx + offset) % len];
    const first = Array.isArray(raw) ? String(raw[0] ?? '0').trim() : String(raw ?? '0').trim();
    const second = Array.isArray(raw) ? String(raw[1] ?? '0').trim() : '0';
    if ((!first || first === '0') && (!second || second === '0')) {
      elapsedSteps++;
      continue;
    }
    if (first === 'l') {
      elapsedSteps++;
      if (isApitoAttackSymbol(second)) {
        const spec = computeApitoPreCutSpec(0, (elapsedSteps - 0.5) * safeStep, safeStep * 0.5);
        return { holdDurSec: spec.fadeStartSec, fadeOutSec: spec.fadeDurationSec };
      }
      continue;
    }
    if (first === '/' || first === '.') {
      return { holdDurSec: Math.max(0.008, elapsedSteps * safeStep), fadeOutSec: APITO_NATURAL_STOP_FADE_SEC };
    }
    if (isApitoAttackSymbol(first)) {
      const spec = computeApitoPreCutSpec(0, elapsedSteps * safeStep, safeStep);
      return { holdDurSec: spec.fadeStartSec, fadeOutSec: spec.fadeDurationSec };
    }
    break;
  }
  return { holdDurSec: Math.max(0.020, elapsedSteps * safeStep - APITO_TONGUE_FADE_SEC), fadeOutSec: APITO_NATURAL_STOP_FADE_SEC };
}
