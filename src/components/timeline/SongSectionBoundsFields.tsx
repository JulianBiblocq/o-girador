import React from 'react';

interface SongSectionBoundsFieldsProps {
  startM: number;
  endM: number;
  maxLimit: number;
  lang: string;
  onStartChange: (val: string) => void;
  onEndChange: (val: string) => void;
  onQuickDuration: (bars: number) => void;
}

export const SongSectionBoundsFields: React.FC<SongSectionBoundsFieldsProps> = ({
  startM,
  endM,
  maxLimit,
  lang,
  onStartChange,
  onEndChange,
  onQuickDuration,
}) => {
  const duration = Math.max(1, endM - startM + 1);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <label className="text-xs font-bold uppercase tracking-wider block mb-1">
            {lang === 'fr' ? 'Début (Mesure)' : 'Início (Compasso)'}
          </label>
          <input
            type="number"
            min={1}
            max={maxLimit}
            value={startM}
            onChange={(e) => onStartChange(e.target.value)}
            className="w-full bg-[var(--cordel-bg)] border border-[var(--cordel-border)] px-3 py-1.5 text-sm font-bold font-mono focus:outline-none focus:ring-1 focus:ring-[var(--cordel-border)]"
          />
        </div>
        <div className="flex-1">
          <label className="text-xs font-bold uppercase tracking-wider block mb-1">
            {lang === 'fr' ? 'Fin (Mesure)' : 'Fim (Compasso)'}
          </label>
          <input
            type="number"
            min={1}
            max={maxLimit}
            value={endM}
            onChange={(e) => onEndChange(e.target.value)}
            className="w-full bg-[var(--cordel-bg)] border border-[var(--cordel-border)] px-3 py-1.5 text-sm font-bold font-mono focus:outline-none focus:ring-1 focus:ring-[var(--cordel-border)]"
          />
        </div>
      </div>

      {/* Raccourcis de durée */}
      <div className="flex items-center gap-2 pt-1">
        <span className="text-xs opacity-60">
          {lang === 'fr' ? `Durée : ${duration} mes.` : `Duração: ${duration} comp.`}
        </span>
        <div className="flex gap-1 ml-auto">
          {[2, 4, 8].map((b) => (
            <button
              key={b}
              type="button"
              onClick={() => onQuickDuration(b)}
              className="px-2 py-0.5 text-xs font-bold border border-[var(--cordel-border)]/40 hover:border-[var(--cordel-border)] hover:bg-[var(--cordel-border)]/10 rounded-none cursor-pointer"
            >
              {b} {lang === 'fr' ? 'mes.' : 'comp.'}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
