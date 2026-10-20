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
