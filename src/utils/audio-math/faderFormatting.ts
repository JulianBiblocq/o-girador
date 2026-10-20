import {
  UNITY_GAIN_FADER_POSITION,
  CUTOFF_FADER_POSITION,
  faderPositionToDb,
} from './faderMath';

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
  const isCleanInt = Math.abs(Math.round(db) - db) < 0.08;
  const numStr = isCleanInt ? `${Math.round(db)}` : db.toFixed(1);
  return `${numStr} dB`;
}

/**
 * Parse une saisie textuelle de décibels pour les cartouches du mixeur.
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
