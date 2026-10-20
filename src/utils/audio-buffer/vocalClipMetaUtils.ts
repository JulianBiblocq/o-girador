import { VocalClipMeta } from '../../types/store.types';

export interface TransientAnalysisResult {
  firstOnsetSec: number;
  offsetStart: number;
}

/**
 * Calculates deterministic VocalClipMeta without unpredictable RMS guesswork.
 */
export function calculateDeterministicVocalClipMeta(
  patternId: number,
  baseBpm: number,
  preRollDurationSec: number,
  trimStartSec: number,
  trimEndSec: number,
  nudgeMs: number = 0
): VocalClipMeta {
  const startOffsetSec = trimStartSec - preRollDurationSec;
  const anacrusisSec = startOffsetSec < 0 ? Math.abs(startOffsetSec) : 0;
  const beatDurationSec = 60 / baseBpm;
  const anacrusisBeats = anacrusisSec / beatDurationSec;
  const usefulDuration = Math.max(0, trimEndSec - trimStartSec);

  return {
    patternId,
    baseBpm,
    trimStartSec: 0,
    trimEndSec: usefulDuration,
    nudgeMs,
    anacrusisBeats,
    anacrusisSec,
    startOffsetSec,
    // Compatibility aliases
    offsetStart: 0,
    startTimeDelay: nudgeMs / 1000,
    bpmSync: true,
    offsetEnd: usefulDuration,
  };
}

/**
 * Deprecated: Legacy transient detection helper preserved for backward compatibility.
 */
export function analyzeVocalTransient(
  audioBuffer: AudioBuffer,
  threshold = 0.035,
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
    if (peak >= threshold && rms >= 0.015) {
      firstOnsetSec = i / sampleRate;
      break;
    }
  }

  const preRollSec = preRollMs / 1000;
  const offsetStart = Math.max(0, firstOnsetSec - preRollSec);
  return { firstOnsetSec, offsetStart };
}

/**
 * Deprecated: Legacy RMS-based meta calculator preserved for backward compatibility.
 */
export function calculateVocalClipMeta(
  audioBuffer: AudioBuffer,
  firstNoteOffsetSec: number,
  preRollDurationSec: number,
  bpm: number,
  threshold = 0.035
): VocalClipMeta {
  const { firstOnsetSec, offsetStart } = analyzeVocalTransient(audioBuffer, threshold);
  const startTimeDelay = firstNoteOffsetSec - (firstOnsetSec - offsetStart);

  return {
    baseBpm: bpm,
    trimStartSec: offsetStart,
    trimEndSec: audioBuffer.duration,
    nudgeMs: startTimeDelay * 1000,
    anacrusisBeats: Math.max(0, preRollDurationSec - offsetStart) / (60 / bpm),
    offsetStart,
    startTimeDelay,
    bpmSync: true,
    offsetEnd: audioBuffer.duration,
  };
}
