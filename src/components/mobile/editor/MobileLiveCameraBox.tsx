/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Caméra WebRTC 1:1 carrée avec center-crop strict & protection audio (< 130 lignes).
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, SwitchCamera, X } from 'lucide-react';
import { safeSuspendAudioContext } from '../../../audio/audioContextSuspendManager';
import { tMobile } from '../../../i18n/mobileTranslations';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (imgs: string[]) => void;
  defaultFacingMode?: 'user' | 'environment';
  mode?: 'single' | 'four' | 'batch';
  lang?: 'fr' | 'pt';
  isInline?: boolean;
  isModal?: boolean;
}

export const MobileLiveCameraBox: React.FC<Props> = ({
  isOpen, onClose, onCapture, defaultFacingMode = 'user', mode = 'single', lang = 'pt', isModal = false,
}) => {
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>(defaultFacingMode);
  const [captured, setCaptured] = useState<string[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopStream = useCallback(() => {
    if (streamRef.current) { streamRef.current.getTracks().forEach((t) => t.stop()); streamRef.current = null; }
  }, []);

  const startStream = useCallback(async () => {
    stopStream();
    setErrorMsg(null);
    try {
      await safeSuspendAudioContext();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 720 }, height: { ideal: 720 } }, audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play().catch(() => {}); }
    } catch {
      if (streamRef.current) {
        try { streamRef.current.getTracks().forEach((t) => t.stop()); } catch (_) {}
        streamRef.current = null;
      }
      setErrorMsg(lang === 'fr' ? 'Caméra indisponible ou refusée.' : 'Câmera indisponível ou recusada.');
    }
  }, [facingMode, stopStream, lang]);

  useEffect(() => {
    if (isOpen) { setCaptured([]); startStream(); } else { stopStream(); }
    return () => stopStream();
  }, [isOpen, startStream, stopStream]);

  const snapFrame = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return null;
    const canvas = document.createElement('canvas');
    const vw = video.videoWidth || 720, vh = video.videoHeight || 720;
    const side = Math.min(vw, vh);
    const sx = (vw - side) / 2, sy = (vh - side) / 2;
    canvas.width = 720; canvas.height = 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    if (facingMode === 'user') { ctx.translate(720, 0); ctx.scale(-1, 1); }
    ctx.drawImage(video, sx, sy, side, side, 0, 0, 720, 720);
    return canvas.toDataURL('image/jpeg', 0.85);
  };

  const handleCaptureClick = () => {
    const img = snapFrame();
    if (!img) return;
    if (mode === 'four') {
      const next = [...captured, img];
      setCaptured(next);
      if (next.length >= 4) { stopStream(); onCapture(next); onClose(); }
    } else {
      stopStream(); onCapture([img]); onClose();
    }
  };

  if (!isOpen) return null;

  const content = (
    <div className="w-full max-w-[360px] aspect-square mx-auto overflow-hidden border-2 border-[var(--cordel-border)] relative bg-black flex items-center justify-center select-none shadow-[2px_2px_0px_#000]">
      {errorMsg ? (
        <div className="text-red-400 text-xs font-mono text-center p-4">{errorMsg}</div>
      ) : (
        <video
          ref={videoRef} playsInline muted autoPlay
          className={`w-full h-full aspect-square object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
        />
      )}
      <div className="absolute top-2 left-2 right-2 flex justify-between items-center z-10 px-2 py-1 bg-black/60 backdrop-blur-xs border border-white/20 rounded-xs">
        <span className="font-cactus font-bold text-xs uppercase text-white tracking-wider">
          {mode === 'four' ? (lang === 'fr' ? `Trame ${captured.length + 1} / 4` : `Quadro ${captured.length + 1} / 4`) : tMobile(lang, 'photoCapture')}
        </span>
        <button type="button" onClick={() => { stopStream(); onClose(); }} title={tMobile(lang, 'closeCamera')} className="text-white hover:text-[#b94a2c] p-0.5 cursor-pointer">
          <X size={16} />
        </button>
      </div>
      <div className="absolute bottom-2 left-2 right-2 flex items-center justify-around py-1.5 z-10 bg-black/60 backdrop-blur-xs border border-white/20 rounded-xs">
        <button
          type="button" onClick={() => setFacingMode((f) => (f === 'user' ? 'environment' : 'user'))}
          className="p-2 rounded-full bg-white/20 text-white hover:bg-white/30 cursor-pointer" title={tMobile(lang, 'flipCamera')}
        >
          <SwitchCamera size={16} />
        </button>
        <button
          type="button" onClick={handleCaptureClick}
          className="w-12 h-12 rounded-full bg-white border-4 border-[#8b2a1a] flex items-center justify-center shadow-lg active:scale-90 transition-transform cursor-pointer"
          title={tMobile(lang, 'triggerCapture')}
        >
          <Camera size={22} className="text-[#8b2a1a]" />
        </button>
        <div className="w-8 text-center font-mono font-bold text-xs text-white">
          {mode === 'four' ? `${captured.length}/4` : ''}
        </div>
      </div>
    </div>
  );

  if (isModal) {
    return <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-3 select-none backdrop-blur-xs">{content}</div>;
  }
  return content;
};

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    navigator.mediaDevices?.enumerateDevices?.().catch(() => {});
  });
}
