/**
 * LutherieTrackLinksRow.tsx — Passerelles directes Banc de Lutherie -> Éditeur de Motif
 * par piste réelle de la session + résolution sûre du motif actif (préservation de 0).
 */
import React from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { TrackGroup } from '../../types';
import { instrumentsConfig } from '../../data';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { useSequencerSettingsStore } from '../../stores/useSequencerSettingsStore';
import { useInstrumentLabel } from '../../stores/useNomenclatureStore';

export function resolveActivePatternIdForTrack(
  track: TrackGroup,
  currentMeasure: number
): number | string | null {
  const m = currentMeasure ?? 0;
  const timelineVal = (track as TrackGroup & { timeline?: Record<number, number | string | null> }).timeline?.[m];
  if (timelineVal !== undefined && timelineVal !== null) return timelineVal;
  const overrideVal = track.patternOverrides?.[m];
  if (overrideVal !== undefined && overrideVal !== null) return overrideVal;
  return track.selectedPatternId ?? track.patterns?.[0]?.id ?? null;
}

export interface LutherieTrackLinksRowProps {
  tracks: TrackGroup[];
  defaultLabel: string;
  lang: string;
}

export const LutherieTrackLinksRow: React.FC<LutherieTrackLinksRowProps> = React.memo(({
  tracks,
  defaultLabel,
  lang,
}) => {
  const isFr = lang === 'fr';
  const getInstrumentLabel = useInstrumentLabel();

  if (tracks.length === 0) return null;

  const handleOpenTrack = (track: TrackGroup) => {
    const currentMeasure = useSequencerStore.getState().currentMeasure ?? 0;
    const activePatternIdForTrack = resolveActivePatternIdForTrack(track, currentMeasure);
    useSequencerSettingsStore.getState().setIsSettingsOpen(false);
    useSequencerStore.getState().openInstrumentDetailAt({
      trackId: track.id,
      patternId: activePatternIdForTrack,
      expandTuning: true,
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5 pt-1.5 border-t border-dashed border-[var(--cordel-border)]">
      {tracks.map((track, idx) => {
        const instId = instrumentsConfig[track.instrumentIdx]?.id || '';
        const roleLabel = getInstrumentLabel(instId) || defaultLabel;
        const trackTitle = track.customName?.trim()
          || (tracks.length > 1 ? `${roleLabel} #${idx + 1}` : (isFr ? 'Éditer piste' : 'Editar faixa'));

        return (
          <button
            key={track.id}
            type="button"
            data-testid={`lutherie-open-editor-${track.id}`}
            onClick={() => handleOpenTrack(track)}
            title={isFr ? `Ouvrir dans l'Éditeur de Motif (${trackTitle})` : `Abrir no Editor de Padrão (${trackTitle})`}
            className="flex-1 min-w-[96px] py-1 px-2 bg-[var(--cordel-surface)] hover:bg-[var(--cordel-wood)] text-[var(--cordel-text)] hover:text-[var(--cordel-on-accent)] border border-[var(--cordel-border-strong)] font-cactus font-bold uppercase text-[9px] flex items-center justify-center gap-1 cursor-pointer transition-colors"
          >
            <SlidersHorizontal size={11} className="shrink-0" />
            <span className="truncate">{trackTitle}</span>
          </button>
        );
      })}
    </div>
  );
});

LutherieTrackLinksRow.displayName = 'LutherieTrackLinksRow';
