/**
 * O Girador - Audio Engine Pitch, Drum Tuning Semitones & Unison Micro-Dispersion (< 75 lignes)
 * - Désactive totalement (0 ms, 0 cents, ratio 1.0) toute dispersion/detune sur `agbe`, `mineiro`, `gongue` et `apito`.
 */

import { InstrumentAudioConfig } from '../../data/audioConfig';
import { TrackGroup } from '../../types';
import { TUNEABLE_INSTRUMENTS } from './engineTypes';

const ZERO_DISPERSION_INSTRUMENTS = new Set(['agbe', 'mineiro', 'gongue', 'apito']);

function hashTrackId(trackId: number | string | null | undefined): number {
  if (trackId === null || trackId === undefined) return 0;
  const s = String(trackId);
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export class EngineTuning {
  public static calculateTotalSemitones(
    instrumentId: string,
    config: InstrumentAudioConfig,
    track?: TrackGroup | null,
    overrideTuning?: number
  ): number {
    if (!TUNEABLE_INSTRUMENTS.has(instrumentId) || ZERO_DISPERSION_INSTRUMENTS.has(instrumentId)) {
      return 0;
    }
    const macroPitch = config.macroPitch !== undefined && config.macroPitch > 0 ? config.macroPitch : 1.0;
    const macroSemitones = 12 * Math.log2(macroPitch);
    const userTuning = overrideTuning !== undefined ? overrideTuning : (track?.tuning || 0);
    return macroSemitones + userTuning;
  }

  public static calculatePitch(
    instrumentId: string,
    config: InstrumentAudioConfig,
    track?: TrackGroup | null,
    overrideTuning?: number
  ): number {
    const totalSt = this.calculateTotalSemitones(instrumentId, config, track, overrideTuning);
    return totalSt === 0 ? 1.0 : Math.pow(2, totalSt / 12);
  }

  public static calculateMicroDetuneMultiplier(
    instrumentId: string,
    trackId?: number | string | null
  ): number {
    if (ZERO_DISPERSION_INSTRUMENTS.has(instrumentId) || !TUNEABLE_INSTRUMENTS.has(instrumentId) || trackId === null || trackId === undefined) {
      return 1.0;
    }
    const h = hashTrackId(trackId);
    const norm = ((h % 1000) / 999) * 2 - 1; // [-1, +1]
    const cents = norm * 2.5; // [-2.5, +2.5] cents
    return Math.pow(2, cents / 1200);
  }

  public static calculateUnisonMicroDelaySec(
    track?: TrackGroup | null,
    instrumentId?: string
  ): number {
    if (!track || track.id === undefined || track.id === null) return 0;
    if (instrumentId && (ZERO_DISPERSION_INSTRUMENTS.has(instrumentId) || !TUNEABLE_INSTRUMENTS.has(instrumentId))) {
      return 0;
    }
    const isLinkedSlave = Boolean(track.linkedToTrackId && !track.isLinkFolder && !track.isLinkMaster);
    if (!isLinkedSlave) return 0;
    const h = hashTrackId(track.id);
    const frac = (h % 701) / 700; // [0..1]
    return 0.0008 + frac * 0.0007; // 0.8 ms à 1.5 ms uniquement sur piste esclave de tambour
  }
}
