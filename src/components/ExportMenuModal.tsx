
import React from 'react';
import { useSequencerStore } from '../stores/useSequencerStore';
import { Language } from '../types';
import { ExportTrackSelectionList } from './export/ExportTrackSelectionList';

interface ExportMenuModalProps {
  onClose: () => void;
  selectedExportTracks: Set<number>;
  setSelectedExportTracks: (s: Set<number>) => void;
  selectedAnnexTracks: Set<number>;
  setSelectedAnnexTracks: (s: Set<number>) => void;
  executeExport: (printOnly: boolean) => void;
  printLegendOnly: () => void;
  lang: Language;
}

export const ExportMenuModal: React.FC<ExportMenuModalProps> = ({
  onClose,
  selectedExportTracks,
  setSelectedExportTracks,
  selectedAnnexTracks,
  setSelectedAnnexTracks,
  executeExport,
  printLegendOnly,
  lang,
}) => {
  const tracks = useSequencerStore(state => state.tracks);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#121212]/80 backdrop-blur-sm select-none">
      <div className="bg-[var(--cordel-bg)] text-[var(--cordel-text)] border-4 border-[var(--cordel-border)] shadow-[8px_8px_0_var(--cordel-border)] p-6 max-w-sm w-full mx-4 flex flex-col gap-5">
        <h2 className="font-cactus text-2xl font-bold border-b-2 border-[var(--cordel-border)] pb-2">
          {lang === 'fr' ? 'Exportation Tablature' : 'Exportar Partitura'}
        </h2>

        <div className="flex flex-col gap-3">
          <p className="font-cactus text-sm font-bold opacity-80">
            {lang === 'fr' ? 'Sélectionnez les instruments à inclure :' : 'Selecione os instrumentos para incluir :'}
          </p>

          <ExportTrackSelectionList
            tracks={tracks}
            selectedExportTracks={selectedExportTracks}
            setSelectedExportTracks={setSelectedExportTracks}
            selectedAnnexTracks={selectedAnnexTracks}
            setSelectedAnnexTracks={setSelectedAnnexTracks}
            lang={lang}
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm border-2 border-[var(--cordel-border)] hover:bg-[var(--cordel-border)] hover:text-[var(--cordel-bg)] transition-colors font-bold cursor-pointer font-cactus"
          >
            {lang === 'fr' ? 'Annuler' : 'Cancelar'}
          </button>
          <div className="flex-1 flex gap-2">
            <button
              onClick={() => executeExport(false)}
              disabled={selectedExportTracks.size === 0}
              className="flex-1 px-3 py-2 text-sm bg-[var(--cordel-wood)] text-[#f4ecd8] font-bold hover:brightness-110 transition-all cursor-pointer font-cactus disabled:opacity-50 disabled:cursor-not-allowed text-center"
            >
              {lang === 'fr' ? 'Télécharger (.txt)' : 'Baixar (.txt)'}
            </button>
            <button
              onClick={() => executeExport(true)}
              disabled={selectedExportTracks.size === 0}
              className="flex-1 px-3 py-2 text-sm bg-[var(--cordel-text)] text-[var(--cordel-bg)] font-bold hover:brightness-110 transition-all cursor-pointer font-cactus disabled:opacity-50 disabled:cursor-not-allowed text-center"
            >
              {lang === 'fr' ? 'Imprimer (HTML)' : 'Imprimir (HTML)'}
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-2 pt-3 border-t-2 border-[var(--cordel-border)] border-dashed">
          <button
            onClick={() => { onClose(); printLegendOnly(); }}
            className="w-full px-3 py-2 text-sm bg-[var(--cordel-border)] text-[var(--cordel-bg)] font-bold hover:brightness-110 transition-all cursor-pointer font-cactus text-center"
          >
            {lang === 'fr' ? 'Imprimer la Légende (Feuille séparée)' : 'Imprimir a Legenda (Folha separada)'}
          </button>
        </div>
      </div>
    </div>
  );
};
