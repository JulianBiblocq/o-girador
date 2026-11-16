import React, { useState, useRef, useCallback } from 'react';
import { BaqueInstrumentDef } from './landingAudio';

interface LandingInstrumentCardProps {
  instrument: BaqueInstrumentDef;
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
      className={`cordel-instrument-card w-full max-w-[124px] flex flex-col items-center p-2 sm:p-2.5 bg-[var(--cordel-surface)] hover:bg-[var(--cordel-surface-elevated)] border-2 border-[var(--cordel-border-strong)] rounded-sm cordel-wood-shadow-sm cursor-pointer group select-none transition-all duration-100 active:scale-95 ${
        isHit ? 'ring-2 ring-[var(--cordel-accent-readable)] bg-[var(--cordel-surface-elevated)]' : ''
      }`}
      title={isFr ? `${instrument.name} : ${activeLabel} (cliquez pour écouter et changer de coup)` : `${instrument.name} : ${activeLabel} (toque para ouvir e mudar o toque)`}
    >
      <div className={`w-11 h-11 sm:w-13 sm:h-13 flex items-center justify-center text-[var(--cordel-text)] group-hover:text-[var(--cordel-accent-readable)] transition-all ${
        isHit ? 'scale-110 text-[var(--cordel-accent-readable)]' : ''
      }`}>
        <Icon />
      </div>

      <span className="font-cactus font-bold text-xs sm:text-sm mt-1 uppercase text-[var(--cordel-text)] tracking-tight">
        {instrument.name}
      </span>

      <div className="flex flex-col items-center mt-1 w-full">
        <span className="text-[10px] sm:text-[11px] text-[var(--cordel-accent-readable)] font-serif italic font-semibold leading-tight text-center truncate max-w-full px-1">
          {activeLabel}
        </span>
        <div className="flex items-center justify-center gap-1 mt-1 opacity-75 group-hover:opacity-100">
          {instrument.strokes.map((_, idx) => (
            <span
              key={idx}
              className={`w-1.5 h-1.5 rounded-full transition-all ${
                idx === strokeIdx ? 'bg-[var(--cordel-accent-readable)] scale-125' : 'bg-[var(--cordel-text)]/30'
              }`}
            />
          ))}
        </div>
      </div>
    </button>
  );
});
