import type { Pattern, Track, GlobalSwing } from '../types';
import { useBalancoStore } from '../stores/useBalancoStore';
import { getLiveBalancoMorphScaleAtTime } from '../audio/groove/liveBalancoMorph';

export interface StepBalancoParams {
  stepIdx: number;
  steps: number;
  beatResolutions?: number[];
  track?: Pick<Track, 'balancoPresetId' | 'balancoAmount' | 'swingIntensity'> | null;
  pattern?: Pick<Pattern, 'balancoPresetId' | 'balancoAmount' | 'swingIntensity'> | null;
  globalSwing?: GlobalSwing | null;
}

/**
 * Calcule le pourcentage de décalage de balanço pour un pas précis,
 * en respectant la hiérarchie : Pattern > Track > Global Swing.
 */
export function computeStepBalancoPercent({
  stepIdx,
  steps,
  beatResolutions,
  track,
  pattern,
  globalSwing,
}: StepBalancoParams): number {
  if (globalSwing?.mode === 'off') return 0;

  let posInGroup = 0;
  if (beatResolutions && beatResolutions.length > 0) {
    let accumulated = 0;
    for (const res of beatResolutions) {
      if (stepIdx >= accumulated && stepIdx < accumulated + res) {
        if (res === 3 || res === 6) return 0;
        posInGroup = stepIdx - accumulated;
        break;
      }
      accumulated += res;
    }
  } else {
    const posInBeat = ((stepIdx / (steps / 4)) % 1) * 4;
    posInGroup = Math.round(posInBeat) % 4;
  }

  const trackAmount = track?.balancoAmount !== undefined
    ? track.balancoAmount
    : (track?.swingIntensity !== undefined ? track.swingIntensity : 100);
  const patternAmount = pattern?.balancoAmount !== undefined
    ? pattern.balancoAmount
    : (pattern?.swingIntensity !== undefined ? pattern.swingIntensity : 100);
  const totalMultiplier = (trackAmount / 100) * (patternAmount / 100);

  const globalIntensity = (globalSwing?.swingIntensity !== undefined ? globalSwing.swingIntensity : 100) / 100;
  const effectiveIntensity = globalIntensity * totalMultiplier;

  const patternPresetId = pattern?.balancoPresetId;
  const trackPresetId = track?.balancoPresetId;

  if (
    !patternPresetId &&
    !trackPresetId &&
    (globalSwing?.mode === 'custom' ||
      (globalSwing?.mode === 'maracatu' && Array.isArray(globalSwing.customOffsets) && globalSwing.customOffsets.length >= 4))
  ) {
    const customOffsets = globalSwing.customOffsets ?? [0, 8, -29, -58];
    const offsetPct = customOffsets[posInGroup % customOffsets.length] ?? 0;
    return offsetPct * effectiveIntensity;
  }

  const effectivePresetId = patternPresetId || trackPresetId || (globalSwing?.mode === 'maracatu' ? 'maracatu-trad' : undefined);
  const resolvedPreset = useBalancoStore.getState().resolvePreset(effectivePresetId);
  const offsets = resolvedPreset?.offsets ?? [0, 8, -29, -58];
  const offsetPct = offsets[posInGroup % offsets.length] ?? 0;

  return offsetPct * effectiveIntensity;
}

export interface BalancoOffsetParams extends StepBalancoParams {
  bpm: number;
  isPreRoll?: boolean;
  baseStepAudioSec?: number;
  ignoreLiveMorph?: boolean;
}

export function getBalancoOffsetSec({
  stepIdx,
  steps,
  beatResolutions,
  track,
  pattern,
  globalSwing,
  bpm,
  isPreRoll = false,
  baseStepAudioSec,
  ignoreLiveMorph = false,
}: BalancoOffsetParams): number {
  if (!isPreRoll && stepIdx === 0) return 0;
  if (!bpm || bpm <= 0) return 0;

  const morphScale = ignoreLiveMorph ? 1.0 : getLiveBalancoMorphScaleAtTime(baseStepAudioSec);
  if (morphScale <= 0) return 0;

  const percent = computeStepBalancoPercent({
    stepIdx,
    steps,
    beatResolutions,
    track,
    pattern,
    globalSwing,
  });

  if (percent === 0) return 0;

  const numBeats = 4;
  const stepDurationSec = (60 / bpm) / (steps / numBeats);
  return (percent / 100) * stepDurationSec * 0.5 * morphScale;
}
