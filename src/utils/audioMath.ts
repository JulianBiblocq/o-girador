/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export {
  UNITY_GAIN_FADER_POSITION,
  CUTOFF_FADER_POSITION,
  CURRENT_AUDIO_SCALE_VERSION,
  faderPositionToDb,
  faderPositionToGain,
  dbToFaderPosition,
  gainToFaderPosition,
} from './audio-math/faderMath';

export {
  faderPositionToDbString,
  parseDbInput,
} from './audio-math/faderFormatting';
