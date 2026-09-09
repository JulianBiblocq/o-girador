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
 * Extracts normalized min/max peaks from an AudioBuffer once for 60 FPS Canvas rendering.
 * Returns a Float32Array of size (numPoints * 2) containing alternating [min, max] values.
 */
export function extractPeaks(audioBuffer: AudioBuffer, numPoints: number = 1000): Float32Array {
  const channelData = audioBuffer.getChannelData(0);
  const totalSamples = channelData.length;
  const step = Math.ceil(totalSamples / numPoints);
  const peaks = new Float32Array(numPoints * 2);

  for (let i = 0; i < numPoints; i++) {
    let min = 1.0;
    let max = -1.0;
    const start = i * step;
    const end = Math.min(totalSamples, start + step);
    for (let j = start; j < end; j++) {
      const val = channelData[j];
      if (val < min) min = val;
      if (val > max) max = val;
    }
    if (min > max) { min = 0; max = 0; }
    peaks[i * 2] = min;
    peaks[i * 2 + 1] = max;
  }

  return peaks;
}

/**
 * Renders a trimmed audio buffer via OfflineAudioContext with micro-fades.
 * STRICT SAFEGUARD: Forces the destination sampleRate to match sourceAudioBuffer.sampleRate exactly,
 * preventing any sample-rate conversion artifacts or pitch distortion.
 */
export async function renderTrimmedVocalBuffer(
  sourceAudioBuffer: AudioBuffer,
  trimStartSec: number,
  trimEndSec: number,
  fadeInDurationSec: number = 0.010, // 10ms fade-in anti-craquement
  fadeOutDurationSec: number = 0.030 // 30ms fade-out anti-craquement
): Promise<AudioBuffer> {
  const sampleRate = sourceAudioBuffer.sampleRate; // Parité stricte du Sample Rate
  const numChannels = sourceAudioBuffer.numberOfChannels;
  const rawDuration = Math.max(0.05, trimEndSec - trimStartSec);
  const lengthFrames = Math.max(1, Math.ceil(rawDuration * sampleRate));

  const offlineCtx = new OfflineAudioContext(numChannels, lengthFrames, sampleRate);

  const source = offlineCtx.createBufferSource();
  source.buffer = sourceAudioBuffer;

  const gainNode = offlineCtx.createGain();

  // 10ms fade-in anti-craquement
  const actualFadeIn = Math.min(rawDuration / 2, fadeInDurationSec);
  gainNode.gain.setValueAtTime(0, 0);
  gainNode.gain.linearRampToValueAtTime(1, actualFadeIn);

  // 30ms fade-out anti-craquement
  const actualFadeOut = Math.min(rawDuration / 2, fadeOutDurationSec);
  const fadeOutStart = Math.max(actualFadeIn, rawDuration - actualFadeOut);
  gainNode.gain.setValueAtTime(1, fadeOutStart);
  gainNode.gain.linearRampToValueAtTime(0, rawDuration);

  source.connect(gainNode);
  gainNode.connect(offlineCtx.destination);

  source.start(0, trimStartSec, rawDuration);
  return await offlineCtx.startRendering();
}

/**
 * Encodes an AudioBuffer into a 16-bit PCM WAV Blob synchronously in RAM (< 5ms).
 * Bypasses async MediaRecorder re-recording to avoid browser lag and format incompatibilities.
 */
export function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const length = buffer.length;

  let interleaved: Float32Array;
  if (numChannels === 2) {
    const left = buffer.getChannelData(0);
    const right = buffer.getChannelData(1);
    interleaved = new Float32Array(length * 2);
    for (let i = 0; i < length; i++) {
      interleaved[i * 2] = left[i];
      interleaved[i * 2 + 1] = right[i];
    }
  } else {
    interleaved = buffer.getChannelData(0);
  }

  const bytesPerSample = 2; // 16-bit PCM
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = interleaved.length * bytesPerSample;
  const bufferArray = new ArrayBuffer(44 + dataSize);
  const view = new DataView(bufferArray);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true); // Subchunk1Size
  view.setUint16(20, 1, true);  // AudioFormat 1 = PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true); // BitsPerSample
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let i = 0; i < interleaved.length; i++) {
    const sample = Math.max(-1, Math.min(1, interleaved[i]));
    const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
    view.setInt16(offset, intSample, true);
    offset += 2;
  }

  return new Blob([view], { type: 'audio/wav' });
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
  const anacrusisSec = Math.max(0, preRollDurationSec - trimStartSec);
  const beatDurationSec = 60 / baseBpm;
  const anacrusisBeats = anacrusisSec / beatDurationSec;

  return {
    patternId,
    baseBpm,
    trimStartSec,
    trimEndSec,
    nudgeMs,
    anacrusisBeats,
    // Compatibility aliases
    offsetStart: 0,
    startTimeDelay: nudgeMs / 1000,
    bpmSync: true,
    offsetEnd: trimEndSec - trimStartSec
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
