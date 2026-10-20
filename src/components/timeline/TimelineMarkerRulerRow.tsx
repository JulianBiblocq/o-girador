import React from 'react';
import { SongMarker, Language } from '../../types';

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
  onMarkerPointerDown: (e: React.PointerEvent<HTMLDivElement>, marker: SongMarker) => void;
  onMarkerClick: (marker: SongMarker) => void;
  onMarkerEdit: (marker: SongMarker) => void;
  onDeleteMarker: (id: string) => void;
}

export const TimelineMarkerRulerRow = React.memo<TimelineMarkerRulerRowProps>(({
  headerWidth, totalContentW, isMobile, lang, songMarkers, measureLeftPositions,
  measureWidth, isPanningActive, onMarkerRulerDblClick, onMarkerPointerDown,
  onMarkerClick, onMarkerEdit, onDeleteMarker,
}) => {
  const totalRowW = headerWidth + totalContentW + 150;

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

        {songMarkers.map((marker) => {
          const posX = measureLeftPositions[marker.measure] ?? (marker.measure * measureWidth);
          return (
            <div
              key={`marker-${marker.id}`}
              data-marker="true"
              className={`absolute top-1 h-[16px] px-2 rounded-full text-[9px] font-bold text-white flex items-center gap-1 shadow-sm cursor-grab select-none hover:brightness-110 active:cursor-grabbing transform -translate-x-1/2 border border-black/10 z-40 ${
                isPanningActive ? 'pointer-events-none' : ''
              }`}
              style={{ left: `${posX}px`, backgroundColor: marker.color || '#f19066' }}
              onPointerDown={(e) => onMarkerPointerDown(e, marker)}
              onClick={(e) => {
                if ((e.currentTarget as HTMLElement).dataset.hasMoved === 'true') return;
                e.stopPropagation();
                onMarkerClick(marker);
              }}
              onDoubleClick={(e) => {
                e.stopPropagation();
                onMarkerEdit(marker);
              }}
            >
              <span className="whitespace-nowrap truncate max-w-[140px]">📍 {marker.name.replace(/\n/g, ' / ')}</span>
              <span
                onClick={(e) => { e.stopPropagation(); onDeleteMarker(marker.id); }}
                className="opacity-70 hover:opacity-100 cursor-pointer ml-1 text-[11px]"
                title={lang === 'fr' ? 'Supprimer' : 'Excluir'}
              >
                &times;
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
});
