/**
 * O Girador - Audio Engine Pitch & Micro-Tuning Calculator
 */

import { InstrumentAudioConfig } from '../../data/audioConfig';
import { TrackGroup } from '../../types';
import { ALFAIA_INSTRUMENTS } from './engineTypes';

export class EngineTuning {
  public static calculatePitch(
    instrumentId: string,
    config: InstrumentAudioConfig,
    track?: TrackGroup | null,
    overrideTuning?: number
  ): number {
    if (!ALFAIA_INSTRUMENTS.has(instrumentId)) {
      return 1.0;
    }

    const macroPitch = config.macroPitch !== undefined ? config.macroPitch : 1.0;
    let userTuning = overrideTuning !== undefined ? overrideTuning : 0;
    if (overrideTuning === undefined && track) {
      userTuning = track.tuning || 0;
    }
    const userPitchMultiplier = Math.pow(2, userTuning / 12);
    return macroPitch * userPitchMultiplier;
  }
}
