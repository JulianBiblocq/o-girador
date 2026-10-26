/**
 * Caméra WebRTC Mobile : Mode Carré 1:1 avec Retardateur & Guide Fantôme (< 140 lignes).
 */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { safeSuspendAudioContext } from '../../../audio/audioContextSuspendManager';
import { MobileDocCameraOverlay } from './MobileDocCameraOverlay';
import { MobileLiveCameraSquareView } from './MobileLiveCameraSquareView';
import { useCameraTimerCountdown } from '../../signals/photobooth/useCameraTimerCountdown';

interface Props {
  isOpen: boolean; onClose: () => void; onCapture: (imgs: string[]) => void;
  defaultFacingMode?: 'user' | 'environment'; mode?: 'single' | 'four' | 'batch';
  lang?: 'fr' | 'pt'; isInline?: boolean; isModal?: boolean; captureFormat?: 'square' | 'fullscreen-doc';
  ghostReferenceImage?: string | null;
}

export const MobileLiveCameraBox: React.FC<Props> = ({
  isOpen, onClose, onCapture, defaultFacingMode = 'user', mode = 'single', lang = 'pt',
  isModal = false, captureFormat = 'square', ghostReferenceImage,
}) => {
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>(defaultFacingMode);
  const [captured, setCaptured] = useState<string[]>([]), [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isGhostActive, setIsGhostActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null), streamRef = useRef<MediaStream | null>(null), isCancelledRef = useRef(false);
  const timer = useCameraTimerCountdown();
  const isDoc = captureFormat === 'fullscreen-doc';

  const stopStream = useCallback(() => {
    isCancelledRef.current = true;
    timer.cancelCountdown();
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, [timer]);

  const startStream = useCallback(async (targetFacing: 'user' | 'environment') => {
    stopStream();
    isCancelledRef.current = false;
    setErrorMsg(null);
    try {
      await safeSuspendAudioContext();
      const constraints: MediaStreamConstraints = {
        video: isDoc ? { facingMode: targetFacing, width: { ideal: 1920 }, height: { ideal: 1080 } } : { facingMode: targetFacing, width: { ideal: 720 }, height: { ideal: 720 } },
        audio: false,
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      if (isCancelledRef.current) { stream.getTracks().forEach((t) => t.stop()); return; }
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play().catch(() => {}); }
    } catch {
      if (streamRef.current) { try { streamRef.current.getTracks().forEach((t) => t.stop()); } catch (_) {} streamRef.current = null; }
      setErrorMsg(lang === 'fr' ? 'Caméra indisponible ou refusée.' : 'Câmera indisponível ou recusada.');
    }
  }, [isDoc, stopStream, lang]);

  useEffect(() => { if (isOpen) setCaptured([]); }, [isOpen]);

  useEffect(() => {
    if (isOpen) startStream(facingMode);
    else stopStream();
    return () => stopStream();
  }, [isOpen, facingMode, startStream, stopStream]);

  const snapFrame = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return null;
    const canvas = document.createElement('canvas');
    const vw = video.videoWidth, vh = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    if (isDoc) {
      canvas.width = vw; canvas.height = vh;
      if (facingMode === 'user') { ctx.translate(vw, 0); ctx.scale(-1, 1); }
      ctx.drawImage(video, 0, 0, vw, vh);
      return canvas.toDataURL('image/jpeg', 0.90);
    }
    const side = Math.min(vw, vh), sx = (vw - side) / 2, sy = (vh - side) / 2;
    canvas.width = 720; canvas.height = 720;
    if (facingMode === 'user') { ctx.translate(720, 0); ctx.scale(-1, 1); }
    ctx.drawImage(video, sx, sy, side, side, 0, 0, 720, 720);
    return canvas.toDataURL('image/jpeg', 0.85);
  };

  const handleCaptureClick = () => {
    if (mode === 'four') {
      const img = snapFrame();
      if (!img) return;
      const next = [...captured, img];
      setCaptured(next);
      if (next.length >= 4) { stopStream(); onCapture(next); onClose(); }
    } else {
      timer.startCountdown(() => {
        const img = snapFrame();
        if (img) { stopStream(); onCapture([img]); onClose(); }
      });
    }
  };

  if (!isOpen) return null;

  if (isDoc) {
    return (
      <MobileDocCameraOverlay
        errorMsg={errorMsg} videoRef={videoRef} facingMode={facingMode} lang={lang}
        onFlipCamera={() => setFacingMode((f) => (f === 'user' ? 'environment' : 'user'))}
        onClose={() => { stopStream(); onClose(); }} onCapture={handleCaptureClick}
      />
    );
  }

  const squareContent = (
    <MobileLiveCameraSquareView
      videoRef={videoRef} facingMode={facingMode} mode={mode} capturedCount={captured.length}
      errorMsg={errorMsg} lang={lang} timerSec={timer.timerSec} onSelectTimer={timer.setTimerSec}
      isCountingDown={timer.isCountingDown} countdownNumber={timer.countdownNumber}
      isGhostActive={isGhostActive} onToggleGhost={() => setIsGhostActive((a) => !a)}
      ghostReferenceImage={ghostReferenceImage}
      onFlipCamera={() => setFacingMode((f) => (f === 'user' ? 'environment' : 'user'))}
      onCaptureClick={handleCaptureClick} onClose={() => { stopStream(); onClose(); }}
    />
  );

  return isModal ? <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-3 select-none backdrop-blur-xs">{squareContent}</div> : squareContent;
};
