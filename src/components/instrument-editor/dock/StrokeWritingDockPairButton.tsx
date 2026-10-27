import React, { useCallback } from 'react';
import * as Tone from 'tone';
import { isDarkText } from '../../../data';
import { audioEngine } from '../../../hooks/useAudioSync';

interface StrokeWritingDockPairButtonProps {
  trackId?: number;
  pair: any;
  instrument: any;
  activeTool: string;
  isScissorsActive: boolean;
  isEraserActive: boolean;
  isFr: boolean;
  onSelectTool: (tool: string) => void;
}

export const StrokeWritingDockPairButton: React.FC<StrokeWritingDockPairButtonProps> = React.memo(({
  trackId, pair, instrument, activeTool, isScissorsActive, isEraserActive, isFr, onSelectTool,
}) => {
  const strokes = pair.strokes && pair.strokes.length > 0 ? pair.strokes : [pair.strong];
  const strokeSymbols = strokes.map((s: any) => s.symbol);
  const currentStrokeIdx = strokeSymbols.indexOf(activeTool);
  const isFamilyActive = !isScissorsActive && !isEraserActive && (
    currentStrokeIdx !== -1 || pair.id === activeTool || pair.strong?.symbol === activeTool
  );

  const displayedStroke = isFamilyActive && currentStrokeIdx !== -1
    ? strokes[currentStrokeIdx]
    : strokes[0];

  const bgCol = instrument.colors?.[displayedStroke.colorKey] || instrument.colors?.[displayedStroke.symbol] || instrument.colors?.[pair.strong.colorKey] || '#666';
  const isDark = isDarkText(instrument?.id, displayedStroke.symbol, bgCol);
  const txtCol = isDark ? '#1a1a1a' : '#f4ecd8';
  const strokeChain = strokeSymbols.join(' / ');

  const playPreview = useCallback((symbol: string) => {
    if (trackId !== undefined && audioEngine && symbol && symbol !== '0') {
      try {
        audioEngine.playNote(trackId, String(symbol), Tone.now(), 0.8, 1.0);
      } catch (_) {}
    }
  }, [trackId]);

  const handleClick = () => {
    let nextStroke: string;
    if (!isFamilyActive || currentStrokeIdx === -1) {
      nextStroke = strokeSymbols[0];
    } else {
      const nextIdx = (currentStrokeIdx + 1) % strokeSymbols.length;
      nextStroke = strokeSymbols[nextIdx];
    }
    onSelectTool(nextStroke);
    playPreview(nextStroke);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const currentIdx = currentStrokeIdx !== -1 ? currentStrokeIdx : 0;
    const nextIdx = e.deltaY > 0
      ? (currentIdx + 1) % strokeSymbols.length
      : (currentIdx - 1 + strokeSymbols.length) % strokeSymbols.length;
    const nextStroke = strokeSymbols[nextIdx];
    onSelectTool(nextStroke);
    playPreview(nextStroke);
  };

  return (
    <button
      key={pair.id}
      type="button"
      onClick={handleClick}
      onWheel={handleWheel}
      className={`group flex items-center gap-1.5 px-2.5 py-1.5 rounded-sm border-[2px] transition-all cursor-pointer select-none shrink-0 active:scale-95 ${
        isFamilyActive
          ? 'border-[#8b2a1a] bg-[#f4ecd8] shadow-[2px_2px_0px_#8b2a1a] scale-105 z-10'
          : 'border-[#1a1a1a] bg-[#fdfbf7] hover:bg-[#f4ecd8] shadow-[1px_1px_0px_#1a1a1a]'
      }`}
      title={`${pair.mainLabel} (${strokeChain}) — ${isFr ? 'Clic / Molette: Variantes | Raccourci' : 'Clique / Roda: Variantes | Tecla'}: ${pair.strong.shortcut}`}
    >
      <div
        className="w-7 h-7 rounded-sm flex items-center justify-center font-bold text-xs shadow-inner transition-colors border border-[#1a1a1a]/20"
        style={{ backgroundColor: bgCol, color: txtCol }}
      >
        {displayedStroke.symbol}
      </div>

      <div className="flex flex-col items-start leading-tight min-w-0">
        <span className={`text-[11px] font-cactus font-bold truncate max-w-[80px] sm:max-w-[105px] ${
          isFamilyActive ? 'text-[#8b2a1a]' : 'text-[#1a1a1a]'
        }`}>
          {pair.mainLabel}
        </span>
        <span className="text-[9px] text-[#666] font-mono">
          {strokeChain} [{pair.strong.shortcut}]
        </span>
      </div>
    </button>
  );
});

StrokeWritingDockPairButton.displayName = 'StrokeWritingDockPairButton';
