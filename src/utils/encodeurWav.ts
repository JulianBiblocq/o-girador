import { audioBufferToWav } from './audioBufferUtils';

/**
 * Encode un AudioBuffer en Blob WAV 16-bit PCM de manière synchrone et instantanée en RAM (< 5ms).
 * Évite le rejeu en temps réel par MediaRecorder qui provoquait des blocages et timeouts de plusieurs minutes.
 * @param {AudioBuffer} audioBuffer - Le buffer audio à encoder.
 * @returns {Promise<Blob>} Une promesse résolvant immédiatement avec le Blob audio/wav.
 */
export async function encoderWav(audioBuffer: AudioBuffer): Promise<Blob> {
  return audioBufferToWav(audioBuffer);
}
