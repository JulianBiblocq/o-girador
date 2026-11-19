import type { Pattern, Track, GlobalSwing } from '../types';
import { useBalancoStore } from '../stores/useBalancoStore';
import { getLiveBalancoMorphScaleAtTime } from '../audio/groove/liveBalancoMorph';
import { getRodaMeasureGeometry, resolveActiveBeatResolutions } from './rodaTimeSigGeometry';

export interface StepBalancoParams {
  stepIdx: number;
  steps: number;
  beatResolutions?: number[];
  timeSig?: string;
  track?: Pick<Track, 'balancoPresetId' | 'balancoAmount' | 'swingIntensity'> | null;
  pattern?: Pick<Pattern, 'balancoPresetId' | 'balancoAmount' | 'swingIntensity'> | null;
  globalSwing?: GlobalSwing | null;
}

function inferTimeSigFromSteps(steps: number, explicitSig?: string): string {
  if (explicitSig) return explicitSig;
  if (steps === 6) return '6/8';
  if (steps === 8) return '2/4';
  if (steps === 9) return '9/8';
  if (steps === 12) return '3/4';
  return '4/4';
}

function resolveBeatPosition(stepIdx: number, steps: number, beatResolutions?: number[], timeSig?: string): { posInGroup: number; beatRes: number; isTernary: boolean } {
  const sig = inferTimeSigFromSteps(steps, timeSig);
  const resList = beatResolutions && beatResolutions.length > 0
    ? beatResolutions
    : resolveActiveBeatResolutions(sig, { steps, beatResolutions });

  let accumulated = 0;
  for (let b = 0; b < resList.length; b++) {
    const res = Math.max(1, resList[b] || 4);
    if (stepIdx >= accumulated && stepIdx < accumulated + res) {
      const posInBeat = stepIdx - accumulated;
      const isTernary = res === 3 || res === 6;
      if (isTernary || posInBeat === 0 && res === 1) return { posInGroup: posInBeat, beatRes: res, isTernary };
      if (res === 4) return { posInGroup: posInBeat, beatRes: res, isTernary: false };
      if (res === 2) return { posInGroup: posInBeat * 2, beatRes: res, isTernary: false };
      return { posInGroup: Math.min(3, Math.floor((posInBeat * 4) / res)), beatRes: res, isTernary: false };
    }
    accumulated += res;
  }
  const fallbackRes = Math.max(1, resList[0] || 4);
  const pos = Math.max(0, stepIdx - accumulated) % fallbackRes;
  return { posInGroup: pos, beatRes: fallbackRes, isTernary: fallbackRes === 3 || fallbackRes === 6 };
}

export function computeStepBalancoPercent({
  stepIdx, steps, beatResolutions, timeSig, track, pattern, globalSwing,
}: StepBalancoParams): number {
  if (globalSwing?.mode === 'off') return 0;

  const { posInGroup, isTernary } = resolveBeatPosition(stepIdx, steps, beatResolutions, timeSig);
  if (isTernary) return 0;

  const trackAmount = track?.balancoAmount ?? track?.swingIntensity ?? 100;
  const patternAmount = pattern?.balancoAmount ?? pattern?.swingIntensity ?? 100;
  const effectiveIntensity = ((globalSwing?.swingIntensity ?? 100) / 100) * (trackAmount / 100) * (patternAmount / 100);

  const patternPresetId = pattern?.balancoPresetId;
  const trackPresetId = track?.balancoPresetId;

  if (
    !patternPresetId &&
    !trackPresetId &&
    (globalSwing?.mode === 'custom' ||
      (globalSwing?.mode === 'maracatu' && Array.isArray(globalSwing.customOffsets) && globalSwing.customOffsets.length >= 4))
  ) {
    const customOffsets = globalSwing.customOffsets ?? [0, 8, -29, -58];
    return (customOffsets[posInGroup % customOffsets.length] ?? 0) * effectiveIntensity;
  }

  const effectivePresetId = patternPresetId || trackPresetId || (globalSwing?.mode === 'maracatu' ? 'maracatu-trad' : undefined);
  const resolvedPreset = useBalancoStore.getState().resolvePreset(effectivePresetId);
  const offsets = resolvedPreset?.offsets ?? [0, 8, -29, -58];
  return (offsets[posInGroup % offsets.length] ?? 0) * effectiveIntensity;
}

export interface BalancoOffsetParams extends StepBalancoParams {
  bpm: number;
  isPreRoll?: boolean;
  baseStepAudioSec?: number;
  ignoreLiveMorph?: boolean;
}

export function getBalancoOffsetSec({
  stepIdx, steps, beatResolutions, timeSig, track, pattern, globalSwing,
  bpm, isPreRoll = false, baseStepAudioSec, ignoreLiveMorph = false,
}: BalancoOffsetParams): number {
  if (!isPreRoll && stepIdx === 0) return 0;
  if (!bpm || bpm <= 0) return 0;

  const morphScale = ignoreLiveMorph ? 1.0 : getLiveBalancoMorphScaleAtTime(baseStepAudioSec);
  if (morphScale <= 0) return 0;

  const percent = computeStepBalancoPercent({ stepIdx, steps, beatResolutions, timeSig, track, pattern, globalSwing });
  if (percent === 0) return 0;

  const sig = inferTimeSigFromSteps(steps, timeSig);
  const geom = getRodaMeasureGeometry(sig);
  const { beatRes } = resolveBeatPosition(stepIdx, steps, beatResolutions, sig);
  const beatDurationSec = geom.isCompound ? 90 / bpm : 60 / bpm;
  const stepDurationSec = beatDurationSec / Math.max(1, beatRes);
  return (percent / 100) * stepDurationSec * 0.5 * morphScale;
}
