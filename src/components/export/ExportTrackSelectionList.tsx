/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { instrumentsConfig } from '../../data';
import { useInstrumentLabel } from '../../stores/useNomenclatureStore';
import { Language } from '../../types';

interface ExportTrackSelectionListProps {
  tracks: any[];
  selectedExportTracks: Set<number>;
  setSelectedExportTracks: (s: Set<number>) => void;
  selectedAnnexTracks: Set<number>;
  setSelectedAnnexTracks: (s: Set<number>) => void;
  lang: Language;
}

export const ExportTrackSelectionList: React.FC<ExportTrackSelectionListProps> = ({
  tracks,
  selectedExportTracks,
  setSelectedExportTracks,
  selectedAnnexTracks,
  setSelectedAnnexTracks,
  lang,
}) => {
  const getInstrumentLabel = useInstrumentLabel();

  return (
    <div className="flex flex-col gap-2 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
      <label className="flex items-center gap-3 p-2 border-2 border-[var(--cordel-border)] cursor-pointer hover:bg-[var(--cordel-border)]/10 transition-colors">
        <input
          type="checkbox"
          className="w-4 h-4 cursor-pointer accent-[var(--cordel-wood)]"
          checked={
            tracks.filter(t => instrumentsConfig[t.instrumentIdx]?.id !== 'apito' && instrumentsConfig[t.instrumentIdx]?.type !== 'voice').length === selectedExportTracks.size
          }
          onChange={(e) => {
            if (e.target.checked) {
              const allIds = tracks
                .filter(t => instrumentsConfig[t.instrumentIdx]?.id !== 'apito' && instrumentsConfig[t.instrumentIdx]?.type !== 'voice')
                .map(t => t.id);
              setSelectedExportTracks(new Set(allIds));
            } else {
              setSelectedExportTracks(new Set());
              setSelectedAnnexTracks(new Set());
            }
          }}
        />
        <span className="font-cactus font-bold text-sm">
          {lang === 'fr' ? 'Tous les instruments' : 'Todos os instrumentos'}
        </span>
      </label>

      {tracks.map(track => {
        const conf = instrumentsConfig[track.instrumentIdx];
        if (!conf || conf.id === 'apito' || conf.type === 'voice') return null;

        return (
          <div key={track.id} className="flex flex-col gap-1 p-2 border-2 border-[var(--cordel-border)]/50 ml-4">
            <label className="flex items-center gap-3 cursor-pointer hover:bg-[var(--cordel-border)]/5 transition-colors">
              <input
                type="checkbox"
                className="w-4 h-4 cursor-pointer accent-[var(--cordel-text)]"
                checked={selectedExportTracks.has(track.id)}
                onChange={(e) => {
                  const newSet = new Set(selectedExportTracks);
                  if (e.target.checked) newSet.add(track.id);
                  else {
                    newSet.delete(track.id);
                    const newAnnexSet = new Set(selectedAnnexTracks);
                    newAnnexSet.delete(track.id);
                    setSelectedAnnexTracks(newAnnexSet);
                  }
                  setSelectedExportTracks(newSet);
                }}
              />
              <span className="font-cactus text-xs font-bold">{track.customName || getInstrumentLabel(track)}</span>
            </label>
            <label className={`flex items-center gap-2 pl-7 cursor-pointer transition-colors ${!selectedExportTracks.has(track.id) ? 'opacity-50 pointer-events-none' : 'hover:bg-[var(--cordel-border)]/5'}`}>
              <input
                type="checkbox"
                className="w-3 h-3 cursor-pointer accent-[var(--cordel-text)]"
                checked={selectedAnnexTracks.has(track.id)}
                disabled={!selectedExportTracks.has(track.id)}
                onChange={(e) => {
                  const newSet = new Set(selectedAnnexTracks);
                  if (e.target.checked) newSet.add(track.id);
                  else newSet.delete(track.id);
                  setSelectedAnnexTracks(newSet);
                }}
              />
              <span className="font-sans text-[10px] opacity-80">{lang === 'fr' ? 'Lexique des variations en annexe' : 'Léxico de variações em anexo'}</span>
            </label>
          </div>
        );
      })}
    </div>
  );
};
