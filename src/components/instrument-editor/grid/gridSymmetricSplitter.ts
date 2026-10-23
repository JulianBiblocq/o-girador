/**
 * Utilitaire de découpage symétrique de mesure en 2 moitiés égales (< 50 lignes).
 */

export interface HalfMeasureSplit<T> {
  firstHalf: T[];
  secondHalf: T[];
  isSymmetric: boolean;
}

export function splitIntoHalfMeasures<T>(beats: T[]): HalfMeasureSplit<T> {
  const count = beats.length;
  if (count >= 2 && count % 2 === 0) {
    const half = count / 2;
    return {
      firstHalf: beats.slice(0, half),
      secondHalf: beats.slice(half),
      isSymmetric: true,
    };
  }
  return {
    firstHalf: beats,
    secondHalf: [],
    isSymmetric: false,
  };
}
