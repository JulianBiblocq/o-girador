import { useRef, useCallback } from 'react';
import { safeSuspendAudioContext } from '../../../audio/audioContextSuspendManager';

export function usePhotoBoothCamera() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rawBase64ImagesRef = useRef<string[]>([]);

  const startCamera = useCallback(async () => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      await safeSuspendAudioContext();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch((err) => console.warn('[PhotoBooth] video.play error:', err));
      }
    } catch (err) {
      console.error('[PhotoBooth] Erreur caméra:', err);
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const captureCurrentFrame = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    const vw = video.videoWidth || 1280;
    const vh = video.videoHeight || 720;
    const size = Math.min(vw, vh);
    const sx = (vw - size) / 2;
    const sy = (vh - size) / 2;

    const workCanvas = document.createElement('canvas');
    const workSize = Math.min(720, size);
    workCanvas.width = workSize;
    workCanvas.height = workSize;
    const ctx = workCanvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, sx, sy, size, size, 0, 0, workSize, workSize);
      const b64 = workCanvas.toDataURL('image/jpeg', 0.9);
      rawBase64ImagesRef.current.push(b64);
    }
  }, []);

  if (import.meta.hot) {
    import.meta.hot.dispose(() => {
      stopCamera();
    });
  }

  return { videoRef, streamRef, rawBase64ImagesRef, startCamera, stopCamera, captureCurrentFrame };
}

