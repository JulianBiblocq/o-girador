import React from 'react';
import { ChevronDown, RotateCcw, Volume2 } from 'lucide-react';
import { TUNEABLE_INSTRUMENTS } from '../audio/engine/engineTypes';
import { instrumentsConfig } from '../data';
import { useSequencerStore } from '../stores/useSequencerStore';
import { getDrumPitchNoteInfo } from '../utils/audio/drumPitchToNote';
import { DrumTuningSvg } from './controls/DrumTuningSvg';
import { useDrumTuning } from './controls/useDrumTuning';

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
  const isControlled = trackId === undefined || trackId === null;
  const track = useSequencerStore((state) =>
    trackId !== undefined && trackId !== null ? state.tracks.find((t) => t.id === trackId) : undefined
  );
  const setTrackTuning = useSequencerStore((state) => state.setTrackTuning);
  const lang = useSequencerStore((state) => state.lang);

  const effectiveInstrumentId = isControlled
    ? instrumentId || ''
    : track
    ? instrumentsConfig[track.instrumentIdx]?.id || ''
    : '';

  const canTune = TUNEABLE_INSTRUMENTS.has(effectiveInstrumentId);
  if (!isControlled && !track) return null;
  if (!canTune && effectiveInstrumentId) return null;

  const currentTuning = isControlled ? (propTuning ?? 0) : (track?.tuning ?? 0);
  const { localTuning, svgRef, handlePointerDown, handlePointerMove, handlePointerUp } = useDrumTuning({
    currentTuning, isControlled, trackId, setTrackTuning, onChange, onPreview,
  });

  const isFr = lang === 'fr';
  const isGongue = effectiveInstrumentId === 'gongue';
  const noteInfo = getDrumPitchNoteInfo(effectiveInstrumentId || 'meiao', localTuning, lang);
  const isPitchUp = localTuning > 0;
  const isPitchDown = localTuning < 0;
  const R_y = 90 - localTuning * (50 / 6);
  const defaultTitle = isFr
    ? isGongue ? 'Accorder la cloche' : isControlled ? 'Accorder' : 'Accorder le tambour'
    : isGongue ? 'Afinar a campana' : isControlled ? 'Afinar' : 'Afinar o tambor';
  const displayTitle = title || defaultTitle;

  const handleResetZero = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isControlled && trackId !== undefined) setTrackTuning(trackId, 0);
    onChange?.(0);
    onPreview?.();
  };

  const content = (
    <div className="flex flex-col items-center justify-center bg-[var(--cordel-bg)] border-[2px] sm:border-[3px] border-[var(--cordel-text)] p-2 gap-1.5 relative w-full select-none shadow-[3px_3px_0_var(--cordel-shadow-color)]">
      <div className="flex justify-between w-full items-center leading-none border-b border-dashed border-[var(--cordel-border)] pb-1.5 gap-1">
        <span className="text-[11px] font-bold font-cactus uppercase text-[var(--cordel-text)] tracking-wider truncate">
          {displayTitle}
        </span>
        <div className="flex items-center gap-1 shrink-0">
          <span
            className={`text-xs font-mono font-bold ${
              isPitchUp ? 'text-[var(--cordel-accent-readable)]' : isPitchDown ? 'text-[var(--cordel-text-muted)]' : 'text-[var(--cordel-text)]'
            }`}
          >
            {noteInfo.semitonesLabel}
          </span>
          {localTuning !== 0 && (
            <button
              type="button"
              onClick={handleResetZero}
              title={isFr ? 'Réinitialiser à 0 st' : 'Redefinir para 0 st'}
              className="p-0.5 bg-[var(--cordel-surface)] hover:bg-[var(--cordel-wood)] text-[var(--cordel-text)] hover:text-[var(--cordel-on-accent)] border border-[var(--cordel-border-strong)] cursor-pointer transition-colors"
            >
              <RotateCcw size={10} />
            </button>
          )}
        </div>
      </div>

      <span className="w-full px-1.5 py-0.5 bg-[var(--cordel-surface-elevated)] text-[var(--cordel-text)] border border-[var(--cordel-border)] font-mono font-bold text-[10px] text-center truncate">
        {noteInfo.shortBadgeText}
      </span>

      <DrumTuningSvg svgRef={svgRef} R_y={R_y} onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} />

      {showPreviewButton && onPreview && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onPreview(); }}
          className="w-full py-1 bg-[var(--cordel-ink-dark)] hover:bg-[var(--cordel-wood)] text-[var(--cordel-on-accent)] border border-[var(--cordel-ink-dark)] shadow-[1px_1px_0px_var(--cordel-ink-dark)] hover:shadow-none active:scale-95 transition-all cursor-pointer font-cactus font-bold uppercase text-[9px] flex items-center justify-center gap-1 mt-0.5"
        >
          <Volume2 size={12} />
          <span>{isFr ? 'Écouter' : 'Ouvir'}</span>
        </button>
      )}

      <p className="text-[9px] font-bold text-[var(--cordel-text-muted)] leading-tight text-center">
        {isFr ? "Glisser l'anneau (pas 0.1 st)" : 'Deslizar o anel (passo 0.1 st)'}
      </p>
    </div>
  );

  if (collapsible) {
    return (
      <details className="border-t-2 border-[var(--cordel-border)]/20 pt-2 mt-2 group">
        <summary className="text-xs font-bold uppercase tracking-wider cursor-pointer list-none flex items-center justify-between py-1 select-none [&::-webkit-details-marker]:hidden">
          <span>{displayTitle} ({noteInfo.noteWithCents} · {noteInfo.semitonesLabel})</span>
          <ChevronDown className="w-3.5 h-3.5 transition-transform duration-200 group-open:rotate-180" />
        </summary>
        <div className="pt-2">{content}</div>
      </details>
    );
  }

  return content;
};
