/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Encode un AudioBuffer en Blob WebM via MediaRecorder (compression native forte).
 * @param {AudioBuffer} audioBuffer - Le buffer audio à encoder.
 * @returns {Promise<Blob>} Une promesse résolvant avec le Blob compressé.
 */
export function encoderWav(audioBuffer: AudioBuffer): Promise<Blob> {
  return new Promise((resolve, reject) => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const dest = audioCtx.createMediaStreamDestination();
      const source = audioCtx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(dest);
      
      const options = MediaRecorder.isTypeSupported('audio/webm') 
        ? { mimeType: 'audio/webm' } 
        : undefined; // Laisse le navigateur choisir son format compressé par défaut
        
      const recorder = new MediaRecorder(dest.stream, options);
      const chunks: BlobPart[] = [];
      
      recorder.ondataavailable = e => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      
      recorder.onstop = () => {
        const type = options?.mimeType || 'audio/webm';
        resolve(new Blob(chunks, { type }));
        audioCtx.close();
      };
      
      source.onended = () => {
        recorder.stop();
      };
      
      recorder.start();
      source.start();
    } catch(err) {
      reject(err);
    }
  });
}
