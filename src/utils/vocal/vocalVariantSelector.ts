/**
 * vocalVariantSelector.ts
 * Sélection automatique de la déclinaison vocale optimale (`75%`, `88%`, `100%`)
 * selon les seuils (< 81% -> 75% ; 81%..94% -> 88% ; >= 94% -> 100%)
 * et calcul exact de `playbackRate = currentBpm / variantRecordedBpm` (< 95 lignes).
 */

export interface VocalVariantMeta {
  key: string;
  speedRatio: number;
  pitchShiftSemitones: number;
  trimStartSec?: number;
  trimEndSec?: number;
}

export interface VariantSelectionResult {
  bestKey: string;
  speedRatio: number;
  variantRecordedBpm: number;
  pitchShiftSemitones: number;
  residualPlaybackRate: number;
  residualDetuneCents: number;
}

export const resolvePreferredSpeedTierRatio = (speedRatio: number): number => {
  if (speedRatio < 0.81) return 0.75;
  if (speedRatio < 0.94) return 0.88;
  return 1.0;
};

export const parseVariantKey = (key: string): { speedRatio: number; pitchShiftSemitones: number } => {
  const spdMatch = key.match(/spd(\d+)/i);
  const pitMatch = key.match(/pit([+-]?\d+)/i);
  const speedRatio = spdMatch ? parseInt(spdMatch[1], 10) / 100 : (/^(75|88|100)$/.test(key) ? parseInt(key, 10) / 100 : 1.0);
  const pitchShiftSemitones = pitMatch ? parseInt(pitMatch[1], 10) : 0;
  return { speedRatio, pitchShiftSemitones };
};

export const selectBestVocalVariant = (
  availableVariantKeys: string[],
  currentBpm: number,
  baseSampleBpm: number,
  targetTransposeSemitones: number = 0
): VariantSelectionResult => {
  const recordedBpm = baseSampleBpm > 0 ? baseSampleBpm : 100;
  if (!availableVariantKeys || availableVariantKeys.length === 0) {
    const rawRate = currentBpm / recordedBpm;
    return {
      bestKey: 'spd100_pit0',
      speedRatio: 1.0,
      variantRecordedBpm: recordedBpm,
      pitchShiftSemitones: 0,
      residualPlaybackRate: rawRate,
      residualDetuneCents: targetTransposeSemitones * 100,
    };
  }

  const targetSpeedRatio = currentBpm / recordedBpm;
  const preferredTierRatio = resolvePreferredSpeedTierRatio(targetSpeedRatio);

  let bestKey = availableVariantKeys[0];
  let minScore = Infinity;
  let bestSpeed = 1.0;
  let bestPitch = 0;

  for (const k of availableVariantKeys) {
    const { speedRatio, pitchShiftSemitones } = parseVariantKey(k);
    const tierDist = Math.abs(speedRatio - preferredTierRatio) < 0.015 ? 0 : Math.abs(speedRatio - preferredTierRatio) * 15;
    const rawSpeedDist = Math.abs(speedRatio - targetSpeedRatio) * 4;
    const pitchDist = Math.abs(pitchShiftSemitones - targetTransposeSemitones) * 2.5;
    const score = tierDist + rawSpeedDist + pitchDist;

    if (score < minScore) {
      minScore = score;
      bestKey = k;
      bestSpeed = speedRatio;
      bestPitch = pitchShiftSemitones;
    }
  }

  const variantRecordedBpm = recordedBpm * bestSpeed;
  const residualPlaybackRate = variantRecordedBpm > 0 ? currentBpm / variantRecordedBpm : 1.0;
  const residualSemitones = targetTransposeSemitones - bestPitch;
  const residualDetuneCents = residualSemitones * 100;

  return {
    bestKey,
    speedRatio: bestSpeed,
    variantRecordedBpm,
    pitchShiftSemitones: bestPitch,
    residualPlaybackRate: Number.isFinite(residualPlaybackRate) && residualPlaybackRate > 0 ? residualPlaybackRate : 1.0,
    residualDetuneCents,
  };
};
