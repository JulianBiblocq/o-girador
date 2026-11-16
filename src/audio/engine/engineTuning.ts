/**
 * O Girador - Audio Engine Pitch & Drum Tuning Semitones (< 45 lignes)
 * - Zéro pitch jitter aléatoire : `playbackRate` ne dépend que du `macroPitch` (0 sur banques Studio) et de `track.tuning`.
 * - Accordage actif (0.1 st) sur Alfaias, Caixa, Tarol, Timbal et Gonguê ; désactivé (`1.0`) sur `agbe`, `mineiro` et `apito`.
 */

import { InstrumentAudioConfig } from '../../data/audioConfig';
import { TrackGroup } from '../../types';
import { TUNEABLE_INSTRUMENTS } from './engineTypes';

const NON_TUNEABLE_INSTRUMENTS = new Set(['agbe', 'mineiro', 'apito']);

export class EngineTuning {
  public static calculateTotalSemitones(
    instrumentId: string,
    config: InstrumentAudioConfig,
    track?: TrackGroup | null,
    overrideTuning?: number
  ): number {
    if (!TUNEABLE_INSTRUMENTS.has(instrumentId) || NON_TUNEABLE_INSTRUMENTS.has(instrumentId)) {
      return 0;
    }
    const macroPitch = config.macroPitch !== undefined && config.macroPitch > 0 ? config.macroPitch : 1.0;
    const macroSemitones = 12 * Math.log2(macroPitch);
    const userTuning = overrideTuning !== undefined ? overrideTuning : (track?.tuning ?? 0);
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
}
