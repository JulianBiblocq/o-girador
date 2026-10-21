import React, { useEffect, useState } from 'react';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { subscribeToTick, unsubscribeFromTick } from '../../audio/visualTickBuffer';
import { getBeatsPerMeasure } from '../../utils/measureHelpers';

export const MobileVisualBeatPulse: React.FC = () => {
  const currentMeasure = useSequencerStore((s) => s.currentMeasure);
  const measureTimeSigs = useSequencerStore((s) => s.measureTimeSigs);
  const letras = useSequencerStore((s) => s.letras);

  const sig = measureTimeSigs[currentMeasure] || '4/4';
  const beatsCount = getBeatsPerMeasure(sig as any) || 4;

  const [activeBeat, setActiveBeat] = useState<number>(0);

  useEffect(() => {
    const handleTick = (detail: any) => {
      if (!detail) return;
      const ratio = detail.ratio ?? 0;
      const b = Math.floor(ratio * beatsCount);
      setActiveBeat((prev) => (prev !== b ? b : prev));
    };

    subscribeToTick(handleTick);
    return () => unsubscribeFromTick(handleTick);
  }, [beatsCount]);

  const lyricsLines = letras ? letras.split('\n').filter((l) => l.trim().length > 0) : [];
  const currentLyric = lyricsLines.length > 0 ? lyricsLines[currentMeasure % lyricsLines.length] : '';

  return (
    <div className="w-full px-3 py-2 flex flex-col items-center gap-1.5 bg-black/5 cordel-border-sm select-none">
      <div className="flex items-center justify-center gap-2 w-full">
        {Array.from({ length: beatsCount }).map((_, idx) => {
          const isCurrent = activeBeat === idx;
          const isDownbeat = idx === 0;
          return (
            <div
              key={idx}
              className={`flex-1 h-9 cordel-border-sm flex items-center justify-center font-cactus font-bold text-sm transition-transform duration-75 ${
                isCurrent
                  ? isDownbeat
                    ? 'bg-[#e74c3c] text-white scale-105 shadow-[2px_2px_0px_#000]'
                    : 'bg-[#f1c40f] text-[#1a1a1a] scale-105 shadow-[2px_2px_0px_#000]'
                  : 'bg-[var(--cordel-bg)] text-[var(--cordel-text)] opacity-40'
              }`}
            >
              <span>{idx + 1}</span>
            </div>
          );
        })}
      </div>

      {currentLyric && (
        <div className="w-full text-center px-2 py-0.5 truncate text-xs font-serif italic text-[var(--cordel-text)]/90 animate-fade-in">
          "{currentLyric}"
        </div>
      )}
    </div>
  );
};
