export {
  UNITY_GAIN_FADER_POSITION,
  CUTOFF_FADER_POSITION,
  CURRENT_AUDIO_SCALE_VERSION,
  sanitizeFaderPosition,
  normalizeToFaderPosition,
  faderPositionToDb,
  faderPositionToGain,
  dbToFaderPosition,
  gainToFaderPosition,
} from './audio-math/faderMath';

export {
  faderPositionToDbString,
  parseDbInput,
} from './audio-math/faderFormatting';

export function getFaderThumbTransform(pct: number): string {
  const clamped = Math.max(0, Math.min(100, Number.isFinite(pct) ? pct : 75));
  return `translate3d(0, ${100 - clamped}%, 0)`;
}

export function setFaderThumbPercent(el: HTMLElement | null, pct: number): void {
  if (!el) return;
  el.style.transform = getFaderThumbTransform(pct);
}
