import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useSequencerStore } from '../stores/useSequencerStore';
import { Language } from '../types';
import { ExportTrackSelectionList } from './export/ExportTrackSelectionList';
import { ExportBaqueBounceButton } from './ExportBaqueBounceButton';
import { RodaSheetContainer } from './tablature/roda-sheet/RodaSheetContainer';

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
  const tracks = useSequencerStore((state) => state.tracks);
  const [activeTab, setActiveTab] = useState<'linear' | 'roda-sheet'>('linear');
  const isFr = lang === 'fr';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#121212]/80 backdrop-blur-sm select-none p-2 sm:p-4">
      <div
        className={`bg-[var(--cordel-bg)] text-[var(--cordel-text)] border-4 border-[var(--cordel-border)] shadow-[8px_8px_0_var(--cordel-border)] p-4 sm:p-6 w-full flex flex-col gap-4 transition-all ${
          activeTab === 'roda-sheet' ? 'max-w-5xl max-h-[92dvh] h-[92dvh]' : 'max-w-md'
        }`}
      >
        <div className="flex items-center justify-between border-b-2 border-[var(--cordel-border)] pb-2 shrink-0">
          <h2 className="font-cactus text-xl sm:text-2xl font-bold">
            {isFr ? 'Exportation Tablature & Rodas' : 'Exportar Partitura & Rodas'}
          </h2>
          <button
            type="button" onClick={onClose}
            className="p-1 text-[var(--cordel-text)] hover:text-[#8b2a1a] cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Commutateur [ Partition Linéaire ] / [ Planche de Rodas (A4) ] */}
        <div className="grid grid-cols-2 gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('linear')}
            className={`py-2 px-3 border-2 font-cactus font-bold text-xs sm:text-sm uppercase tracking-wider cursor-pointer transition-all ${
              activeTab === 'linear'
                ? 'bg-[#8b2a1a] text-[#f4ecd8] border-[#1a1a1a] shadow-[2px_2px_0px_#1a1a1a]'
                : 'bg-[var(--cordel-surface)] text-[var(--cordel-text)] border-[var(--cordel-border)]'
            }`}
          >
            {isFr ? 'Partition Linéaire' : 'Partitura Linear'}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('roda-sheet')}
            className={`py-2 px-3 border-2 font-cactus font-bold text-xs sm:text-sm uppercase tracking-wider cursor-pointer transition-all ${
              activeTab === 'roda-sheet'
                ? 'bg-[#8b2a1a] text-[#f4ecd8] border-[#1a1a1a] shadow-[2px_2px_0px_#1a1a1a]'
                : 'bg-[var(--cordel-surface)] text-[var(--cordel-text)] border-[var(--cordel-border)]'
            }`}
          >
            {isFr ? 'Planche de Rodas (A4)' : 'Prancha de Rodas (A4)'}
          </button>
        </div>

        {activeTab === 'roda-sheet' ? (
          <RodaSheetContainer lang={isFr ? 'fr' : 'pt'} onClose={onClose} />
        ) : (
          <>
            <div className="flex flex-col gap-3">
              <p className="font-cactus text-sm font-bold opacity-80">
                {isFr ? 'Sélectionnez les instruments à inclure :' : 'Selecione os instrumentos para incluir :'}
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

            <div className="flex flex-col sm:flex-row gap-3 mt-1">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm border-2 border-[var(--cordel-border)] hover:bg-[var(--cordel-border)] hover:text-[var(--cordel-bg)] transition-colors font-bold cursor-pointer font-cactus"
              >
                {isFr ? 'Annuler' : 'Cancelar'}
              </button>
              <div className="flex-1 flex gap-2">
                <button
                  onClick={() => executeExport(false)} disabled={selectedExportTracks.size === 0}
                  className="flex-1 px-3 py-2 text-sm bg-[var(--cordel-wood)] text-[#f4ecd8] font-bold hover:brightness-110 transition-all cursor-pointer font-cactus disabled:opacity-50 text-center"
                >
                  {isFr ? 'Télécharger (.txt)' : 'Baixar (.txt)'}
                </button>
                <button
                  onClick={() => executeExport(true)} disabled={selectedExportTracks.size === 0}
                  className="flex-1 px-3 py-2 text-sm bg-[var(--cordel-text)] text-[var(--cordel-bg)] font-bold hover:brightness-110 transition-all cursor-pointer font-cactus disabled:opacity-50 text-center"
                >
                  {isFr ? 'Imprimer (HTML)' : 'Imprimir (HTML)'}
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-3 border-t-2 border-[var(--cordel-border)] border-dashed">
              <ExportBaqueBounceButton lang={isFr ? 'fr' : 'pt'} className="w-full py-2 text-xs" />
              <button
                onClick={() => { onClose(); printLegendOnly(); }}
                className="w-full px-3 py-2 text-sm bg-[var(--cordel-border)] text-[var(--cordel-bg)] font-bold hover:brightness-110 transition-all cursor-pointer font-cactus text-center"
              >
                {isFr ? 'Imprimer la Légende (Feuille séparée)' : 'Imprimir a Legenda (Folha separada)'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
