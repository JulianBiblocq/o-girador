/**
 * percussionSwingHelper.ts — Calcul du Balanço de note & résolution de motif esclave lié (< 85 lignes).
 * - Hérite `measureAssignments` du maître/dossier lié via `resolveActivePattern` (Meião, Repique, Tarol...).
 * - Calcule la sous-position réelle dans le temps depuis `activePattern.beatResolutions` (sans biais post-triolet).
 * - Verrouille `swingJitter = 0` sur `circleStepIdx === 0` et applique `balancoAdherence` (`0.95..1.05`).
 */

import { Track, Pattern, GlobalSwing } from '../../types';
import { useBalancoStore } from '../../stores/useBalancoStore';
import { resolveActivePattern } from '../../workers/compiler/patternResolver';

export interface NoteSwingParams {
  activePattern: Pattern | null;
  liveTrack: Track;
  circleStepIdx: number;
  isTuplet: boolean;
  swingJitter: number;
  globalMode: string;
  globalSwing: GlobalSwing;
  stepDurationSec: number;
  balancoAdherence?: number;
}

export function resolveStepPosInBeat(circleStepIdx: number, activePattern: Pattern | null): number {
  const resArr = activePattern?.beatResolutions;
  if (!resArr || resArr.length === 0) return circleStepIdx % 4;
  let cursor = 0;
  for (let b = 0; b < resArr.length; b++) {
    const res = resArr[b] || 4;
    if (circleStepIdx < cursor + res) {
      const posInBeat = circleStepIdx - cursor;
      if (res === 4) return posInBeat;
      if (res === 2) return posInBeat * 2;
      if (res === 1) return 0;
      return Math.min(3, Math.floor((posInBeat * 4) / res));
    }
    cursor += res;
  }
  return (circleStepIdx - cursor) % 4;
}

export function computePercussionNoteSwing(p: NoteSwingParams): number {
  const { activePattern, liveTrack, circleStepIdx, isTuplet, swingJitter, globalMode, globalSwing, stepDurationSec } = p;
  if (globalMode === 'off') return 0;
  const effectiveJitter = circleStepIdx === 0 ? 0 : swingJitter;
  if (isTuplet) return effectiveJitter;

  const patternPresetId = activePattern?.balancoPresetId;
  const trackPresetId = liveTrack.balancoPresetId;
  const effectivePresetId = patternPresetId || trackPresetId || (globalMode === 'maracatu' ? 'maracatu-trad' : undefined);
  const resolvedPreset = useBalancoStore.getState().resolvePreset(effectivePresetId);

  const trackBalancoAmount = liveTrack.balancoAmount ?? liveTrack.swingIntensity ?? 100;
  const patternBalancoAmount = activePattern?.balancoAmount ?? activePattern?.swingIntensity ?? 100;
  const totalBalancoMultiplier = (trackBalancoAmount / 100) * (patternBalancoAmount / 100);
  const globalIntensity = (globalSwing.swingIntensity ?? 100) / 100;
  const adherence = p.balancoAdherence ?? 1.0;

  const stepPosInGroup = resolveStepPosInBeat(circleStepIdx, activePattern);
  let baseSwingOffset = 0;
  if (globalMode === 'custom' && !patternPresetId && !trackPresetId) {
    const customOffsetPct = globalSwing.customOffsets[stepPosInGroup] || 0;
    baseSwingOffset = (customOffsetPct / 100) * stepDurationSec * 0.5 * globalIntensity;
  } else {
    const offsets = resolvedPreset.offsets;
    const offsetPct = offsets[stepPosInGroup % offsets.length] || 0;
    baseSwingOffset = (offsetPct / 100) * stepDurationSec * 0.5 * globalIntensity;
  }
  return (baseSwingOffset * totalBalancoMultiplier * adherence) + effectiveJitter;
}

export function resolveActivePatternForMeasure(
  liveTrack: Track,
  tracks: Track[],
  measureIdx: number,
  soloId: number | null
): Pattern | null {
  return resolveActivePattern(liveTrack, tracks as any[], measureIdx, soloId !== null, soloId);
}
