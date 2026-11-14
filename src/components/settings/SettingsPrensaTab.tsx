import React, { useState } from 'react';
import { Download, Printer, FileText } from 'lucide-react';
import { exportTablatureFile, printTablature, printLegendOnly } from '../../utils/exportTablature';
import { SettingsPrensaMetadata } from './SettingsPrensaMetadata';
import { SettingsPrensaPreview } from './SettingsPrensaPreview';
import { usePrensaGenerator } from './usePrensaGenerator';
import { RodaSheetContainer } from '../tablature/roda-sheet/RodaSheetContainer';

interface SettingsPrensaTabProps {
  lang: string;
  metadata: any;
  letras: string;
  onMetaChange: (field: string, val: any) => void;
  onLetrasChange?: (val: string) => void;
  measureBpms?: number[];
}

export const SettingsPrensaTab: React.FC<SettingsPrensaTabProps> = ({
  lang,
  metadata,
  letras,
  onMetaChange,
  onLetrasChange = () => {},
  measureBpms,
}) => {
  const [activePrensaMode, setActivePrensaMode] = useState<'linear' | 'roda-sheet'>('linear');
  const [bodyFontSize, setBodyFontSize] = useState<number>(13);
  const [containerWidthPx, setContainerWidthPx] = useState<number>(786);
  const {
    validExportTracks, selectedExportTracks, selectedAnnexTracks, liveText, setLiveText,
    handleToggleAll, refreshPreviewText, handleToggleTrackExport, handleToggleTrackAnnex,
  } = usePrensaGenerator(lang, letras, measureBpms, bodyFontSize, containerWidthPx);
  const isFr = lang === 'fr';

  return (
    <div className="flex flex-col gap-6 text-left">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          type="button"
          data-testid="prensa-mode-linear-btn"
          onClick={() => setActivePrensaMode('linear')}
          className={`py-2.5 px-4 border-2 font-cactus font-bold text-xs md:text-sm uppercase tracking-wider cursor-pointer transition-colors ${
            activePrensaMode === 'linear'
              ? 'bg-[var(--cordel-wood)] text-[var(--cordel-on-accent)] border-[var(--cordel-border-strong)] shadow-[3px_3px_0px_var(--cordel-shadow-color)]'
              : 'bg-[var(--cordel-surface)] text-[var(--cordel-text)] border-[var(--cordel-border)] hover:bg-[var(--cordel-surface-elevated)]'
          }`}
        >
          {isFr ? '[ Partition Linéaire (Grille) ]' : '[ Partitura Linear (Grade) ]'}
        </button>
        <button
          type="button"
          data-testid="prensa-mode-roda-sheet-btn"
          onClick={() => setActivePrensaMode('roda-sheet')}
          className={`py-2.5 px-4 border-2 font-cactus font-bold text-xs md:text-sm uppercase tracking-wider cursor-pointer transition-colors ${
            activePrensaMode === 'roda-sheet'
              ? 'bg-[var(--cordel-wood)] text-[var(--cordel-on-accent)] border-[var(--cordel-border-strong)] shadow-[3px_3px_0px_var(--cordel-shadow-color)]'
              : 'bg-[var(--cordel-surface)] text-[var(--cordel-text)] border-[var(--cordel-border)] hover:bg-[var(--cordel-surface-elevated)]'
          }`}
        >
          {isFr ? '[ Planche de Mini-Rodas (8 à 12 / page A4) ]' : '[ Prancha de Mini-Rodas (8 a 12 / página A4) ]'}
        </button>
      </div>

      {activePrensaMode === 'roda-sheet' ? (
        <div className="border-2 border-[var(--cordel-border)] rounded-[3px_6px_4px_8px] p-4 bg-[var(--cordel-surface)] text-[var(--cordel-text)] shadow-[3px_3px_0px_var(--cordel-shadow-color)] min-h-[65vh] flex flex-col">
          <RodaSheetContainer lang={isFr ? 'fr' : 'pt'} />
        </div>
      ) : (
        <>
          <SettingsPrensaMetadata
            lang={lang} metadata={metadata} letras={letras}
            onMetaChange={onMetaChange} onLetrasChange={onLetrasChange}
            validExportTracks={validExportTracks} selectedExportTracks={selectedExportTracks}
            selectedAnnexTracks={selectedAnnexTracks} onToggleAll={handleToggleAll}
            onToggleTrackExport={handleToggleTrackExport} onToggleTrackAnnex={handleToggleTrackAnnex}
          />

          <SettingsPrensaPreview
            lang={lang} metadata={metadata} liveText={liveText} bodyFontSize={bodyFontSize}
            onLiveTextChange={setLiveText} onFontSizeChange={setBodyFontSize}
            onRefresh={refreshPreviewText} onContainerWidthChange={setContainerWidthPx}
          />

          <div className="border-2 border-[var(--cordel-border)] rounded-[3px_6px_4px_8px] p-4 bg-[var(--cordel-surface)] text-[var(--cordel-text)] shadow-[3px_3px_0px_var(--cordel-shadow-color)] flex flex-col gap-4">
            <h3 className="font-cactus font-bold text-sm uppercase text-[var(--cordel-text)] mb-1 flex items-center gap-2 border-b border-[var(--cordel-border)]/35 pb-1.5">
              <Printer size={15} className="text-[var(--cordel-accent-readable)] shrink-0" />
              <span>{isFr ? "Actions d'Impression & Exportation" : 'Ações de Impressão & Exportação'}</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => exportTablatureFile(liveText, selectedAnnexTracks, undefined, undefined, metadata)}
                disabled={!liveText}
                className="px-3 py-2 text-xs bg-[var(--cordel-surface-elevated)] text-[var(--cordel-text)] hover:bg-[var(--cordel-accent)] hover:text-[var(--cordel-on-accent)] border-2 border-[var(--cordel-border)] font-cactus font-bold uppercase cursor-pointer shadow-[2px_2px_0px_var(--cordel-shadow-color)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Download size={14} className="shrink-0" />
                <span>{isFr ? 'Télécharger (.txt)' : 'Baixar (.txt)'}</span>
              </button>
              <button
                type="button"
                onClick={() => printTablature(liveText, selectedAnnexTracks, undefined, undefined, metadata, undefined, undefined, undefined, bodyFontSize)}
                disabled={!liveText}
                className="px-3 py-2 text-xs bg-[var(--cordel-wood)] text-[var(--cordel-on-accent)] hover:bg-[var(--cordel-accent)] border-2 border-[var(--cordel-border-strong)] font-cactus font-bold uppercase cursor-pointer shadow-[2px_2px_0px_var(--cordel-shadow-color)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Printer size={14} className="shrink-0" />
                <span>{isFr ? 'Imprimer (HTML)' : 'Imprimir (HTML)'}</span>
              </button>
            </div>
            <div className="border-t border-dashed border-[var(--cordel-border)]/40 pt-3">
              <button
                type="button"
                onClick={printLegendOnly}
                className="w-full px-3 py-2 text-xs bg-[var(--cordel-surface-elevated)] text-[var(--cordel-text)] hover:bg-[var(--cordel-wood)] hover:text-[var(--cordel-on-accent)] border-2 border-[var(--cordel-border)] font-cactus font-bold uppercase cursor-pointer shadow-[2px_2px_0px_var(--cordel-shadow-color)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-colors flex items-center justify-center gap-2"
              >
                <FileText size={14} className="shrink-0" />
                <span>{isFr ? 'Imprimer la Légende' : 'Imprimir a Legenda'}</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
