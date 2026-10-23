
/**
 * Calcule le BPM effectif pour la mesure courante (ou mesure 0 par défaut).
 */
export function getEffectiveBpm(
  bpm: number,
  measureBpms?: number[] | null,
  currentMeasure: number = 0
): number {
  if (measureBpms && Array.isArray(measureBpms) && measureBpms.length > 0) {
    const m = measureBpms[currentMeasure];
    if (typeof m === 'number' && m > 0) {
      return Math.round(m);
    }
  }
  return Math.round(bpm || 90);
}

/**
 * Applique un delta BPM sur le tempo global et toutes les mesures valides (borné entre minBpm et maxBpm).
 * Garde-fou : Si une entrée de measureBpms vaut 0 ou undefined, elle conserve sa valeur 0
 * pour continuer à hériter dynamiquement du tempo global sans forcer un palier à 30 BPM.
 */
export function applyBpmDelta(
  currentBpm: number,
  measureBpms: number[],
  delta: number,
  minBpm: number = 30,
  maxBpm: number = 240
): { nextBpm: number; nextMeasureBpms: number[] } {
  const nextBpm = Math.max(minBpm, Math.min(maxBpm, Math.round(currentBpm + delta)));
  const effectiveDelta = nextBpm - currentBpm;

  const nextMeasureBpms = (measureBpms && Array.isArray(measureBpms))
    ? measureBpms.map((m) => {
        if (typeof m === 'number' && m > 0) {
          return Math.max(minBpm, Math.min(maxBpm, Math.round(m + effectiveDelta)));
        }
        return 0;
      })
    : [];

  return { nextBpm, nextMeasureBpms };
}
