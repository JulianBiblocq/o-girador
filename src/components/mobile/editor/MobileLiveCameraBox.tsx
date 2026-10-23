/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Caméra WebRTC Mobile : Mode Carré 1:1 ou Plein Écran Doc A4 (< 145 lignes).
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
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
  captureFormat?: 'square' | 'fullscreen-doc';
}

export const MobileLiveCameraBox: React.FC<Props> = ({
  isOpen, onClose, onCapture, defaultFacingMode = 'user', mode = 'single', lang = 'pt', isModal = false, captureFormat = 'square',
}) => {
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>(defaultFacingMode);
  const [captured, setCaptured] = useState<string[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const isDoc = captureFormat === 'fullscreen-doc';

  const stopStream = useCallback(() => {
    if (streamRef.current) { streamRef.current.getTracks().forEach((t) => t.stop()); streamRef.current = null; }
  }, []);

  const startStream = useCallback(async () => {
    stopStream();
    setErrorMsg(null);
    try {
      await safeSuspendAudioContext();
      const constraints: MediaStreamConstraints = {
        video: isDoc ? { facingMode, width: { ideal: 1920 }, height: { ideal: 1080 } } : { facingMode, width: { ideal: 720 }, height: { ideal: 720 } },
        audio: false,
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play().catch(() => {}); }
    } catch {
      if (streamRef.current) { try { streamRef.current.getTracks().forEach((t) => t.stop()); } catch (_) {} streamRef.current = null; }
      setErrorMsg(lang === 'fr' ? 'Caméra indisponible ou refusée.' : 'Câmera indisponível ou recusada.');
    }
  }, [facingMode, isDoc, stopStream, lang]);

  useEffect(() => {
    if (isOpen) { setCaptured([]); startStream(); } else { stopStream(); }
    return () => stopStream();
  }, [isOpen, startStream, stopStream]);

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
    const side = Math.min(vw, vh);
    const sx = (vw - side) / 2, sy = (vh - side) / 2;
    canvas.width = 720; canvas.height = 720;
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

  if (isDoc) {
    return createPortal(
      <div className="fixed inset-0 z-[9999] w-screen h-dvh bg-black flex flex-col justify-between overflow-hidden select-none">
        {errorMsg ? <div className="text-red-400 text-xs font-mono text-center p-8">{errorMsg}</div> : (
          <video ref={videoRef} playsInline muted autoPlay className={`absolute inset-0 w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`} />
        )}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <div className="w-[82%] max-w-sm aspect-[1/1.414] relative border border-white/20">
            <div className="absolute -top-1 -left-1 w-5 h-5 border-t-2 border-l-2 border-[#f4ecd8]" />
            <div className="absolute -top-1 -right-1 w-5 h-5 border-t-2 border-r-2 border-[#f4ecd8]" />
            <div className="absolute -bottom-1 -left-1 w-5 h-5 border-b-2 border-l-2 border-[#f4ecd8]" />
            <div className="absolute -bottom-1 -right-1 w-5 h-5 border-b-2 border-r-2 border-[#f4ecd8]" />
          </div>
        </div>
        <div className="relative z-20 w-full flex items-center justify-between p-4 pt-4 px-4 bg-gradient-to-b from-black/80 via-black/40 to-transparent">
          <button type="button" onClick={() => setFacingMode((f) => (f === 'user' ? 'environment' : 'user'))} className="p-2.5 rounded-full bg-black/50 text-[#f4ecd8] border border-white/30 cursor-pointer active:scale-95" title={tMobile(lang, 'flipCamera')}><SwitchCamera size={20} /></button>
          <button type="button" onClick={() => { stopStream(); onClose(); }} className="p-2.5 rounded-full bg-black/50 text-[#f4ecd8] border border-white/30 cursor-pointer active:scale-95" title={tMobile(lang, 'closeCamera')}><X size={24} /></button>
        </div>
        <div className="relative z-20 w-full pb-6 pt-3 px-4 flex justify-center bg-gradient-to-t from-black/80 via-black/40 to-transparent">
          <button type="button" onClick={handleCaptureClick} className="h-12 px-6 bg-[#c25e38] text-[#f4ecd8] border-2 border-[#f4ecd8] shadow-[3px_3px_0px_#000] font-extrabold uppercase flex items-center gap-2 font-cactus text-sm tracking-wider active:translate-y-0.5 cursor-pointer">
            <Camera size={20} /><span>{lang === 'fr' ? 'Prendre la photo' : 'Tirar a foto'}</span>
          </button>
        </div>
      </div>,
      document.body
    );
  }

  const squareContent = (
    <div className="w-full max-w-[360px] aspect-square mx-auto overflow-hidden border-2 border-[var(--cordel-border)] relative bg-black flex items-center justify-center select-none shadow-[2px_2px_0px_#000]">
      {errorMsg ? <div className="text-red-400 text-xs font-mono text-center p-4">{errorMsg}</div> : (
        <video ref={videoRef} playsInline muted autoPlay className={`w-full h-full aspect-square object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`} />
      )}
      <div className="absolute top-2 left-2 right-2 flex justify-between items-center z-10 px-2 py-1 bg-black/60 backdrop-blur-xs border border-white/20 rounded-xs">
        <span className="font-cactus font-bold text-xs uppercase text-white tracking-wider">
          {mode === 'four' ? (lang === 'fr' ? `Trame ${captured.length + 1} / 4` : `Quadro ${captured.length + 1} / 4`) : tMobile(lang, 'photoCapture')}
        </span>
        <button type="button" onClick={() => { stopStream(); onClose(); }} title={tMobile(lang, 'closeCamera')} className="text-white hover:text-[#b94a2c] p-0.5 cursor-pointer"><X size={16} /></button>
      </div>
      <div className="absolute bottom-2 left-2 right-2 flex items-center justify-around py-1.5 z-10 bg-black/60 backdrop-blur-xs border border-white/20 rounded-xs">
        <button type="button" onClick={() => setFacingMode((f) => (f === 'user' ? 'environment' : 'user'))} className="p-2 rounded-full bg-white/20 text-white hover:bg-white/30 cursor-pointer" title={tMobile(lang, 'flipCamera')}><SwitchCamera size={16} /></button>
        <button type="button" onClick={handleCaptureClick} className="w-12 h-12 rounded-full bg-white border-4 border-[#8b2a1a] flex items-center justify-center shadow-lg active:scale-90 transition-transform cursor-pointer" title={tMobile(lang, 'triggerCapture')}><Camera size={22} className="text-[#8b2a1a]" /></button>
        <div className="w-8 text-center font-mono font-bold text-xs text-white">{mode === 'four' ? `${captured.length}/4` : ''}</div>
      </div>
    </div>
  );

  return isModal ? <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-3 select-none backdrop-blur-xs">{squareContent}</div> : squareContent;
};
