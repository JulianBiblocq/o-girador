/**
 * drumTuningDsp.ts — Accordage Phase-Continue 100 % Naturel des 6 Tambours :
 * - Restitue le buffer maître original intact sans découpe de transitoire à 18 ms ni filtre IIR 42 Hz
 *   afin de préserver la continuité de phase de la fondamentale grave des Alfaias (80–100 Hz).
 * - L'accordage par demi-ton est appliqué par lecture phase-continue (`playbackRate = 2^(st/12)`).
 * - L'étouffement de la peau est piloté directement par l'utilisateur via `trackDecay` (15 % – 100 %).
 */
import { ALFAIA_INSTRUMENTS, TUNEABLE_INSTRUMENTS } from './engine/engineTypes';

export const MAX_DRUM_TUNING_CACHE_ENTRIES = 250;
const drumTuningCache = new Map<string, AudioBuffer>();

export const clearDrumTuningCache = (): void => {
  drumTuningCache.clear();
};

export const getDrumTuningCacheSize = (): number => drumTuningCache.size;

export function quantizeTuningSemitones(totalSemitones: number): number {
  const q = Math.round(Number(totalSemitones || 0) * 10) / 10;
  return Object.is(q, -0) ? 0 : q;
}

export function quantizeAlfaiaBpmBucket(instrumentId: string, bpm: number = 100): number {
  if (!ALFAIA_INSTRUMENTS.has(instrumentId)) return 100;
  const numBpm = Number(bpm || 100);
  return numBpm <= 105 ? 100 : Math.min(180, Math.round(numBpm / 10) * 10);
}

export function buildDrumTuningCacheKey(
  samplePath: string,
  totalSemitones: number,
  instrumentId: string,
  bpm: number = 100
): string {
  return `${samplePath}__tune_${quantizeTuningSemitones(totalSemitones).toFixed(1)}_${quantizeAlfaiaBpmBucket(instrumentId, bpm)}`;
}

export function getOrCreateTunedDrumBuffer(
  _audioContext: BaseAudioContext,
  _samplePath: string,
  sourceBuffer: AudioBuffer,
  instrumentId: string,
  _totalSemitones: number,
  _currentBpm: number = 100
): AudioBuffer {
  if (!TUNEABLE_INSTRUMENTS.has(instrumentId)) return sourceBuffer;
  return sourceBuffer;
}
