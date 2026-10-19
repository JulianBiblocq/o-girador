/**
 * vocalVariantSelector.ts
 * Sélection automatique de la déclinaison vocale optimale (anti-distorsion GrainPlayer)
 * et calcul des compensations résiduelles de vitesse et hauteur.
 * Plafond strict : < 95 lignes.
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
  pitchShiftSemitones: number;
  residualPlaybackRate: number;
  residualDetuneCents: number;
}

export const parseVariantKey = (key: string): { speedRatio: number; pitchShiftSemitones: number } => {
  const spdMatch = key.match(/spd(\d+)/i);
  const pitMatch = key.match(/pit([+-]?\d+)/i);
  const speedRatio = spdMatch ? parseInt(spdMatch[1], 10) / 100 : 1.0;
  const pitchShiftSemitones = pitMatch ? parseInt(pitMatch[1], 10) : 0;
  return { speedRatio, pitchShiftSemitones };
};

export const selectBestVocalVariant = (
  availableVariantKeys: string[],
  currentBpm: number,
  baseSampleBpm: number,
  targetTransposeSemitones: number = 0
): VariantSelectionResult => {
  if (!availableVariantKeys || availableVariantKeys.length === 0) {
    const rawRate = baseSampleBpm > 0 ? currentBpm / baseSampleBpm : 1.0;
    return {
      bestKey: 'spd100_pit0',
      speedRatio: 1.0,
      pitchShiftSemitones: 0,
      residualPlaybackRate: rawRate,
      residualDetuneCents: targetTransposeSemitones * 100,
    };
  }

  const targetSpeedRatio = baseSampleBpm > 0 ? currentBpm / baseSampleBpm : 1.0;

  let bestKey = availableVariantKeys[0];
  let minScore = Infinity;
  let bestSpeed = 1.0;
  let bestPitch = 0;

  for (const k of availableVariantKeys) {
    const { speedRatio, pitchShiftSemitones } = parseVariantKey(k);
    // Score pondéré : 1 unité d'étirement ~ 12 demi-tons (1 octave)
    const speedDist = Math.abs(speedRatio - targetSpeedRatio) * 12;
    const pitchDist = Math.abs(pitchShiftSemitones - targetTransposeSemitones);
    const score = speedDist + pitchDist;

    if (score < minScore) {
      minScore = score;
      bestKey = k;
      bestSpeed = speedRatio;
      bestPitch = pitchShiftSemitones;
    }
  }

  // Sécurité mathématique : calcul résiduel strict sur la variante choisie
  const variantNativeBpm = (baseSampleBpm || 100) * bestSpeed;
  const residualPlaybackRate = variantNativeBpm > 0 ? currentBpm / variantNativeBpm : 1.0;
  const residualSemitones = targetTransposeSemitones - bestPitch;
  const residualDetuneCents = residualSemitones * 100;

  return {
    bestKey,
    speedRatio: bestSpeed,
    pitchShiftSemitones: bestPitch,
    residualPlaybackRate: Number.isFinite(residualPlaybackRate) && residualPlaybackRate > 0 ? residualPlaybackRate : 1.0,
    residualDetuneCents,
  };
};
