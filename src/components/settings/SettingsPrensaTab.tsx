import React, { useState } from 'react';
import { exportTablatureFile, printTablature, printLegendOnly } from '../../utils/exportTablature';
import { SettingsPrensaMetadata } from './SettingsPrensaMetadata';
import { SettingsPrensaPreview } from './SettingsPrensaPreview';
import { usePrensaGenerator } from './usePrensaGenerator';

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
  const [bodyFontSize, setBodyFontSize] = useState<number>(13);
  const {
    validExportTracks,
    selectedExportTracks,
    selectedAnnexTracks,
    liveText,
    setLiveText,
    handleToggleAll,
    refreshPreviewText,
    handleToggleTrackExport,
    handleToggleTrackAnnex,
  } = usePrensaGenerator(lang, letras, measureBpms);

  return (
    <div className="flex flex-col gap-6 text-left">
      <SettingsPrensaMetadata
        lang={lang}
        metadata={metadata}
        letras={letras}
        onMetaChange={onMetaChange}
        onLetrasChange={onLetrasChange}
        validExportTracks={validExportTracks}
        selectedExportTracks={selectedExportTracks}
        selectedAnnexTracks={selectedAnnexTracks}
        onToggleAll={handleToggleAll}
        onToggleTrackExport={handleToggleTrackExport}
        onToggleTrackAnnex={handleToggleTrackAnnex}
      />

      <SettingsPrensaPreview
        lang={lang}
        metadata={metadata}
        liveText={liveText}
        bodyFontSize={bodyFontSize}
        onLiveTextChange={setLiveText}
        onFontSizeChange={setBodyFontSize}
        onRefresh={refreshPreviewText}
      />

      <div className="border-t-[2px] border-b-[4px] border-l-[3px] border-r-[2px] border-black rounded-[3px_6px_4px_8px] p-4 bg-white shadow-[3px_3px_0px_#000] flex flex-col gap-4">
        <h3 className="font-cactus font-bold text-sm uppercase mb-1 flex items-center gap-1.5 border-b border-black/10 pb-1">
          🖨️ Ações de Impressão & Exportação
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            onClick={() => exportTablatureFile(liveText, selectedAnnexTracks, undefined, undefined, metadata)}
            disabled={!liveText}
            className="px-3 py-2 text-[10px] bg-[#eaddcf] text-black border-2 border-black font-cactus font-bold uppercase cursor-pointer hover:bg-black hover:text-white shadow-[2px_2px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all disabled:opacity-50 disabled:cursor-not-allowed text-center"
          >
            {lang === 'fr' ? 'Télécharger (.txt)' : 'Baixar (.txt)'}
          </button>
          <button
            onClick={() => printTablature(liveText, selectedAnnexTracks, undefined, undefined, metadata, undefined, undefined, undefined, bodyFontSize)}
            disabled={!liveText}
            className="px-3 py-2 text-[10px] bg-black text-[#f4ecd8] border-2 border-black font-cactus font-bold uppercase cursor-pointer hover:bg-white hover:text-black shadow-[2px_2px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all disabled:opacity-50 disabled:cursor-not-allowed text-center"
          >
            {lang === 'fr' ? 'Imprimer (HTML)' : 'Imprimir (HTML)'}
          </button>
        </div>
        <div className="border-t border-dashed border-black/20 pt-3">
          <button
            onClick={printLegendOnly}
            className="w-full px-3 py-2 text-[10px] bg-white text-black border-2 border-black font-cactus font-bold uppercase cursor-pointer hover:bg-[#8b2a1a] hover:text-[#f4ecd8] shadow-[2px_2px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all text-center"
          >
            {lang === 'fr' ? '🖨️ Imprimer la Légende' : '🖨️ Imprimir a Legenda'}
          </button>
        </div>
      </div>
    </div>
  );
};
