import React from 'react';
import { Eye } from 'lucide-react';

interface EditSignalPreviewProps {
  resolvedImage: string;
  showSealFallback: boolean;
  initials: string;
  signalName: string;
  isSinglePhoto: boolean;
  isReprocessing: boolean;
  activeFrameIdx: number;
  totalFramesCount: number;
  framesList: string[];
  bpm: number;
  lang: 'fr' | 'pt';
  onSelectFrame: (idx: number) => void;
  onImgError: () => void;
}

export const EditSignalPreview: React.FC<EditSignalPreviewProps> = ({
  resolvedImage,
  showSealFallback,
  initials,
  signalName,
  isSinglePhoto,
  isReprocessing,
  activeFrameIdx,
  totalFramesCount,
  framesList,
  bpm,
  lang,
  onSelectFrame,
  onImgError,
}) => {
  return (
    <div className="flex flex-col items-center gap-2 bg-black/5 p-3 border border-[var(--cordel-border)]/30 w-full">
      <div className="flex justify-between items-center w-full">
        <span className="text-[10px] font-cactus font-bold uppercase opacity-75 flex items-center gap-1">
          <Eye size={12} className="text-[var(--cordel-wood)]" />
          <span>{lang === 'fr' ? 'Aperçu actuel :' : 'Visualização atual :'}</span>
        </span>
        <span className="text-[9px] font-cactus opacity-60">
          {isSinglePhoto
            ? lang === 'fr' ? '1 photo fixe' : '1 foto fixa'
            : `${totalFramesCount} trames (BPM: ${bpm})`}
        </span>
      </div>

      <div className="relative w-full max-w-[340px] aspect-square mx-auto border-3 border-[var(--cordel-border)] bg-black/10 overflow-hidden cordel-shadow flex items-center justify-center">
        {!showSealFallback ? (
          <img
            src={resolvedImage}
            alt={signalName}
            onError={onImgError}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-[#f4ecd8] flex flex-col items-center justify-center p-2 text-center border-2 border-dashed border-[#1a1a1a]/40">
            <div className="w-12 h-12 rounded-full border-2 border-[#1a1a1a] flex items-center justify-center font-cactus font-bold text-xl text-[var(--cordel-wood)] mb-1 bg-black/5">
              {initials}
            </div>
            <span className="text-[9px] font-cactus font-bold uppercase text-black/70 leading-tight">
              {lang === 'fr' ? 'Image à renouveler' : 'Imagem a renovar'}
            </span>
          </div>
        )}

        {!isSinglePhoto && (
          <div className="absolute top-1 left-1 bg-black/80 text-white text-[9px] font-cactus font-bold px-1.5 py-0.5">
            T{activeFrameIdx + 1} / {totalFramesCount}
          </div>
        )}

        {isReprocessing && (
          <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      {!isSinglePhoto && framesList.length > 0 && (
        <div className="flex gap-1.5 mt-1 overflow-x-auto max-w-full">
          {framesList.map((frameSrc, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => onSelectFrame(idx)}
              className={`relative w-9 h-9 border-2 overflow-hidden cursor-pointer transition-all shrink-0 ${
                activeFrameIdx === idx
                  ? 'border-[var(--cordel-wood)] ring-2 ring-[var(--cordel-wood)] scale-105'
                  : 'border-[var(--cordel-border)]/60 opacity-80 hover:opacity-100'
              }`}
            >
              <img src={frameSrc} alt={`T${idx + 1}`} className="w-full h-full object-cover" />
              <span className="absolute bottom-0 inset-x-0 bg-black/80 text-white text-[7px] text-center font-cactus font-bold">
                T{idx + 1}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
