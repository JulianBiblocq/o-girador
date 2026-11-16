import React from 'react';
import { MapPin, X } from 'lucide-react';
import { SongMarker, Language } from '../../types';
import { isLightColor } from '../../data';

export interface TimelineMarkerRulerRowProps {
  headerWidth: number;
  totalContentW: number;
  isMobile: boolean;
  lang: Language;
  songMarkers: SongMarker[];
  measureLeftPositions: number[];
  measureWidth: number;
  isPanningActive?: boolean;
  onMarkerRulerDblClick: (e: React.MouseEvent<HTMLDivElement>) => void;
  onMarkerPointerDown: (e: React.PointerEvent<HTMLDivElement>, marker: SongMarker, idx: number) => void;
  onMarkerClick: (marker: SongMarker) => void;
  onMarkerEdit: (marker: SongMarker, idx: number) => void;
  onDeleteMarker: (marker: SongMarker, idx: number) => void;
}

export const TimelineMarkerRulerRow = React.memo<TimelineMarkerRulerRowProps>(({
  headerWidth, totalContentW, isMobile, lang, songMarkers, measureLeftPositions,
  measureWidth, isPanningActive, onMarkerRulerDblClick, onMarkerPointerDown,
  onMarkerClick, onMarkerEdit, onDeleteMarker,
}) => {
  const totalRowW = headerWidth + totalContentW + 150;

  const handleDeleteMarker = (marker: SongMarker, idx: number) => {
    onDeleteMarker(marker, idx);
  };

  return (
    <div
      className="flex h-6 border-b border-[var(--cordel-border)]/15 bg-[var(--cordel-bg)]/50 relative select-none"
      style={{ width: `${totalRowW}px`, minWidth: `${totalRowW}px` }}
    >
      <div
        className={`timeline-sticky-header sticky left-0 z-40 bg-[var(--cordel-bg)] border-r-2 border-[var(--cordel-border)] flex items-center justify-between font-cactus text-[9px] font-bold uppercase shrink-0 text-[var(--cordel-text)]/40 ${
          isMobile ? 'px-1.5' : 'px-3'
        }`}
        style={{ width: headerWidth, minWidth: headerWidth, transformOrigin: '0 0' }}
      >
        <span>{isMobile ? 'Rep.' : (lang === 'fr' ? 'Repères' : 'Marcadores')}</span>
      </div>

      <div className="flex-grow relative h-full cursor-copy" onDoubleClick={onMarkerRulerDblClick}>
        {songMarkers.length === 0 && (
          <div className="absolute inset-0 flex items-center pl-4 text-[8px] text-[var(--cordel-text)]/20 italic pointer-events-none">
            {lang === 'fr' ? 'Double-cliquez ici pour ajouter un repère' : 'Double-clique aqui para adicionar um marcador'}
          </div>
        )}

        {songMarkers.map((marker, idx) => {
          const posX = measureLeftPositions[marker.measure] ?? (marker.measure * measureWidth);
          const bgColor = marker.color || 'var(--cordel-accent)';
          const isLight = Boolean(
            marker.color && (isLightColor(marker.color) || marker.color.includes('parchment') || marker.color.includes('gold'))
          );
          const textColor = isLight ? 'var(--cordel-ink-dark)' : 'var(--cordel-on-accent)';
          const fontClass = isLight ? 'font-extrabold' : 'font-bold';
          const borderClass = isLight
            ? 'border border-[var(--cordel-ink-dark)]/40'
            : 'border border-[var(--cordel-border-strong)]/35';

          return (
            <div
              key={marker.id ? `marker-${marker.id}` : `marker-idx-${idx}-${marker.measure}`}
              data-marker="true"
              className={`absolute top-[2px] h-5 pl-2 pr-0.5 rounded-full text-[9px] ${fontClass} flex items-center gap-1 shadow-sm cursor-grab select-none hover:brightness-105 active:cursor-grabbing transform -translate-x-1/2 ${borderClass} z-20 ${
                isPanningActive ? 'pointer-events-none' : ''
              }`}
              style={{ left: `${posX}px`, backgroundColor: bgColor, color: textColor }}
              onPointerDown={(e) => {
                if ((e.target as HTMLElement).closest('[data-marker-delete]')) return;
                onMarkerPointerDown(e, marker, idx);
              }}
              onMouseDown={(e) => {
                if ((e.target as HTMLElement).closest('[data-marker-delete]')) return;
              }}
              onClick={(e) => {
                if ((e.target as HTMLElement).closest('[data-marker-delete]')) return;
                if ((e.currentTarget as HTMLElement).dataset.hasMoved === 'true') return;
                e.stopPropagation();
                onMarkerClick(marker);
              }}
              onDoubleClick={(e) => {
                if ((e.target as HTMLElement).closest('[data-marker-delete]')) return;
                e.stopPropagation();
                onMarkerEdit(marker, idx);
              }}
            >
              <MapPin size={9} className="shrink-0" style={{ color: textColor }} />
              <span className="whitespace-nowrap truncate max-w-[140px]" style={{ color: textColor }}>
                {marker.name.replace(/\n/g, ' / ')}
              </span>
              <button
                type="button"
                data-marker-delete="true"
                onPointerDown={(e) => { e.stopPropagation(); }}
                onMouseDown={(e) => { e.stopPropagation(); }}
                onDoubleClick={(e) => { e.stopPropagation(); }}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleDeleteMarker(marker, idx);
                }}
                className="w-5 h-5 pointer-events-auto relative z-10 inline-flex items-center justify-center rounded-full cursor-pointer opacity-75 hover:opacity-100 hover:bg-[var(--cordel-ink-dark)]/15 transition-colors shrink-0"
                style={{ color: textColor }}
                title={lang === 'fr' ? 'Supprimer ce repère' : 'Excluir este marcador'}
                aria-label={lang === 'fr' ? 'Supprimer ce repère' : 'Excluir este marcador'}
              >
                <X size={11} className="stroke-[2.5] pointer-events-none" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
});
