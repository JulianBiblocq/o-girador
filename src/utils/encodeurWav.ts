/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Encode un AudioBuffer en Blob WAV de manière asynchrone via un Web Worker.
 * Cela permet de ne pas bloquer le thread principal (Zero Render Thrashing).
 * 
 * @param {AudioBuffer} audioBuffer - Le buffer audio à encoder.
 * @returns {Promise<Blob>} Une promesse résolvant avec le Blob audio (.wav).
 */
export function encoderWav(audioBuffer: AudioBuffer): Promise<Blob> {
  return new Promise((resolve, reject) => {
    try {
      const numOfChan = audioBuffer.numberOfChannels;
      const length = audioBuffer.length;
      const sampleRate = audioBuffer.sampleRate;
      
      const channels = [];
      for (let i = 0; i < numOfChan; i++) {
        // slice() copie les données pour pouvoir les transférer au Worker
        channels.push(audioBuffer.getChannelData(i).slice().buffer);
      }
      
      // Code du Worker inline
      const workerCode = `
        self.onmessage = function(e) {
          try {
            const { channels, length, sampleRate, numOfChan } = e.data;
            const channelArrays = channels.map(buf => new Float32Array(buf));
            
            const interleaved = new Float32Array(length * numOfChan);
            for (let i = 0; i < length; i++) {
              for (let channel = 0; channel < numOfChan; channel++) {
                interleaved[i * numOfChan + channel] = channelArrays[channel][i];
              }
            }
            
            const buffer = new ArrayBuffer(44 + interleaved.length * 2);
            const view = new DataView(buffer);
            
            function writeString(view, offset, string) {
              for (let i = 0; i < string.length; i++) {
                view.setUint8(offset + i, string.charCodeAt(i));
              }
            }
            
            writeString(view, 0, 'RIFF');
            view.setUint32(4, 36 + interleaved.length * 2, true);
            writeString(view, 8, 'WAVE');
            writeString(view, 12, 'fmt ');
            view.setUint32(16, 16, true);
            view.setUint16(20, 1, true);
            view.setUint16(22, numOfChan, true);
            view.setUint32(24, sampleRate, true);
            view.setUint32(28, sampleRate * numOfChan * 2, true);
            view.setUint16(32, numOfChan * 2, true);
            view.setUint16(34, 16, true);
            writeString(view, 36, 'data');
            view.setUint32(40, interleaved.length * 2, true);
            
            let index = 44;
            for (let i = 0; i < interleaved.length; i++) {
              let sample = Math.max(-1, Math.min(1, interleaved[i]));
              sample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
              view.setInt16(index, sample, true);
              index += 2;
            }
            
            const blob = new Blob([view], { type: 'audio/wav' });
            self.postMessage({ blob });
          } catch (error) {
            self.postMessage({ error: error.message });
          }
        };
      `;
      
      const blob = new Blob([workerCode], { type: 'application/javascript' });
      const worker = new Worker(URL.createObjectURL(blob));
      
      worker.onmessage = (e) => {
        if (e.data.error) {
          reject(new Error(e.data.error));
        } else {
          resolve(e.data.blob);
        }
        worker.terminate();
      };
      
      worker.onerror = (err) => {
        reject(err);
        worker.terminate();
      };
      
      // Transfert des ArrayBuffers vers le Worker (zéro copie)
      worker.postMessage(
        { channels, length, sampleRate, numOfChan },
        channels
      );
    } catch (err) {
      reject(err);
    }
  });
}
