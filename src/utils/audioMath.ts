/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Audio Taper & Fader Curve Math Utilities
 * 
 * Implémente l'échelle logarithmique standard des consoles et DAW professionnels :
 * - Unity Gain (0.0 dB, gain 1.0) à 75 % de course
 * - Boost jusqu'à +6.0 dB (gain ~2.0) à 100 %
 * - -10.0 dB (gain ~0.316) à 50 %
 * - -24.0 dB (gain ~0.063) à 25 %
 * - Coupure totale / silence (-Infinity dB, gain 0.0) à <= 3 %
 */

export const UNITY_GAIN_FADER_POSITION = 75;
export const CUTOFF_FADER_POSITION = 3;
export const CURRENT_AUDIO_SCALE_VERSION = 2;

/**
 * Convertit une position de fader (0 à 100) en décibels (dB).
 * Interpolation continue par morceaux linéaire en dB.
 */
export function faderPositionToDb(position: number): number {
  const pos = Math.max(0, Math.min(100, position));
  if (pos <= CUTOFF_FADER_POSITION) {
    return -Infinity;
  }
  if (pos <= 25) {
    // Interpolation de -60.0 dB à -24.0 dB (plage de 36 dB sur 22 % de course)
    return -60.0 + ((pos - 3) / 22) * 36.0;
  }
  if (pos <= 50) {
    // Interpolation de -24.0 dB à -10.0 dB (plage de 14 dB sur 25 % de course)
    return -24.0 + ((pos - 25) / 25) * 14.0;
  }
  if (pos <= 75) {
    // Interpolation de -10.0 dB à 0.0 dB (plage de 10 dB sur 25 % de course)
    return -10.0 + ((pos - 50) / 25) * 10.0;
  }
  // Interpolation de 0.0 dB à +6.0 dB (plage de 6 dB sur 25 % de course)
  return ((pos - 75) / 25) * 6.0;
}

/**
 * Convertit une position de fader (0 à 100) en gain linéaire (amplitude).
 * À 75 -> 1.0 (0 dB)
 * À 100 -> ~1.995 (environ +6 dB)
 * À 50 -> ~0.316 (-10 dB)
 * À 25 -> ~0.063 (-24 dB)
 * À <= 3 -> 0.0 (-inf)
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
 * Fonction inverse exacte de faderPositionToDb.
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
 * Fonction inverse exacte de faderPositionToGain.
 */
export function gainToFaderPosition(gain: number): number {
  if (!Number.isFinite(gain) || gain <= 0.0001) {
    return 0;
  }
  const db = 20 * Math.log10(gain);
  return Math.round(dbToFaderPosition(db));
}

/**
 * Formate la position du fader sous forme textuelle dynamique en dB :
 * Exemples : "+2.5 dB", "+6.0 dB", "0.0 dB", "-10 dB", "-14 dB", "-inf".
 */
export function faderPositionToDbString(position: number): string {
  const pos = Math.max(0, Math.min(100, position));
  if (pos <= CUTOFF_FADER_POSITION) {
    return '-inf';
  }
  if (Math.round(pos) === UNITY_GAIN_FADER_POSITION) {
    return '0.0 dB';
  }
  const db = faderPositionToDb(pos);
  if (Math.abs(db) < 0.05) {
    return '0.0 dB';
  }
  if (db > 0) {
    return `+${db.toFixed(1)} dB`;
  }
  // En dessous de zéro : si c'est un entier (ex: -10, -14, -24), afficher sans décimale superflue
  const isCleanInt = Math.abs(Math.round(db) - db) < 0.08;
  const numStr = isCleanInt ? `${Math.round(db)}` : db.toFixed(1);
  return `${numStr} dB`;
}

/**
 * Parse une saisie textuelle de décibels pour les cartouches du mixeur.
 * - Supprime les espaces superflus et l'unité "dB" (insensible à la casse).
 * - Remplace la virgule décimale française par un point (ex: "-3,5" -> "-3.5").
 * - Supporte les équivalents de coupure/silence : "-inf", "-infinity", "mute", "-∞" -> -Infinity.
 * - Gère le préfixe explicite "+" (ex: "+3.5" -> 3.5).
 * - Borne le résultat entre -Infinity et +6.0 dB (coupure à -Infinity si <= -60 dB).
 */
export function parseDbInput(input: string): number {
  if (!input) return 0;
  let cleaned = input.trim().toLowerCase().replace(/,/g, '.').replace(/\s*db$/i, '').trim();
  if (
    cleaned === '-inf' || 
    cleaned === '-infinity' || 
    cleaned === 'inf' || 
    cleaned === 'mute' || 
    cleaned === '-∞' ||
    cleaned === 'cutoff'
  ) {
    return -Infinity;
  }
  if (cleaned.startsWith('+')) {
    cleaned = cleaned.substring(1).trim();
  }
  const num = parseFloat(cleaned);
  if (!Number.isFinite(num) || isNaN(num)) {
    return 0;
  }
  if (num > 6.0) return 6.0;
  if (num <= -60.0) return -Infinity;
  return num;
}
