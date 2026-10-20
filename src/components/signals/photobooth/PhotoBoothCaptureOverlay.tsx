import React from 'react';

interface PhotoBoothCaptureOverlayProps {
  phase: 'idle' | 'repositioning' | 'beat_countdown' | 'processing' | 'review';
  videoRef: React.RefObject<HTMLVideoElement | null>;
  beatNumberElRef: React.RefObject<HTMLDivElement | null>;
  flashElRef: React.RefObject<HTMLDivElement | null>;
  sasCountdown: number;
  currentStepIdx: number;
  beatsCount: number;
  lang: 'fr' | 'pt';
}

export const PhotoBoothCaptureOverlay: React.FC<PhotoBoothCaptureOverlayProps> = ({
  phase,
  videoRef,
  beatNumberElRef,
  flashElRef,
  sasCountdown,
  currentStepIdx,
  beatsCount,
  lang,
}) => {
  return (
    <div className="relative w-full aspect-square bg-[#1a1a1a] rounded-sm overflow-hidden border-2 border-black flex items-center justify-center shadow-[3px_3px_0px_#000]">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-cover scale-x-[-1]"
      />

      {/* Réticule de cadrage carré 1:1 */}
      <div className="absolute inset-4 border border-dashed border-[#ffd369]/60 pointer-events-none flex items-center justify-center">
        <div className="w-8 h-[1px] bg-[#ffd369]/60 absolute" />
        <div className="h-8 w-[1px] bg-[#ffd369]/60 absolute" />
      </div>

      {/* Sas de repositionnement (3, 2, 1) */}
      {phase === 'repositioning' && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center text-[#f4ecd8] select-none">
          <span className="font-cactus text-sm font-bold uppercase tracking-wider text-[#ffd369]">
            {lang === 'fr'
              ? `Préparez le geste ${currentStepIdx + 1} / ${beatsCount}`
              : `Prepare o gesto ${currentStepIdx + 1} / ${beatsCount}`}
          </span>
          <span className="font-cactus text-7xl font-black text-white mt-1 animate-pulse">
            {sasCountdown}
          </span>
        </div>
      )}

      {/* Décompte métronome pulsé (Temps 1..N) */}
      {phase === 'beat_countdown' && (
        <div className="absolute inset-0 flex flex-col items-center justify-between p-4 pointer-events-none select-none">
          <div className="bg-black/70 px-3 py-1 rounded-full text-xs font-bold text-[#ffd369] font-cactus uppercase">
            {lang === 'fr'
              ? `Geste ${currentStepIdx + 1} sur ${beatsCount}`
              : `Gesto ${currentStepIdx + 1} de ${beatsCount}`}
          </div>
          <div
            ref={beatNumberElRef}
            className="font-cactus text-9xl font-black text-[#f4ecd8] drop-shadow-[0_4px_12px_rgba(0,0,0,0.9)] opacity-85"
          >
            1
          </div>
          <div className="text-[10px] font-bold text-white/80 bg-black/50 px-2 py-0.5 rounded">
            {lang === 'fr' ? 'Capture sur le dernier temps !' : 'Captura no último tempo!'}
          </div>
        </div>
      )}

      {/* Flash d'obturateur plein écran WAAPI */}
      <div
        ref={flashElRef}
        className="absolute inset-0 bg-white pointer-events-none opacity-0 will-change-[opacity]"
      />

      {/* Écran de traitement en cours */}
      {phase === 'processing' && (
        <div className="absolute inset-0 bg-[#1a1a1a]/90 backdrop-blur-sm flex flex-col items-center justify-center text-[#f4ecd8] gap-3">
          <span className="text-4xl animate-spin">⚙️</span>
          <span className="font-cactus text-lg font-bold text-[#ffd369]">
            {lang === 'fr' ? 'Gravure Cordel en cours...' : 'Gravura Cordel em andamento...'}
          </span>
        </div>
      )}
    </div>
  );
};
