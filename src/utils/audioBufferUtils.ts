/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export { extractPeaks } from './audio-buffer/audioPeakExtractor';
export { normalizeAudioBuffer } from './audio-buffer/audioBufferNormalizer';
export { audioBufferToWav } from './audio-buffer/audioBufferWavConverter';
export { renderTrimmedVocalBuffer } from './audio-buffer/audioBufferTrimmer';
export {
  type TransientAnalysisResult,
  calculateDeterministicVocalClipMeta,
  analyzeVocalTransient,
  calculateVocalClipMeta,
} from './audio-buffer/vocalClipMetaUtils';
