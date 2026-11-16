/**
 * Contrat acoustique transversal O Girador / futur Afinador (`referencePitchHz`, défaut 440 Hz).
 */

export const DEFAULT_REFERENCE_PITCH_HZ = 440;
export const MIN_REFERENCE_PITCH_HZ = 415;
export const MAX_REFERENCE_PITCH_HZ = 466;

export function sanitizePitchHz(val?: unknown): number {
  if (val === undefined || val === null || val === '' || typeof val === 'boolean') {
    return DEFAULT_REFERENCE_PITCH_HZ;
  }
  const num = Number(val);
  if (!Number.isFinite(num) || num < MIN_REFERENCE_PITCH_HZ || num > MAX_REFERENCE_PITCH_HZ) {
    return DEFAULT_REFERENCE_PITCH_HZ;
  }
  return Math.round(num * 100) / 100;
}
