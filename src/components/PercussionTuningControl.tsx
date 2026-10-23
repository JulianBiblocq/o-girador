import React from 'react';
import { useSequencerStore } from '../stores/useSequencerStore';
import { instrumentsConfig } from '../data';
import { useDrumTuning } from './controls/useDrumTuning';
import { DrumTuningSvg } from './controls/DrumTuningSvg';

export interface PercussionTuningControlProps {
  trackId?: number;
  instrumentId?: string;
  tuning?: number;
  onChange?: (newTuning: number) => void;
  title?: string;
  onPreview?: () => void;
  showPreviewButton?: boolean;
  collapsible?: boolean;
}

export const PercussionTuningControl: React.FC<PercussionTuningControlProps> = ({
  trackId,
  instrumentId,
  tuning: propTuning,
  onChange,
  title,
  onPreview,
  showPreviewButton = true,
  collapsible = false,
}) => {
  const isControlled = trackId === undefined;
  const track = useSequencerStore((state) =>
    trackId !== undefined ? state.tracks.find((t) => t.id === trackId) : undefined
  );
  const setTrackTuning = useSequencerStore((state) => state.setTrackTuning);
  const lang = useSequencerStore((state) => state.lang);

  const effectiveInstrumentId = isControlled
    ? instrumentId || ''
    : track
    ? instrumentsConfig[track.instrumentIdx]?.id || ''
    : '';

  const tuneableInstruments = ['marcante', 'meiao', 'repique', 'caixa', 'tarol', 'timbal'];
  const canTune = tuneableInstruments.includes(effectiveInstrumentId);

  if (!isControlled && !track) return null;
  if (!canTune && effectiveInstrumentId) return null;

  const currentTuning = isControlled ? propTuning || 0 : track?.tuning || 0;
  const { localTuning, svgRef, handlePointerDown, handlePointerMove, handlePointerUp } = useDrumTuning({
    currentTuning, isControlled, trackId, setTrackTuning, onChange, onPreview,
  });

  const isPitchUp = localTuning > 0;
  const isPitchDown = localTuning < 0;
  const R_y = 90 - (localTuning * (50 / 6));
  const displayTitle = title || (lang === 'fr' ? (isControlled ? 'Accorder' : 'Accorder le tambour') : (isControlled ? 'Afinar' : 'Afinar o tambor'));

  const content = (
    <div className="flex flex-col items-center justify-center bg-[var(--cordel-bg)] border-[2px] sm:border-[3px] border-[var(--cordel-text)] p-2 gap-1.5 relative w-full select-none shadow-[3px_3px_0_rgba(0,0,0,1)]">
      <div className="flex justify-between w-full items-end leading-none border-b border-dashed border-[#1a1a1a]/30 pb-1.5">
        <span className="text-[11px] font-bold font-cactus uppercase text-[var(--cordel-text)] tracking-wider truncate mr-1">
          {displayTitle}
        </span>
        <span
          className={`text-[15px] font-bold font-cactus shrink-0 ${
            isPitchUp ? 'text-[#8b2a1a]' : isPitchDown ? 'text-[#555]' : 'text-[var(--cordel-text)]'
          }`}
        >
          {localTuning > 0 ? `+${localTuning}` : localTuning}
        </span>
      </div>

      <DrumTuningSvg
        svgRef={svgRef}
        R_y={R_y}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      />

      {showPreviewButton && onPreview && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onPreview();
          }}
          className="w-full py-1 bg-[#1a1a1a] hover:bg-[#8b2a1a] text-[#f4ecd8] border border-[#1a1a1a] shadow-[1px_1px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[0.5px] hover:translate-y-[0.5px] active:scale-95 transition-all cursor-pointer font-cactus font-bold uppercase text-[9px] flex items-center justify-center gap-1 mt-0.5"
        >
          <span></span>
          <span>{lang === 'fr' ? 'Écouter' : 'Ouvir'}</span>
        </button>
      )}

      <p className="text-[9px] font-bold text-[#666] leading-tight text-center">
        {lang === 'fr' ? "Glisser l'anneau" : "Deslizar o anel"}
      </p>
    </div>
  );

  if (collapsible) {
    return (
      <details className="border-t-2 border-[#1a1a1a]/20 pt-2 mt-2 group">
        <summary className="text-xs font-bold uppercase tracking-wider cursor-pointer list-none flex items-center justify-between py-1 select-none [&::-webkit-details-marker]:hidden">
          <span>{displayTitle} ({localTuning > 0 ? `+${localTuning}` : localTuning} st)</span>
          <span className="transition-transform group-open:rotate-90">▸</span>
        </summary>
        <div className="pt-2">{content}</div>
      </details>
    );
  }

  return content;
};
