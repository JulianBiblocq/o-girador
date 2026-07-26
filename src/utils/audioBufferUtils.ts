/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { VocalClipMeta } from '../types/store.types';

export interface TransientAnalysisResult {
  firstOnsetSec: number;
  offsetStart: number;
}

/**
 * Pure mathematical audio buffer utility for transient onset detection.
 * Scans channel data to detect the first genuine vocal impulse above threshold (-29 dB),
 * then backs up by ~50ms (pre-roll) to preserve initial breath/consonants.
 */
export function analyzeVocalTransient(
  audioBuffer: AudioBuffer,
  threshold = 0.035, // Strict threshold (~-29 dB) to ignore room noise & metronome bleed
  windowMs = 15,
  preRollMs = 50
): TransientAnalysisResult {
  const channelData = audioBuffer.getChannelData(0);
  const sampleRate = audioBuffer.sampleRate;
  const windowSamples = Math.floor((windowMs / 1000) * sampleRate);
  
  let firstOnsetSec = 0;
  for (let i = 0; i < channelData.length - windowSamples; i += windowSamples) {
    let sumSq = 0;
    let peak = 0;
    for (let j = i; j < i + windowSamples; j++) {
      const absVal = Math.abs(channelData[j]);
      if (absVal > peak) peak = absVal;
      sumSq += channelData[j] * channelData[j];
    }
    const rms = Math.sqrt(sumSq / windowSamples);
    
    // Require peak >= threshold (0.035) AND rms >= 0.015 to ignore short clicks/room noise
    if (peak >= threshold && rms >= 0.015) {
      firstOnsetSec = i / sampleRate;
      break;
    }
  }

  const preRollSec = preRollMs / 1000;
  const offsetStart = Math.max(0, firstOnsetSec - preRollSec);

  console.log(`🎙️ [AUTO-TRIM TRANSIENT] threshold=${threshold}, firstOnsetSec=${firstOnsetSec.toFixed(3)}s, offsetStart=${offsetStart.toFixed(3)}s (preRoll=50ms)`);

  return {
    firstOnsetSec,
    offsetStart,
  };
}

/**
 * Calculates VocalClipMeta parameters for automatic onset alignment and time-stretching.
 */
export function calculateVocalClipMeta(
  audioBuffer: AudioBuffer,
  firstNoteOffsetSec: number,
  preRollDurationSec: number,
  bpm: number,
  threshold = 0.035
): VocalClipMeta {
  const { firstOnsetSec, offsetStart } = analyzeVocalTransient(audioBuffer, threshold);

  // Vocal attack onset is at `firstOnsetSec` in the recording.
  // Align onset with `firstNoteOffsetSec` in target measure.
  const startTimeDelay = firstNoteOffsetSec - (firstOnsetSec - offsetStart);

  console.log(`🎙️ [VOCAL CLIP META] firstOnsetSec=${firstOnsetSec.toFixed(3)}s, offsetStart=${offsetStart.toFixed(3)}s, firstNoteOffsetSec=${firstNoteOffsetSec.toFixed(3)}s, startTimeDelay=${startTimeDelay.toFixed(3)}s`);

  return {
    offsetStart,
    startTimeDelay,
    baseBpm: bpm,
    bpmSync: true,
    offsetEnd: audioBuffer.duration,
  };
}
