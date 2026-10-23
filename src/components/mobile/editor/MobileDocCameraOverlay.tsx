/**
 * Overlay plein écran Document A4 pour la caméra mobile (< 100 lignes).
 */
import React from 'react';
import { createPortal } from 'react-dom';
import { Camera, SwitchCamera, X } from 'lucide-react';
import { tMobile } from '../../../i18n/mobileTranslations';

interface MobileDocCameraOverlayProps {
  errorMsg: string | null;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  facingMode: 'user' | 'environment';
  lang: 'fr' | 'pt';
  onFlipCamera: () => void;
  onClose: () => void;
  onCapture: () => void;
}

export const MobileDocCameraOverlay: React.FC<MobileDocCameraOverlayProps> = ({
  errorMsg,
  videoRef,
  facingMode,
  lang,
  onFlipCamera,
  onClose,
  onCapture,
}) => {
  return createPortal(
    <div className="fixed inset-0 z-[9999] w-screen h-dvh bg-black flex flex-col justify-between overflow-hidden select-none">
      {errorMsg ? (
        <div className="text-red-400 text-xs font-mono text-center p-8">{errorMsg}</div>
      ) : (
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className={`absolute inset-0 w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
        />
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
        <button
          type="button"
          onClick={onFlipCamera}
          className="p-2.5 rounded-full bg-black/50 text-[#f4ecd8] border border-white/30 cursor-pointer active:scale-95"
          title={tMobile(lang, 'flipCamera')}
        >
          <SwitchCamera size={20} />
        </button>
        <button
          type="button"
          onClick={onClose}
          className="p-2.5 rounded-full bg-black/50 text-[#f4ecd8] border border-white/30 cursor-pointer active:scale-95"
          title={tMobile(lang, 'closeCamera')}
        >
          <X size={24} />
        </button>
      </div>
      <div className="relative z-20 w-full pb-6 pt-3 px-4 flex justify-center bg-gradient-to-t from-black/80 via-black/40 to-transparent">
        <button
          type="button"
          onClick={onCapture}
          className="h-12 px-6 bg-[#c25e38] text-[#f4ecd8] border-2 border-[#f4ecd8] shadow-[3px_3px_0px_#000] font-extrabold uppercase flex items-center gap-2 font-cactus text-sm tracking-wider active:translate-y-0.5 cursor-pointer"
        >
          <Camera size={20} />
          <span>{lang === 'fr' ? 'Prendre la photo' : 'Tirar a foto'}</span>
        </button>
      </div>
    </div>,
    document.body
  );
};
