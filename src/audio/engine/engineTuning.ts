/**
 * O Girador - Audio Engine Pitch, Drum Tuning Semitones & Symmetric Skin Chorus (< 65 lignes)
 * - Zéro pitch jitter aléatoire : `playbackRate` déterministe (`macroPitch` + `track.tuning` + `Chœur de Peaux`).
 * - Accordage et Chœur actifs sur Alfaias, Caixa, Tarol, Timbal et Gonguê ; verrouillés (`1.0`) sur `agbe`, `mineiro` et `apito`.
 */

import { InstrumentAudioConfig } from '../../data/audioConfig';
import { TrackGroup } from '../../types';
import { TUNEABLE_INSTRUMENTS } from './engineTypes';
import { computeTrackSkinChorusCents, NON_CHORUS_INSTRUMENTS } from './skinChorusCalculator';

export class EngineTuning {
  public static calculateTotalSemitones(
    instrumentId: string,
    config: InstrumentAudioConfig,
    track?: TrackGroup | null,
    overrideTuning?: number,
    allTracks?: readonly TrackGroup[] | null,
    chorusAmount = 0.75
  ): number {
    if (!TUNEABLE_INSTRUMENTS.has(instrumentId) || NON_CHORUS_INSTRUMENTS.has(instrumentId)) {
      return 0;
    }
    const macroPitch = config.macroPitch !== undefined && config.macroPitch > 0 ? config.macroPitch : 1.0;
    const macroSemitones = 12 * Math.log2(macroPitch);
    const userTuning = overrideTuning !== undefined ? overrideTuning : (track?.tuning ?? 0);
    const chorusCents = allTracks
      ? computeTrackSkinChorusCents(instrumentId, track, allTracks, userTuning, chorusAmount)
      : 0;
    const total = macroSemitones + userTuning + chorusCents / 100;
    return Object.is(total, -0) ? 0 : total;
  }

  public static calculatePitch(
    instrumentId: string,
    config: InstrumentAudioConfig,
    track?: TrackGroup | null,
    overrideTuning?: number,
    allTracks?: readonly TrackGroup[] | null,
    chorusAmount = 0.75
  ): number {
    const totalSt = this.calculateTotalSemitones(
      instrumentId,
      config,
      track,
      overrideTuning,
      allTracks,
      chorusAmount
    );
    return totalSt === 0 ? 1.0 : Math.pow(2, totalSt / 12);
  }
}
