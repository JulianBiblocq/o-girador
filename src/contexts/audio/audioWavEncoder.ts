export function bufferToWav(leftBuffers: Float32Array[], rightBuffers: Float32Array[], sampleRate: number): Blob {
  let totalLength = 0;
  for (let i = 0; i < leftBuffers.length; i++) {
    totalLength += leftBuffers[i].length;
  }

  const mergedLeft = new Float32Array(totalLength);
  const mergedRight = new Float32Array(totalLength);
  let offset = 0;
  for (let i = 0; i < leftBuffers.length; i++) {
    mergedLeft.set(leftBuffers[i], offset);
    mergedRight.set(rightBuffers[i], offset);
    offset += leftBuffers[i].length;
  }

  const interleaved = new Float32Array(totalLength * 2);
  for (let i = 0; i < totalLength; i++) {
    interleaved[i * 2] = mergedLeft[i];
    interleaved[i * 2 + 1] = mergedRight[i];
  }

  const buffer = new ArrayBuffer(44 + interleaved.length * 2);
  const view = new DataView(buffer);

  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + interleaved.length * 2, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 2, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 4, true);
  view.setUint16(32, 4, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, 'data');
  view.setUint32(40, interleaved.length * 2, true);

  let index = 44;
  for (let i = 0; i < interleaved.length; i++) {
    const sample = Math.max(-1, Math.min(1, interleaved[i]));
    const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
    view.setInt16(index, intSample, true);
    index += 2;
  }

  return new Blob([view], { type: 'audio/wav' });
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}
