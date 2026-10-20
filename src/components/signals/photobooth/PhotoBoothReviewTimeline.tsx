import React from 'react';

interface PhotoBoothReviewTimelineProps {
  frames: string[];
  selectedFrameIndex: number;
  activePlayheadIndex: number;
  isPlaying: boolean;
  bpm: number;
  lang: 'fr' | 'pt';
  onSelectFrame: (idx: number) => void;
  onTogglePlay: () => void;
  onBpmChange: (newBpm: number) => void;
}

export const PhotoBoothReviewTimeline: React.FC<PhotoBoothReviewTimelineProps> = ({
  frames,
  selectedFrameIndex,
  activePlayheadIndex,
  isPlaying,
  bpm,
  lang,
  onSelectFrame,
  onTogglePlay,
  onBpmChange,
}) => {
  const currentPreviewFrame = isPlaying
    ? frames[activePlayheadIndex] || frames[0]
    : frames[selectedFrameIndex] || frames[0];

  return (
    <div className="flex flex-col gap-3">
      {/* Aperçu central 1:1 de la frame active */}
      <div className="relative w-full aspect-square bg-[#1a1a1a] rounded-sm overflow-hidden border-2 border-black flex items-center justify-center shadow-[3px_3px_0px_#000]">
        {currentPreviewFrame ? (
          <img src={currentPreviewFrame} alt="Frame active" className="w-full h-full object-contain" />
        ) : (
          <span className="text-white text-xs opacity-50">Aucune image</span>
        )}
        <div className="absolute top-2 left-2 bg-black/75 px-2 py-0.5 rounded text-[10px] font-cactus font-bold text-[#ffd369] uppercase">
          {isPlaying
            ? `${lang === 'fr' ? 'Lecture' : 'Reprodução'} : ${activePlayheadIndex + 1} / ${frames.length}`
            : `${lang === 'fr' ? 'Trame' : 'Quadro'} : ${selectedFrameIndex + 1} / ${frames.length}`}
        </div>
      </div>

      {/* Barre de contrôle du transport */}
      <div className="flex items-center justify-between bg-[#eaddcf]/50 p-2 border border-black/15 rounded-sm">
        <button
          type="button"
          onClick={onTogglePlay}
          className={`px-3 py-1 font-cactus font-bold text-xs uppercase border border-black cursor-pointer shadow-[1.5px_1.5px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none flex items-center gap-1.5 ${
            isPlaying ? 'bg-[#8b2a1a] text-[#f4ecd8]' : 'bg-white text-black hover:bg-black hover:text-white'
          }`}
        >
          {isPlaying ? '⏸' : '▶'} {isPlaying ? (lang === 'fr' ? 'Figer' : 'Pausar') : lang === 'fr' ? 'Animer au tempo' : 'Animar no tempo'}
        </button>

        <div className="flex items-center gap-1 text-xs font-bold">
          <span>⏱️</span>
          <button type="button" onClick={() => onBpmChange(Math.max(40, bpm - 5))} className="w-5 h-5 bg-white border border-black cursor-pointer hover:bg-black hover:text-white">-</button>
          <span className="w-10 text-center font-cactus">{bpm}</span>
          <button type="button" onClick={() => onBpmChange(Math.min(240, bpm + 5))} className="w-5 h-5 bg-white border border-black cursor-pointer hover:bg-black hover:text-white">+</button>
          <span className="text-[10px] opacity-70">BPM</span>
        </div>
      </div>

      {/* Vignettes cliquables de la timeline */}
      <div className="flex gap-1.5 overflow-x-auto p-1 bg-[#1a1a1a]/5 border border-black/15 rounded-sm">
        {frames.map((frame, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => onSelectFrame(idx)}
            className={`relative w-14 h-14 shrink-0 rounded-xs overflow-hidden border-2 cursor-pointer transition-transform ${
              selectedFrameIndex === idx
                ? 'border-[#8b2a1a] scale-105 shadow-[2px_2px_0px_#8b2a1a]'
                : 'border-black/30 hover:border-black opacity-80'
            }`}
          >
            <img src={frame} alt={`Thumb ${idx + 1}`} className="w-full h-full object-cover" />
            <span className="absolute bottom-0 right-0 bg-black/80 text-[8px] font-bold text-white px-1">
              {idx + 1}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};
