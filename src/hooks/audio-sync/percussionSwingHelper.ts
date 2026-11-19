/**
 * percussionSwingHelper.ts — Calcul du Balanço de note & résolution de motif esclave lié (< 95 lignes).
 * - Hérite `measureAssignments` du maître/dossier lié via `resolveActivePattern` (Meião, Repique, Tarol...).
 * - Applique `getLiveBalancoMorphScaleAtTime(baseStepAudioSec)` et verrouille `s === 0` ternaire à `0 %`.
 */

import { Track, Pattern, GlobalSwing } from '../../types';
import { useBalancoStore } from '../../stores/useBalancoStore';
import { resolveActivePattern } from '../../workers/compiler/patternResolver';
import { getLiveBalancoMorphScaleAtTime } from '../../audio/groove/liveBalancoMorph';
import { resolveActiveBeatResolutions } from '../../utils/rodaTimeSigGeometry';

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
  baseStepAudioSec?: number;
  timeSig?: string;
}

export function resolveStepBeatInfo(
  circleStepIdx: number,
  activePattern: Pattern | null,
  timeSig?: string
): { posInGroup: number; posInBeat: number; beatRes: number; isTernary: boolean } {
  const resArr = resolveActiveBeatResolutions(timeSig || (activePattern as any)?.timeSignature || '4/4', activePattern);
  let cursor = 0;
  for (let b = 0; b < resArr.length; b++) {
    const res = Math.max(1, resArr[b] || 4);
    if (circleStepIdx < cursor + res) {
      const posInBeat = circleStepIdx - cursor;
      const isTernary = res === 3 || res === 6;
      if (isTernary) return { posInGroup: posInBeat, posInBeat, beatRes: res, isTernary: true };
      if (res === 4) return { posInGroup: posInBeat, posInBeat, beatRes: res, isTernary: false };
      if (res === 2) return { posInGroup: posInBeat * 2, posInBeat, beatRes: res, isTernary: false };
      if (res === 1) return { posInGroup: 0, posInBeat: 0, beatRes: 1, isTernary: false };
      return { posInGroup: Math.min(3, Math.floor((posInBeat * 4) / res)), posInBeat, beatRes: res, isTernary: false };
    }
    cursor += res;
  }
  const defRes = Math.max(1, resArr[0] || 4);
  const posInBeat = Math.max(0, circleStepIdx - cursor) % defRes;
  return { posInGroup: posInBeat % 4, posInBeat, beatRes: defRes, isTernary: defRes === 3 || defRes === 6 };
}

export function resolveStepPosInBeat(circleStepIdx: number, activePattern: Pattern | null, timeSig?: string): number {
  return resolveStepBeatInfo(circleStepIdx, activePattern, timeSig).posInGroup;
}

export function computePercussionNoteSwing(p: NoteSwingParams): number {
  const { activePattern, liveTrack, circleStepIdx, isTuplet, swingJitter, globalMode, globalSwing, stepDurationSec, timeSig } = p;
  if (globalMode === 'off') return 0;
  const morphScale = getLiveBalancoMorphScaleAtTime(p.baseStepAudioSec);
  if (morphScale <= 0) return 0;

  const { posInGroup, posInBeat, isTernary } = resolveStepBeatInfo(circleStepIdx, activePattern, timeSig);
  if ((isTernary || isTuplet) && posInBeat === 0) return 0;

  const effectiveJitter = circleStepIdx === 0 ? 0 : swingJitter * morphScale;
  if (isTuplet || isTernary) return effectiveJitter;

  const patternPresetId = activePattern?.balancoPresetId;
  const trackPresetId = liveTrack.balancoPresetId;
  const effectivePresetId = patternPresetId || trackPresetId || (globalMode === 'maracatu' ? 'maracatu-trad' : undefined);
  const resolvedPreset = useBalancoStore.getState().resolvePreset(effectivePresetId);

  const trackBalancoAmount = liveTrack.balancoAmount ?? liveTrack.swingIntensity ?? 100;
  const patternBalancoAmount = activePattern?.balancoAmount ?? activePattern?.swingIntensity ?? 100;
  const totalBalancoMultiplier = (trackBalancoAmount / 100) * (patternBalancoAmount / 100);
  const globalIntensity = (globalSwing.swingIntensity ?? 100) / 100;
  const adherence = p.balancoAdherence ?? 1.0;

  let baseSwingOffset = 0;
  if (globalMode === 'custom' && !patternPresetId && !trackPresetId) {
    const customOffsetPct = globalSwing.customOffsets[posInGroup] || 0;
    baseSwingOffset = (customOffsetPct / 100) * stepDurationSec * 0.5 * globalIntensity;
  } else {
    const offsets = resolvedPreset.offsets;
    const offsetPct = offsets[posInGroup % offsets.length] || 0;
    baseSwingOffset = (offsetPct / 100) * stepDurationSec * 0.5 * globalIntensity;
  }
  return (baseSwingOffset * totalBalancoMultiplier * adherence * morphScale) + effectiveJitter;
}

export function resolveActivePatternForMeasure(
  liveTrack: Track, tracks: Track[], measureIdx: number, soloId: number | null
): Pattern | null {
  return resolveActivePattern(liveTrack, tracks as any[], measureIdx, soloId !== null, soloId);
}
