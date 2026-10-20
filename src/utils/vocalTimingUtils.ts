/**
 * O Girador - Vocal Timing & Rhythm Utilities Orchestrator
 */

import {
  VocalBeatGroup,
  VocalMeasureGroups,
  VocalStepTickMatch,
  getVocalMeasureGroups,
  getVocalStepTickMap,
  clampStepIndex
} from './vocal/vocalBeatGrouping';
import { matchVocalStepAtTick } from './vocal/vocalTickMatcher';
import { resizePatternBeatResolution } from './vocal/vocalResolutionResizer';
import { resizePatternAllBeatsResolution } from './vocal/vocalAllBeatsResizer';

export type { VocalBeatGroup, VocalMeasureGroups, VocalStepTickMatch };
export {
  getVocalMeasureGroups,
  getVocalStepTickMap,
  matchVocalStepAtTick,
  clampStepIndex,
  resizePatternBeatResolution,
  resizePatternAllBeatsResolution
};
