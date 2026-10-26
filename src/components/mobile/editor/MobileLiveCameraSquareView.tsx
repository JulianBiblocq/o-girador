import React from 'react';
import { Camera, SwitchCamera, X, Layers } from 'lucide-react';
import { tMobile } from '../../../i18n/mobileTranslations';
import { CameraTimerSelector } from '../../signals/photobooth/CameraTimerSelector';
import { CameraGhostOverlay } from '../../signals/photobooth/CameraGhostOverlay';
import { CameraTimerSec } from '../../signals/photobooth/useCameraTimerCountdown';

interface Props {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  facingMode: 'user' | 'environment'; mode: 'single' | 'four' | 'batch';
  capturedCount: number; errorMsg: string | null; lang: 'fr' | 'pt';
  timerSec: CameraTimerSec; onSelectTimer: (sec: CameraTimerSec) => void;
  isCountingDown: boolean; countdownNumber: number;
  isGhostActive: boolean; onToggleGhost: () => void;
  ghostReferenceImage?: string | null; onFlipCamera: () => void;
  onCaptureClick: () => void; onClose: () => void;
}

export const MobileLiveCameraSquareView: React.FC<Props> = ({
  videoRef, facingMode, mode, capturedCount, errorMsg, lang, timerSec, onSelectTimer,
  isCountingDown, countdownNumber, isGhostActive, onToggleGhost, ghostReferenceImage,
  onFlipCamera, onCaptureClick, onClose,
}) => {
  return (
    <div className="w-full max-w-[360px] aspect-square mx-auto overflow-hidden border-2 border-[var(--cordel-border)] relative bg-black flex items-center justify-center select-none shadow-[2px_2px_0px_#000]">
      {errorMsg ? (
        <div className="text-red-400 text-xs font-mono text-center p-4">{errorMsg}</div>
      ) : (
        <video
          ref={videoRef} playsInline muted autoPlay
          className={`w-full h-full aspect-square object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
        />
      )}

      {/* Guide Fantôme & Réticule */}
      <CameraGhostOverlay isActive={isGhostActive} ghostReferenceImage={ghostReferenceImage} />

      {/* Grand Décompte Retardateur */}
      {isCountingDown && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center pointer-events-none select-none z-30">
          <span className="font-cactus text-8xl font-black text-[#ffd369] animate-pulse">{countdownNumber}</span>
        </div>
      )}

      {/* Barre supérieure : Titre / Trame + Ghost + Fermer */}
      <div className="absolute top-2 left-2 right-2 flex justify-between items-center z-10 px-2 py-1 bg-black/60 backdrop-blur-xs border border-white/20 rounded-xs">
        <span className="font-cactus font-bold text-xs uppercase text-white tracking-wider">
          {mode === 'four' ? (lang === 'fr' ? `Trame ${capturedCount + 1} / 4` : `Quadro ${capturedCount + 1} / 4`) : tMobile(lang, 'photoCapture')}
        </span>
        <div className="flex items-center gap-1.5">
          <button
            type="button" onClick={onToggleGhost}
            className={`p-1 rounded-xs border cursor-pointer transition-colors ${isGhostActive ? 'bg-[#ffd369] text-black border-[#ffd369]' : 'text-white/80 border-white/20 hover:bg-white/20'}`}
            title="Guide Fantôme (Onion Skin)"
          >
            <Layers size={14} />
          </button>
          <button type="button" onClick={onClose} title={tMobile(lang, 'closeCamera')} className="text-white hover:text-[#b94a2c] p-0.5 cursor-pointer">
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Barre inférieure : Inverser + Retardateur + Déclencheur */}
      <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between px-2 py-1.5 z-10 bg-black/60 backdrop-blur-xs border border-white/20 rounded-xs">
        <button
          type="button" onClick={onFlipCamera}
          className="p-2 rounded-full bg-white/20 text-white hover:bg-white/30 cursor-pointer"
          title={tMobile(lang, 'flipCamera')}
        >
          <SwitchCamera size={16} />
        </button>

        {mode !== 'four' && (
          <CameraTimerSelector timerSec={timerSec} onSelectTimer={onSelectTimer} disabled={isCountingDown} />
        )}

        <button
          type="button" disabled={isCountingDown} onClick={onCaptureClick}
          className="w-12 h-12 rounded-full bg-white border-4 border-[#8b2a1a] flex items-center justify-center shadow-lg active:scale-90 transition-transform cursor-pointer disabled:opacity-50"
          title={tMobile(lang, 'triggerCapture')}
        >
          <Camera size={22} className="text-[#8b2a1a]" />
        </button>

        {mode === 'four' && (
          <div className="w-8 text-center font-mono font-bold text-xs text-white">{capturedCount}/4</div>
        )}
      </div>
    </div>
  );
};
