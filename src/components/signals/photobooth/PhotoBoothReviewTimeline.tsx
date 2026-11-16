import React from 'react';
import { Timer, Play, Pause } from 'lucide-react';

interface PhotoBoothReviewTimelineProps {
  frames: string[];
  selectedFrameIndex: number;
  activePlayheadIndex: number;
  isPlaying: boolean;
  bpm: number;
  lang: 'fr' | 'pt';
  onSelectFrame: (idx: number) => void;
  onTogglePlay: () => void;
  onBpmChange: (newBpm: number) => void;
}

export const PhotoBoothReviewTimeline: React.FC<PhotoBoothReviewTimelineProps> = ({
  frames,
  selectedFrameIndex,
  activePlayheadIndex,
  isPlaying,
  bpm,
  lang,
  onSelectFrame,
  onTogglePlay,
  onBpmChange,
}) => {
  const currentPreviewFrame = isPlaying
    ? frames[activePlayheadIndex] || frames[0]
    : frames[selectedFrameIndex] || frames[0];

  return (
    <div className="flex flex-col gap-3 text-[var(--cordel-text)]">
      <div className="relative w-full aspect-square bg-[var(--cordel-paper-surface)] rounded-sm overflow-hidden border-2 border-[var(--cordel-border-strong)] flex items-center justify-center shadow-[3px_3px_0px_var(--cordel-shadow-color)]">
        {currentPreviewFrame ? (
          <img src={currentPreviewFrame} alt="Frame active" className="w-full h-full object-contain" />
        ) : (
          <span className="text-[var(--cordel-paper-ink)] text-xs opacity-60">
            {lang === 'fr' ? 'Aucune image' : 'Nenhuma imagem'}
          </span>
        )}
        <div className="absolute top-2 left-2 bg-[var(--cordel-ink-dark)]/85 px-2 py-0.5 rounded text-[10px] font-cactus font-bold text-[var(--cordel-gold)] uppercase">
          {isPlaying
            ? `${lang === 'fr' ? 'Lecture' : 'Reprodução'} : ${activePlayheadIndex + 1} / ${frames.length}`
            : `${lang === 'fr' ? 'Trame' : 'Quadro'} : ${selectedFrameIndex + 1} / ${frames.length}`}
        </div>
      </div>

      <div className="flex items-center justify-between bg-[var(--cordel-surface)] p-2 border border-[var(--cordel-border)] rounded-sm">
        <button
          type="button"
          onClick={onTogglePlay}
          className={`px-3 py-1 font-cactus font-bold text-xs uppercase border border-[var(--cordel-border-strong)] cursor-pointer shadow-[1.5px_1.5px_0px_var(--cordel-shadow-color)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none flex items-center gap-1.5 transition-colors ${
            isPlaying
              ? 'bg-[var(--cordel-wood)] text-[var(--cordel-on-accent)]'
              : 'bg-[var(--cordel-surface-elevated)] text-[var(--cordel-text)] hover:bg-[var(--cordel-wood)] hover:text-[var(--cordel-on-accent)]'
          }`}
        >
          {isPlaying ? <Pause size={12} fill="currentColor" /> : <Play size={12} fill="currentColor" />}
          <span>{isPlaying ? (lang === 'fr' ? 'Figer' : 'Pausar') : (lang === 'fr' ? 'Animer au tempo' : 'Animar no tempo')}</span>
        </button>

        <div className="flex items-center gap-1 text-xs font-bold">
          <Timer size={13} className="text-[var(--cordel-accent-readable)]" />
          <button type="button" onClick={() => onBpmChange(Math.max(40, bpm - 5))} className="w-5 h-5 bg-[var(--cordel-surface-elevated)] text-[var(--cordel-text)] border border-[var(--cordel-border-strong)] cursor-pointer hover:bg-[var(--cordel-wood)] hover:text-[var(--cordel-on-accent)]">-</button>
          <span className="w-10 text-center font-cactus">{bpm}</span>
          <button type="button" onClick={() => onBpmChange(Math.min(240, bpm + 5))} className="w-5 h-5 bg-[var(--cordel-surface-elevated)] text-[var(--cordel-text)] border border-[var(--cordel-border-strong)] cursor-pointer hover:bg-[var(--cordel-wood)] hover:text-[var(--cordel-on-accent)]">+</button>
          <span className="text-[10px] text-[var(--cordel-text-muted)]">BPM</span>
        </div>
      </div>

      <div className="flex gap-1.5 overflow-x-auto p-1.5 bg-[var(--cordel-surface)] border border-[var(--cordel-border)] rounded-sm">
        {frames.map((frame, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => onSelectFrame(idx)}
            className={`relative w-14 h-14 shrink-0 rounded-xs overflow-hidden border-2 bg-[var(--cordel-paper-surface)] cursor-pointer transition-transform ${
              selectedFrameIndex === idx
                ? 'border-[var(--cordel-accent-readable)] scale-105 shadow-[2px_2px_0px_var(--cordel-shadow-color)]'
                : 'border-[var(--cordel-border)] opacity-80 hover:opacity-100'
            }`}
          >
            <img src={frame} alt={`Thumb ${idx + 1}`} className="w-full h-full object-cover" />
            <span className="absolute bottom-0 right-0 bg-[var(--cordel-ink-dark)]/85 text-[8px] font-bold text-[var(--cordel-on-accent)] px-1">
              {idx + 1}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};
