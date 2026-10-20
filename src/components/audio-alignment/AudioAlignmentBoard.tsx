/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AudioAlignmentStaticGridCanvas } from './AudioAlignmentStaticGridCanvas';
import { AudioAlignmentWaveformView } from './AudioAlignmentWaveformView';
import { Pattern } from '../../types/store.types';

export interface AudioAlignmentBoardProps {
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
  totalBoardWidth: number;
  canvasHeight: number;
  temps1Px: number;
  effectiveMeasure: number;
  lang: string;
  staticGridCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  pattern: Pattern;
  isCompound: boolean;
  isCompoundPrev: boolean;
  beatsCount: number;
  beatDurationSec: number;
  pixelsPerSecond: number;
  patternMeasures: number;
  waveformContainerRef: React.RefObject<HTMLDivElement | null>;
  bufferPxWidth: number;
  waveformCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  trimOverlayCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  trimStartSec: number;
  trimEndSec: number;
  handleWheelScroll: (e: React.WheelEvent<HTMLDivElement>) => void;
  handleWaveformPointerDown: (e: React.PointerEvent<HTMLDivElement>) => void;
  handleWaveformPointerMove: (e: React.PointerEvent<HTMLDivElement>) => void;
  handleWaveformPointerUp: (e: React.PointerEvent<HTMLDivElement>) => void;
  handleTrimPointerDown: (e: React.PointerEvent<HTMLDivElement>, type: 'start' | 'end') => void;
  handleTrimPointerMove: (e: React.PointerEvent<HTMLDivElement>, type: 'start' | 'end') => void;
  handleTrimPointerUp: (e: React.PointerEvent<HTMLDivElement>, type: 'start' | 'end') => void;
}

export const AudioAlignmentBoard: React.FC<AudioAlignmentBoardProps> = React.memo((props) => {
  const {
    scrollContainerRef, totalBoardWidth, canvasHeight, temps1Px, effectiveMeasure, lang,
    staticGridCanvasRef, pattern, isCompound, isCompoundPrev, beatsCount, beatDurationSec,
    pixelsPerSecond, patternMeasures, waveformContainerRef, bufferPxWidth,
    waveformCanvasRef, trimOverlayCanvasRef, trimStartSec, trimEndSec,
    handleWheelScroll, handleWaveformPointerDown, handleWaveformPointerMove,
    handleWaveformPointerUp, handleTrimPointerDown, handleTrimPointerMove, handleTrimPointerUp,
  } = props;

  return (
    <div className="relative border-4 border-[#1a1a1a] bg-[#e2d8be] rounded-sm overflow-hidden shadow-[4px_4px_0px_#1a1a1a] flex flex-col">
      <div
        ref={scrollContainerRef}
        className="w-full overflow-x-auto overflow-y-hidden relative select-none scrollbar-thin scrollbar-thumb-[#8b2a1a]/40 scrollbar-track-[#e2d8be]"
        onWheel={handleWheelScroll}
      >
        <div style={{ width: `${totalBoardWidth}px` }} className="relative flex flex-col">
          <div className="h-7 bg-[#d7cbaf] border-b-2 border-[#1a1a1a] relative flex items-center px-3 pointer-events-none">
            <span className="text-[10px] font-bold text-[#1a1a1a]/80 uppercase tracking-wider">
              {lang === 'fr'
                ? "Glisser l'onde centrale pour caler le chant — Glisser les poignées DÉBUT/FIN pour rogner"
                : 'Arraste a onda central para alinhar o canto — Arraste as alças INÍCIO/FIM para cortar'}
            </span>
            <div style={{ left: `${temps1Px}px` }} className="absolute top-0 bottom-0 flex items-center -translate-x-1/2 z-30 pointer-events-none">
              <div className="px-2.5 py-0.5 bg-[#dc2626] text-white text-[9px] font-black uppercase tracking-wider border border-[#1a1a1a] shadow-[0_0_8px_rgba(220,38,38,0.8)] whitespace-nowrap">
                {lang === 'fr' ? `TEMPS 1 / CHANT (MESURE ${effectiveMeasure + 1})` : `TEMPO 1 / CANTO (COMPASSO ${effectiveMeasure + 1})`}
              </div>
            </div>
          </div>

          <div className="relative h-36 select-none">
            <AudioAlignmentStaticGridCanvas
              staticGridCanvasRef={staticGridCanvasRef} totalBoardWidth={totalBoardWidth}
              canvasHeight={canvasHeight} temps1Px={temps1Px} pattern={pattern}
              isCompound={isCompound} isCompoundPrev={isCompoundPrev} beatsCount={beatsCount}
              beatDurationSec={beatDurationSec} pixelsPerSecond={pixelsPerSecond} patternMeasures={patternMeasures}
            />

            <div
              style={{ left: `${temps1Px}px` }}
              className="absolute top-0 bottom-0 w-[2.5px] bg-[#dc2626] z-20 pointer-events-none shadow-[0_0_12px_rgba(220,38,38,0.9)]"
            />

            <AudioAlignmentWaveformView
              waveformContainerRef={waveformContainerRef} bufferPxWidth={bufferPxWidth} canvasHeight={canvasHeight}
              waveformCanvasRef={waveformCanvasRef} trimOverlayCanvasRef={trimOverlayCanvasRef}
              trimStartSec={trimStartSec} trimEndSec={trimEndSec} pixelsPerSecond={pixelsPerSecond} lang={lang}
              handleWaveformPointerDown={handleWaveformPointerDown} handleWaveformPointerMove={handleWaveformPointerMove}
              handleWaveformPointerUp={handleWaveformPointerUp} handleTrimPointerDown={handleTrimPointerDown}
              handleTrimPointerMove={handleTrimPointerMove} handleTrimPointerUp={handleTrimPointerUp}
            />
          </div>
        </div>
      </div>
    </div>
  );
});

AudioAlignmentBoard.displayName = 'AudioAlignmentBoard';
