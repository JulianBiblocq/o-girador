import React, { useState, useRef, useCallback } from 'react';
import { BateriaInstrumentDef } from './landingAudio';

interface LandingInstrumentCardProps {
  instrument: BateriaInstrumentDef;
  isFr: boolean;
  onPlayStroke: (instId: string, strokeSymbol: string, strokeFile: string) => void;
}

export const LandingInstrumentCard: React.FC<LandingInstrumentCardProps> = React.memo(({
  instrument,
  isFr,
  onPlayStroke,
}) => {
  const [strokeIdx, setStrokeIdx] = useState(0);
  const [isHit, setIsHit] = useState(false);
  const hitTimeoutRef = useRef<number | null>(null);

  const totalStrokes = instrument.strokes.length;
  const currentStroke = instrument.strokes[strokeIdx];

  const handleClick = useCallback(() => {
    onPlayStroke(instrument.id, currentStroke.symbol, currentStroke.file);
    setIsHit(true);
    if (hitTimeoutRef.current) window.clearTimeout(hitTimeoutRef.current);
    hitTimeoutRef.current = window.setTimeout(() => setIsHit(false), 180);
    setStrokeIdx((prev) => (prev + 1) % totalStrokes);
  }, [instrument.id, currentStroke, totalStrokes, onPlayStroke]);

  const activeLabel = isFr ? currentStroke.labelFr : currentStroke.labelPt;
  const Icon = instrument.Icon;

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`cordel-instrument-card w-full max-w-[124px] flex flex-col items-center p-2 sm:p-2.5 bg-[#eaddcf]/50 hover:bg-[#eaddcf] border-2 border-[#1a1a1a] rounded-sm cordel-wood-shadow-sm cursor-pointer group select-none transition-all duration-100 active:scale-95 ${
        isHit ? 'ring-2 ring-[#8b2a1a] bg-[#eaddcf]' : ''
      }`}
      title={isFr ? `${instrument.name} : ${activeLabel} (cliquez pour écouter et changer de coup)` : `${instrument.name} : ${activeLabel} (toque para ouvir e mudar o toque)`}
    >
      <div className={`w-11 h-11 sm:w-13 sm:h-13 flex items-center justify-center text-[#1a1a1a] group-hover:text-[#8b2a1a] transition-all ${
        isHit ? 'scale-110 text-[#8b2a1a]' : ''
      }`}>
        <Icon />
      </div>

      <span className="font-cactus font-bold text-xs sm:text-sm mt-1 uppercase text-[#1a1a1a] tracking-tight">
        {instrument.name}
      </span>

      <div className="flex flex-col items-center mt-1 w-full">
        <span className="text-[10px] sm:text-[11px] text-[#8b2a1a] font-serif italic font-semibold leading-tight text-center truncate max-w-full px-1">
          {activeLabel}
        </span>
        <div className="flex items-center justify-center gap-1 mt-1 opacity-70 group-hover:opacity-100">
          {instrument.strokes.map((_, idx) => (
            <span
              key={idx}
              className={`w-1.5 h-1.5 rounded-full transition-all ${
                idx === strokeIdx ? 'bg-[#8b2a1a] scale-125' : 'bg-[#1a1a1a]/30'
              }`}
            />
          ))}
        </div>
      </div>
    </button>
  );
});
