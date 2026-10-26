import React from 'react';
import { Loader2, SwitchCamera, Layers } from 'lucide-react';
import { CameraGhostOverlay } from './CameraGhostOverlay';

interface PhotoBoothCaptureOverlayProps {
  phase: 'idle' | 'repositioning' | 'beat_countdown' | 'processing' | 'review';
  videoRef: React.RefObject<HTMLVideoElement | null>;
  beatNumberElRef: React.RefObject<HTMLDivElement | null>;
  flashElRef: React.RefObject<HTMLDivElement | null>;
  sasCountdown: number; currentStepIdx: number; beatsCount: number; lang: 'fr' | 'pt';
  facingMode?: 'user' | 'environment'; isGhostActive?: boolean; onToggleGhost?: () => void;
  ghostReferenceImage?: string | null; onFlipCamera?: () => void;
  isCountingDown?: boolean; countdownNumber?: number;
}

export const PhotoBoothCaptureOverlay: React.FC<PhotoBoothCaptureOverlayProps> = ({
  phase, videoRef, beatNumberElRef, flashElRef, sasCountdown, currentStepIdx, beatsCount,
  lang, facingMode = 'user', isGhostActive = false, onToggleGhost, ghostReferenceImage,
  onFlipCamera, isCountingDown = false, countdownNumber = 3,
}) => {
  return (
    <div className="relative w-full aspect-square bg-[#1a1a1a] rounded-sm overflow-hidden border-2 border-black flex items-center justify-center shadow-[3px_3px_0px_#000]">
      <video
        ref={videoRef} autoPlay playsInline muted
        className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
      />
      <CameraGhostOverlay isActive={isGhostActive} ghostReferenceImage={ghostReferenceImage} />

      {!isGhostActive && (
        <div className="absolute inset-4 border border-dashed border-[#ffd369]/60 pointer-events-none flex items-center justify-center">
          <div className="w-8 h-[1px] bg-[#ffd369]/60 absolute" />
          <div className="h-8 w-[1px] bg-[#ffd369]/60 absolute" />
        </div>
      )}

      {phase === 'idle' && (
        <div className="absolute top-2 right-2 flex items-center gap-1.5 z-20">
          {onToggleGhost && (
            <button
              type="button" onClick={onToggleGhost}
              className={`p-1.5 rounded-xs border cursor-pointer transition-colors shadow-xs ${isGhostActive ? 'bg-[#ffd369] text-black border-[#ffd369]' : 'bg-black/60 text-white/90 border-white/30 hover:bg-black/80'}`}
              title="Guide Fantôme (Onion Skin)"
            >
              <Layers size={15} />
            </button>
          )}
          {onFlipCamera && (
            <button
              type="button" onClick={onFlipCamera}
              className="p-1.5 bg-black/60 text-white/90 border border-white/30 rounded-xs hover:bg-black/80 cursor-pointer shadow-xs"
              title="Inverser caméra"
            >
              <SwitchCamera size={15} />
            </button>
          )}
        </div>
      )}

      {isCountingDown && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center pointer-events-none select-none z-30">
          <span className="font-cactus text-8xl font-black text-[#ffd369] animate-pulse">{countdownNumber}</span>
        </div>
      )}

      {phase === 'repositioning' && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center text-[#f4ecd8] select-none z-20">
          <span className="font-cactus text-sm font-bold uppercase tracking-wider text-[#ffd369]">
            {lang === 'fr' ? `Préparez le geste ${currentStepIdx + 1} / ${beatsCount}` : `Prepare o gesto ${currentStepIdx + 1} / ${beatsCount}`}
          </span>
          <span className="font-cactus text-7xl font-black text-white mt-1 animate-pulse">{sasCountdown}</span>
        </div>
      )}

      {phase === 'beat_countdown' && (
        <div className="absolute inset-0 flex flex-col items-center justify-between p-4 pointer-events-none select-none z-20">
          <div className="bg-black/70 px-3 py-1 rounded-full text-xs font-bold text-[#ffd369] font-cactus uppercase">
            {lang === 'fr' ? `Geste ${currentStepIdx + 1} sur ${beatsCount}` : `Gesto ${currentStepIdx + 1} de ${beatsCount}`}
          </div>
          <div ref={beatNumberElRef} className="font-cactus text-9xl font-black text-[#f4ecd8] drop-shadow-[0_4px_12px_rgba(0,0,0,0.9)] opacity-85">1</div>
          <div className="text-[10px] font-bold text-white/80 bg-black/50 px-2 py-0.5 rounded">
            {lang === 'fr' ? 'Capture sur le dernier temps !' : 'Captura no último tempo!'}
          </div>
        </div>
      )}

      <div ref={flashElRef} className="absolute inset-0 bg-white pointer-events-none opacity-0 will-change-[opacity] z-30" />

      {phase === 'processing' && (
        <div className="absolute inset-0 bg-[#1a1a1a]/90 backdrop-blur-sm flex flex-col items-center justify-center text-[#f4ecd8] gap-3 z-30">
          <Loader2 className="w-10 h-10 animate-spin text-[#ffd369]" />
          <span className="font-cactus text-lg font-bold text-[#ffd369]">
            {lang === 'fr' ? 'Gravure Cordel en cours...' : 'Gravura Cordel em andamento...'}
          </span>
        </div>
      )}
    </div>
  );
};
