import { audioBufferToWav } from './audioBufferUtils';

/**
 * Encode un AudioBuffer en Blob WebM compressé via MediaRecorder, avec repli instantané WAV.
 * @param {AudioBuffer} audioBuffer - Le buffer audio à encoder.
 * @returns {Promise<Blob>} Une promesse résolvant avec le Blob compressé ou WAV en repli.
 */
export function encoderWav(audioBuffer: AudioBuffer): Promise<Blob> {
  return new Promise((resolve) => {
    try {
      if (typeof window === 'undefined' || typeof window.MediaRecorder === 'undefined') {
        console.warn("[encoderWav] MediaRecorder non disponible, repli immédiat sur WAV PCM.");
        return resolve(audioBufferToWav(audioBuffer));
      }

      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) {
        console.warn("[encoderWav] AudioContext non disponible, repli immédiat sur WAV PCM.");
        return resolve(audioBufferToWav(audioBuffer));
      }

      const audioCtx = new AudioContextClass();
      
      if (!audioCtx.createMediaStreamDestination) {
        console.warn("[encoderWav] createMediaStreamDestination non disponible, repli immédiat sur WAV PCM.");
        audioCtx.close().catch(() => {});
        return resolve(audioBufferToWav(audioBuffer));
      }

      // Déblocage systématique si l'AudioContext a été initialisé en état suspendu
      if (audioCtx.state === 'suspended') {
        audioCtx.resume().catch((err) => {
          console.warn("[encoderWav] Impossible de réveiller audioCtx, repli WAV:", err);
        });
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
      let isResolved = false;

      const safeResolve = (blob: Blob) => {
        if (isResolved) return;
        isResolved = true;
        clearTimeout(safetyTimeout);
        try { audioCtx.close().catch(() => {}); } catch (_e) {}
        resolve(blob);
      };
      
      recorder.ondataavailable = e => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      
      recorder.onerror = (e: any) => {
        console.warn(`[encoderWav] MediaRecorder error: ${e.error || e.message || 'Unknown'}, repli WAV.`);
        safeResolve(audioBufferToWav(audioBuffer));
      };
      
      recorder.onstop = () => {
        if (chunks.length > 0) {
          const type = options?.mimeType || 'audio/webm';
          safeResolve(new Blob(chunks, { type }));
        } else {
          console.warn("[encoderWav] Aucun chunk audio capturé par MediaRecorder, repli WAV.");
          safeResolve(audioBufferToWav(audioBuffer));
        }
      };
      
      source.onended = () => {
        try {
          if (recorder.state !== 'inactive') {
            recorder.stop();
          }
        } catch (_e) {
          safeResolve(audioBufferToWav(audioBuffer));
        }
      };

      // Timer de sécurité : si le rendu réel tarde ou se bloque au-delà de la durée buffer + 2s
      const bufferDurationMs = Math.max(1000, (audioBuffer.duration || 4) * 1000);
      const safetyTimeout = setTimeout(() => {
        if (!isResolved) {
          console.warn("[encoderWav] Timeout MediaRecorder atteint, repli immédiat sur WAV PCM.");
          try {
            if (recorder.state !== 'inactive') recorder.stop();
          } catch (_e) {}
          safeResolve(audioBufferToWav(audioBuffer));
        }
      }, bufferDurationMs + 2000);
      
      recorder.start();
      source.start();
    } catch(err: any) {
      console.warn(`[encoderWav] Exception lors de l'encodage: ${err.message || String(err)}, repli WAV.`);
      resolve(audioBufferToWav(audioBuffer));
    }
  });
}
