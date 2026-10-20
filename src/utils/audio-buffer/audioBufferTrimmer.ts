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
  const sampleRate = sourceAudioBuffer.sampleRate;
  const numChannels = sourceAudioBuffer.numberOfChannels;
  const totalDuration = sourceAudioBuffer.duration;

  // Safeguard buffer slicing
  const safeStartSec = Math.max(0, Math.min(trimStartSec, Math.max(0, totalDuration - 0.01)));
  const safeEndSec = Math.max(safeStartSec + 0.01, Math.min(trimEndSec, totalDuration));
  const rawDuration = Math.max(0.05, safeEndSec - safeStartSec);

  const maxPossibleFrames = Math.max(1, sourceAudioBuffer.length - Math.floor(safeStartSec * sampleRate));
  const targetFrames = Math.max(1, Math.ceil(rawDuration * sampleRate));
  const lengthFrames = Math.max(1, Math.min(targetFrames, maxPossibleFrames));
  const actualRenderDuration = lengthFrames / sampleRate;

  const offlineCtx = new OfflineAudioContext(numChannels, lengthFrames, sampleRate);

  const source = offlineCtx.createBufferSource();
  source.buffer = sourceAudioBuffer;

  const gainNode = offlineCtx.createGain();

  // 10ms fade-in
  const actualFadeIn = Math.min(actualRenderDuration / 2, fadeInDurationSec);
  gainNode.gain.setValueAtTime(0, 0);
  gainNode.gain.linearRampToValueAtTime(1, actualFadeIn);

  // 30ms fade-out
  const actualFadeOut = Math.min(actualRenderDuration / 2, fadeOutDurationSec);
  const fadeOutStart = Math.max(actualFadeIn, actualRenderDuration - actualFadeOut);
  gainNode.gain.setValueAtTime(1, fadeOutStart);
  gainNode.gain.linearRampToValueAtTime(0, actualRenderDuration);

  source.connect(gainNode);
  gainNode.connect(offlineCtx.destination);

  source.start(0, safeStartSec, actualRenderDuration);
  return await offlineCtx.startRendering();
}
