
import React from 'react';

export interface AudioAlignmentWaveformViewProps {
  waveformContainerRef: React.RefObject<HTMLDivElement | null>;
  bufferPxWidth: number;
  canvasHeight: number;
  waveformCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  trimOverlayCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  trimStartSec: number;
  trimEndSec: number;
  pixelsPerSecond: number;
  lang: string;
  handleWaveformPointerDown: (e: React.PointerEvent<HTMLDivElement>) => void;
  handleWaveformPointerMove: (e: React.PointerEvent<HTMLDivElement>) => void;
  handleWaveformPointerUp: (e: React.PointerEvent<HTMLDivElement>) => void;
  handleTrimPointerDown: (e: React.PointerEvent<HTMLDivElement>, type: 'start' | 'end') => void;
  handleTrimPointerMove: (e: React.PointerEvent<HTMLDivElement>, type: 'start' | 'end') => void;
  handleTrimPointerUp: (e: React.PointerEvent<HTMLDivElement>, type: 'start' | 'end') => void;
}

export const AudioAlignmentWaveformView: React.FC<AudioAlignmentWaveformViewProps> = React.memo((props) => {
  const {
    waveformContainerRef, bufferPxWidth, canvasHeight, waveformCanvasRef,
    trimOverlayCanvasRef, trimStartSec, trimEndSec, pixelsPerSecond, lang,
    handleWaveformPointerDown, handleWaveformPointerMove, handleWaveformPointerUp,
    handleTrimPointerDown, handleTrimPointerMove, handleTrimPointerUp,
  } = props;

  return (
    <div
      ref={waveformContainerRef}
      style={{ willChange: 'transform', width: `${bufferPxWidth}px` }}
      className="absolute top-0 bottom-0 left-0 z-10 will-change-transform"
    >
      <div
        className="h-full w-full cursor-grab active:cursor-grabbing select-none"
        style={{ touchAction: 'none' }}
        onPointerDown={handleWaveformPointerDown}
        onPointerMove={handleWaveformPointerMove}
        onPointerUp={handleWaveformPointerUp}
        onPointerCancel={handleWaveformPointerUp}
        title={lang === 'fr' ? 'Cliquer et glisser pour caler le chant sur la timeline' : 'Clique e arraste para alinhar o canto na linha do tempo'}
      >
        <canvas ref={waveformCanvasRef} className="h-full block pointer-events-none" height={canvasHeight} />
        <canvas ref={trimOverlayCanvasRef} className="absolute top-0 bottom-0 left-0 h-full pointer-events-none z-10" height={canvasHeight} />
      </div>

      <div
        style={{ left: `${trimStartSec * pixelsPerSecond}px`, touchAction: 'none' }}
        className="absolute top-0 bottom-0 -translate-x-1/2 w-6 z-30 cursor-ew-resize flex flex-col items-center group"
        onPointerDown={(e) => handleTrimPointerDown(e, 'start')}
        onPointerMove={(e) => handleTrimPointerMove(e, 'start')}
        onPointerUp={(e) => handleTrimPointerUp(e, 'start')}
        onPointerCancel={(e) => handleTrimPointerUp(e, 'start')}
        title={`Trim Début : ${trimStartSec.toFixed(3)}s`}
      >
        <div className="w-[3px] h-full bg-[#2a5d4e] group-hover:bg-[#34d399] shadow-[0_0_6px_rgba(42,93,78,0.8)]" />
        <div className="absolute top-0 px-1 py-0.5 bg-[#2a5d4e] text-white text-[8px] font-black uppercase font-mono tracking-tighter whitespace-nowrap border border-[#1a1a1a] shadow-[1px_1px_0px_#1a1a1a] group-hover:scale-110 transition-transform pointer-events-none">
          {lang === 'fr' ? 'DÉBUT' : 'INÍCIO'}
        </div>
      </div>

      <div
        style={{ left: `${trimEndSec * pixelsPerSecond}px`, touchAction: 'none' }}
        className="absolute top-0 bottom-0 -translate-x-1/2 w-6 z-30 cursor-ew-resize flex flex-col items-center group"
        onPointerDown={(e) => handleTrimPointerDown(e, 'end')}
        onPointerMove={(e) => handleTrimPointerMove(e, 'end')}
        onPointerUp={(e) => handleTrimPointerUp(e, 'end')}
        onPointerCancel={(e) => handleTrimPointerUp(e, 'end')}
        title={`Trim Fin : ${trimEndSec.toFixed(3)}s`}
      >
        <div className="w-[3px] h-full bg-[#8b2a1a] group-hover:bg-[#ef4444] shadow-[0_0_6px_rgba(139,42,26,0.8)]" />
        <div className="absolute top-0 px-1 py-0.5 bg-[#8b2a1a] text-white text-[8px] font-black uppercase font-mono tracking-tighter whitespace-nowrap border border-[#1a1a1a] shadow-[1px_1px_0px_#1a1a1a] group-hover:scale-110 transition-transform pointer-events-none">
          {lang === 'fr' ? 'FIN' : 'FIM'}
        </div>
      </div>
    </div>
  );
});

AudioAlignmentWaveformView.displayName = 'AudioAlignmentWaveformView';
