/**
 * Audio Taper & Fader Curve Math Utilities
 */

export const UNITY_GAIN_FADER_POSITION = 75;
export const CUTOFF_FADER_POSITION = 3;
export const CURRENT_AUDIO_SCALE_VERSION = 2;

/**
 * Convertit une position de fader (0 à 100) en décibels (dB).
 */
export function faderPositionToDb(position: number): number {
  const pos = Math.max(0, Math.min(100, position));
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
  const pos = Math.max(0, Math.min(100, position));
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
