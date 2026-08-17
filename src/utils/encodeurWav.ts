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
      if (typeof window.MediaRecorder === 'undefined') {
        throw new Error("MediaRecorder n'est pas supporté (navigateur ou réseau local non sécurisé).");
      }

      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) {
        throw new Error("AudioContext n'est pas supporté.");
      }

      const audioCtx = new AudioContextClass();
      
      if (!audioCtx.createMediaStreamDestination) {
        throw new Error("createMediaStreamDestination n'est pas supporté sur ce navigateur.");
      }
      
      const dest = audioCtx.createMediaStreamDestination();
      const source = audioCtx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(dest);
      
      let options: MediaRecorderOptions | undefined = undefined;
      const types = ['audio/webm', 'audio/mp4', 'audio/ogg'];
      for (const t of types) {
        if (MediaRecorder.isTypeSupported(t)) {
          options = { mimeType: t };
          break;
        }
      }
        
      const recorder = new MediaRecorder(dest.stream, options);
      const chunks: BlobPart[] = [];
      
      recorder.ondataavailable = e => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      
      recorder.onerror = (e: any) => {
        reject(new Error(`MediaRecorder error: ${e.error || e.message || 'Unknown'}`));
      };
      
      recorder.onstop = () => {
        const type = options?.mimeType || 'audio/webm';
        resolve(new Blob(chunks, { type }));
        audioCtx.close().catch(console.error);
      };
      
      source.onended = () => {
        recorder.stop();
      };
      
      recorder.start();
      source.start();
    } catch(err: any) {
      reject(new Error(`Erreur Encodage: ${err.message || String(err)}`));
    }
  });
}
