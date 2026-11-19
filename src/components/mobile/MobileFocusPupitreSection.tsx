import React from 'react';
import { instrumentsConfig, ASSETS_BASE_URL } from '../../data';
import { getEligibleReferenceTracks } from '../../utils/focusTrackSelector';
import { getInstrumentPrimaryStrongColor, getContrastColor } from '../../utils/colorHelpers';
import { TrackGroup } from '../../types';

interface MobileFocusPupitreSectionProps {
  tracks: TrackGroup[];
  playable: TrackGroup[];
  focusTrackId: number | null;
  referenceTrackId: number | null;
  onSelectTrack: (t: TrackGroup) => void;
  onSelectReferenceTrackId: (id: number | null) => void;
  lang: 'fr' | 'pt';
}

export const MobileFocusPupitreSection: React.FC<MobileFocusPupitreSectionProps> = ({
  tracks,
  playable,
  focusTrackId,
  referenceTrackId,
  onSelectTrack,
  onSelectReferenceTrackId,
  lang,
}) => {
  return (
    <div>
      <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--cordel-ink-dark)]/70 mb-1">
        {lang === 'pt' ? '1. Escolher seu naipe principal' : '1. Choisir son pupitre principal'}
      </div>
      <div className="grid grid-cols-2 gap-1.5 max-h-[200px] overflow-y-auto pr-0.5">
        {playable.map((t, idx) => {
          const inst = instrumentsConfig[t.instrumentIdx];
          const isSelected = t.id === focusTrackId;
          const raw = t.customName || inst?.name || `Track ${idx + 1}`;
          const name = raw.replace(/\s*\([^)]*\)/g, '').replace(/^\d+[\.\s\-]+/, '').trim();
          const bg = getInstrumentPrimaryStrongColor(inst, t);
          const fg = getContrastColor(bg);
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onSelectTrack(t)}
              className={`xilo-wood-stamp flex items-center gap-1 px-1.5 py-1 cordel-border-sm text-left transition-all cursor-pointer ${
                isSelected ? 'ring-2 ring-[var(--cordel-ink-dark)] font-black' : 'opacity-85 hover:opacity-100'
              }`}
              style={{ backgroundColor: bg, color: fg }}
            >
              <img
                src={`${ASSETS_BASE_URL}${inst?.iconImg}`}
                alt={name}
                className="w-3.5 h-3.5 object-contain filter invert opacity-90 shrink-0"
                onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
              />
              <span className="truncate flex-1 text-[10.5px] leading-tight font-medium">{idx + 1}. {name}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-2 pt-1 border-t border-[var(--cordel-ink-dark)]/20 flex flex-col gap-1">
        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-[var(--cordel-ink-dark)]/80">
          <span>{lang === 'pt' ? '2º Instrumento (Correlação)' : '2e Instrument (Corrélation)'}</span>
          {referenceTrackId !== null && (
            <button
              type="button"
              onClick={() => onSelectReferenceTrackId(null)}
              className="text-[var(--cordel-wood)] hover:underline cursor-pointer text-[9px] font-bold"
            >
              {lang === 'pt' ? 'Remover' : 'Retirer'}
            </button>
          )}
        </div>
        <select
          value={referenceTrackId ?? ''}
          onChange={(e) => onSelectReferenceTrackId(e.target.value ? Number(e.target.value) : null)}
          style={{ colorScheme: 'light' }}
          className="w-full bg-[var(--cordel-parchment-surface)] border border-[var(--cordel-ink-dark)] p-1 text-[11px] font-bold font-cactus cursor-pointer shadow-[1px_1px_0_var(--cordel-ink-dark)]"
        >
          <option value="">{lang === 'pt' ? 'Nenhum (Apenas meu pupitre)' : 'Aucun (Mon pupitre seul)'}</option>
          {getEligibleReferenceTracks(tracks, focusTrackId).map((t) => {
            const pIdx = playable.findIndex((p) => p.id === t.id);
            const num = pIdx >= 0 ? pIdx + 1 : '';
            const name = (t.customName || instrumentsConfig[t.instrumentIdx]?.name || '')
              .replace(/\s*\([^)]*\)/g, '')
              .replace(/^\d+[\.\s\-]+/, '')
              .trim();
            return <option key={t.id} value={t.id}>{num}. {name}</option>;
          })}
        </select>
      </div>
    </div>
  );
};
