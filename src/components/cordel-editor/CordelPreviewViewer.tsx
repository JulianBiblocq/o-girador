/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface CordelPreviewViewerProps {
  frames: string[];
  previewFrames: string[];
  selectedFrameIndex: number;
  setSelectedFrameIndex: (idx: number) => void;
  isPlaying: boolean;
  setIsPlaying: React.Dispatch<React.SetStateAction<boolean>>;
  activePlayheadIndex: number;
  frameOverrides: Record<number, any>;
  isProcessing: boolean;
  bpm: number;
  lang: string;
}

export const CordelPreviewViewer: React.FC<CordelPreviewViewerProps> = ({
  frames,
  previewFrames,
  selectedFrameIndex,
  setSelectedFrameIndex,
  isPlaying,
  setIsPlaying,
  activePlayheadIndex,
  frameOverrides,
  isProcessing,
  bpm,
  lang,
}) => {
  const isMultiFrame = frames.length > 1;
  const displayIndex = isPlaying ? activePlayheadIndex : selectedFrameIndex;
  const currentPreview = previewFrames[displayIndex] || previewFrames[0] || null;
  const currentHasOverride = Boolean(frameOverrides[displayIndex] && Object.keys(frameOverrides[displayIndex]!).length > 0);

  return (
    <>
      {isMultiFrame && (
        <div className="flex flex-col gap-1 bg-black/5 p-2 cordel-border-sm">
          <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 custom-scrollbar">
            {previewFrames.map((frame, idx) => {
              const isCurrentSelected = selectedFrameIndex === idx;
              const isCurrentPlaying = isPlaying && activePlayheadIndex === idx;
              const hasOverride = Boolean(frameOverrides[idx] && Object.keys(frameOverrides[idx]!).length > 0);
              return (
                <div
                  key={idx}
                  onClick={() => { setSelectedFrameIndex(idx); setIsPlaying(false); }}
                  className={`relative w-11 h-11 shrink-0 aspect-square border cursor-pointer transition-all ${
                    isCurrentSelected ? 'border-[var(--cordel-wood)] ring-2 ring-[var(--cordel-wood)] scale-105 z-10 shadow-[1px_1px_0px_#000]' : isCurrentPlaying ? 'border-[var(--cordel-text)] ring-2 ring-[var(--cordel-text)]/60 scale-100 z-10' : 'border-[var(--cordel-border)]/60 opacity-80 hover:opacity-100'
                  }`}
                  title={lang === 'fr' ? `Trame T${idx + 1}` : `Quadro T${idx + 1}`}
                >
                  <img src={frame} alt={`T${idx + 1}`} className="w-full h-full object-cover" />
                  <span className="absolute bottom-0 inset-x-0 bg-black/85 text-white text-[7px] text-center font-cactus font-bold leading-tight">T{idx + 1}</span>
                  {hasOverride && <span className="absolute top-0 right-0 bg-[var(--cordel-wood)] text-white text-[7px] font-bold px-0.5 leading-none shadow-xs"></span>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="relative aspect-square w-full bg-black/10 cordel-border-sm overflow-hidden flex items-center justify-center">
        {currentPreview ? (
          <img src={currentPreview} alt="preview" className="w-full h-full object-cover" />
        ) : (
          <div className="w-6 h-6 border-2 border-[var(--cordel-text)] border-t-transparent rounded-full animate-spin" />
        )}

        {isMultiFrame && (
          <div className="absolute top-1.5 left-1.5 bg-black/85 text-white text-[9px] font-cactus font-bold px-1.5 py-0.5 flex items-center gap-1 border border-white/20">
            <span>T{displayIndex + 1}</span>
            {isPlaying ? <span className="text-emerald-400 text-[8px]">▶ {lang === 'fr' ? 'LECTURE' : 'REPRODUÇÃO'}</span> : <span className="text-amber-300 text-[8px]">{lang === 'fr' ? 'FIGÉE' : 'FIXA'}</span>}
          </div>
        )}

        {currentHasOverride && (
          <div className="absolute top-1.5 right-1.5 bg-[var(--cordel-wood)] text-white text-[8px] font-cactus font-bold px-1.5 py-0.5 border border-white/30 flex items-center gap-1">
            <span>{lang === 'fr' ? 'DÉBRAYÉE' : 'DESACOPLADA'}</span>
          </div>
        )}

        {isProcessing && (
          <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center text-white z-10">
            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin mb-1" />
            <span className="text-[10px] font-cactus font-bold uppercase tracking-wider">{lang === 'fr' ? 'Traitement...' : 'Processando...'}</span>
          </div>
        )}
      </div>

      {isMultiFrame && (
        <div className="flex items-center justify-between px-2 py-1 bg-[var(--cordel-bg)] border border-[var(--cordel-border)] cordel-shadow-sm text-[10px]">
          <button
            type="button"
            onClick={() => setIsPlaying((p) => !p)}
            className={`px-2.5 py-0.5 font-cactus font-bold uppercase cordel-border-sm cursor-pointer flex items-center gap-1 transition-colors ${isPlaying ? 'bg-[var(--cordel-wood)] text-white hover:bg-[#a33220]' : 'bg-[var(--cordel-bg)] text-[var(--cordel-text)] hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)]'}`}
          >
            {isPlaying ? <><span></span> <span>{lang === 'fr' ? 'Pause' : 'Pausar'}</span></> : <><span>▶</span> <span>{lang === 'fr' ? 'Lecture' : 'Reproduzir'}</span></>}
          </button>
          <div className="flex items-center gap-1.5 text-[9px] font-cactus font-bold uppercase">
            <span className="px-1.5 py-0.5 bg-black/5 border border-[var(--cordel-border)]/30">{bpm} BPM</span>
            <span className="px-1.5 py-0.5 bg-black/5 border border-[var(--cordel-border)]/30">T{displayIndex + 1} / {frames.length}</span>
          </div>
        </div>
      )}
    </>
  );
};
