/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface HitRecord {
  timeSec: number;
}

/**
 * Analyse une série de frappes temporelles et extrait les ratios de Balanço (offsets)
 * pour chacune des 4 doubles-croches de la pulsation.
 * Utilise la médiane pour garantir une robustesse statistique face aux ratés et hésitations.
 */
export function extractBalancoOffsets(
  hits: HitRecord[],
  bpm: number,
  recordingStartTimeSec: number
): [number, number, number, number] {
  const safeBpm = bpm > 0 ? bpm : 100;
  const stepDuration = (60 / safeBpm) / 4; // Durée théorique d'une double croche en secondes
  const buckets: number[][] = [[], [], [], []];

  hits.forEach((hit) => {
    const elapsed = hit.timeSec - recordingStartTimeSec;
    if (elapsed < 0) return;

    // Détermination du pas théorique le plus proche
    const stepFloat = elapsed / stepDuration;
    const nearestStepIdx = Math.round(stepFloat);
    const posInGroup = ((nearestStepIdx % 4) + 4) % 4; // 0, 1, 2 ou 3

    const theoreticalTime = nearestStepIdx * stepDuration;
    const deltaSec = elapsed - theoreticalTime;

    // Conversion en ratio d'offset (échelle useAudioSync : stepDuration * 0.5 = 100%)
    const offsetPct = (deltaSec / (stepDuration * 0.5)) * 100;
    if (Math.abs(offsetPct) <= 100) {
      buckets[posInGroup].push(offsetPct);
    }
  });

  // Médiane robuste pour éliminer les ratés et hésitations
  const getMedian = (values: number[]): number => {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  };

  // 1. Récupération des 4 médianes brutes
  const raw0 = getMedian(buckets[0]);
  const raw1 = getMedian(buckets[1]);
  const raw2 = getMedian(buckets[2]);
  const raw3 = getMedian(buckets[3]);

  // 2. Normalisation par rapport au pas 0 (latence de référence absorbée)
  const norm1 = raw1 - raw0;
  const norm2 = raw2 - raw0;
  const norm3 = raw3 - raw0;

  // 3. Renvoi du tuple clampé entre -100 et +100 et arrondi
  return [
    0,
    Math.round(Math.max(-100, Math.min(100, norm1))),
    Math.round(Math.max(-100, Math.min(100, norm2))),
    Math.round(Math.max(-100, Math.min(100, norm3)))
  ];
}
