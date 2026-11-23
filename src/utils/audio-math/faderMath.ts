/**
 * Audio Taper & Fader Curve Math Utilities
 */

export const UNITY_GAIN_FADER_POSITION = 75;
export const CUTOFF_FADER_POSITION = 3;
export const CURRENT_AUDIO_SCALE_VERSION = 2;

/**
 * Assainit une position brute de fader en protégeant contre undefined, null et NaN
 * tout en conservant scrupuleusement l'échelle 0..100, la finesse décimale et le silence <= 3.
 */
export function sanitizeFaderPosition(val: unknown): number {
  if (val === undefined || val === null || (typeof val === 'number' && isNaN(val))) {
    return UNITY_GAIN_FADER_POSITION; // 75 = 0.0 dB
  }
  const num = Number(val);
  if (isNaN(num)) return UNITY_GAIN_FADER_POSITION;
  return Math.max(0, Math.min(100, num));
}

/**
 * Normalise la valeur de volume d'un preset/piste lors du chargement.
 * En v1 (!isAudioV2), convertit l'échelle linéaire 0..100 (100 = 0 dB) ou gain 0..1.5 vers la courbe fader v2 (75 = 0 dB).
 */
export function normalizeToFaderPosition(val: unknown, isAudioV2 = false): number {
  if (val === undefined || val === null) {
    return UNITY_GAIN_FADER_POSITION; // 75 = 0.0 dB
  }
  const num = Number(val);
  if (isNaN(num)) return UNITY_GAIN_FADER_POSITION;
  if (num <= 0) return 0;
  if (!isAudioV2) {
    if (num <= 1.5) return gainToFaderPosition(num);
    return gainToFaderPosition(Math.min(100, num) / 100);
  }
  return Math.max(0, Math.min(100, num));
}

/**
 * Assainit et borne le volume Master strictement en décibels (dB), sans jamais retomber sur 75 d'échelle piste.
 */
export function sanitizeMasterVolumeDb(val: unknown, isAudioV2 = true): number {
  if (val === undefined || val === null) return 0;
  const num = Number(val);
  if (Number.isNaN(num)) return 0;
  if (num === -Infinity || num <= -60) return -Infinity;
  if (num > 12) {
    const faderPos = isAudioV2 ? Math.min(100, num) : normalizeToFaderPosition(num, false);
    return faderPositionToDb(faderPos);
  }
  return Math.max(-60, Math.min(12, num));
}

/**
 * Convertit une position de fader (0 à 100) en décibels (dB).
 */
export function faderPositionToDb(position: number): number {
  const pos = sanitizeFaderPosition(position);
  if (pos <= CUTOFF_FADER_POSITION) {
    return -Infinity;
  }
  if (pos <= 25) {
    return -60.0 + ((pos - 3) / 22) * 36.0;
  }
  if (pos <= 50) {
    return -24.0 + ((pos - 25) / 25) * 14.0;
  }
  if (pos <= 75) {
    return -10.0 + ((pos - 50) / 25) * 10.0;
  }
  return ((pos - 75) / 25) * 6.0;
}

/**
 * Convertit une position de fader (0 à 100) en gain linéaire (amplitude).
 */
export function faderPositionToGain(position: number): number {
  const pos = sanitizeFaderPosition(position);
  if (pos <= CUTOFF_FADER_POSITION) {
    return 0.0;
  }
  const db = faderPositionToDb(pos);
  return Math.pow(10, db / 20);
}

/**
 * Convertit une valeur en décibels (dB) en position de fader (0 à 100).
 */
export function dbToFaderPosition(db: number): number {
  if (!Number.isFinite(db) || db <= -60) {
    return 0;
  }
  if (db <= -24.0) {
    const pos = 3 + ((db - (-60.0)) / 36.0) * 22;
    return Math.max(0, Math.min(25, pos));
  }
  if (db <= -10.0) {
    const pos = 25 + ((db - (-24.0)) / 14.0) * 25;
    return Math.max(25, Math.min(50, pos));
  }
  if (db <= 0.0) {
    const pos = 50 + ((db - (-10.0)) / 10.0) * 25;
    return Math.max(50, Math.min(75, pos));
  }
  if (db <= 6.0) {
    const pos = 75 + (db / 6.0) * 25;
    return Math.max(75, Math.min(100, pos));
  }
  return 100;
}

/**
 * Convertit un gain linéaire en position de fader (0 à 100).
 */
export function gainToFaderPosition(gain: number): number {
  if (!Number.isFinite(gain) || gain <= 0.0001) {
    return 0;
  }
  const db = 20 * Math.log10(gain);
  return Math.round(dbToFaderPosition(db));
}
