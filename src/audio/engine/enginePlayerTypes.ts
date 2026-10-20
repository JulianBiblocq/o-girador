/**
 * O Girador - Audio Engine Note Player Types
 */

import { InstrumentAudioConfig, StrokeMapping } from '../../data/audioConfig';
import { TrackGroup } from '../../types';
import { PlaybackContext } from './engineStrokePlayback';
import { EngineSampleLoader } from './engineSampleLoader';
import { EngineRoundRobin } from './engineRoundRobin';
import { EngineVoiceGuard } from './engineVoiceGuard';

export interface NotePlayerDeps {
  playbackCtx: PlaybackContext;
  sampleLoader: EngineSampleLoader;
  roundRobin: EngineRoundRobin;
  voiceGuard: EngineVoiceGuard;
  configMap: Map<string, InstrumentAudioConfig>;
  strokesMaps: Map<string, Map<string, StrokeMapping>>;
  trackLookupMap: Map<string, TrackGroup>;
  timeSlotHitCounts: Map<number, number>;
  getSchedulingMeasure: () => number;
}
