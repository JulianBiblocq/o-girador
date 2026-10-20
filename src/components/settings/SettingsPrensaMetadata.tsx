import React from 'react';
import { instrumentsConfig } from '../../data';
import { useNomenclatureStore } from '../../stores/useNomenclatureStore';
import { TrackGroup } from '../../types';

interface SettingsPrensaMetadataProps {
  lang: string;
  metadata: any;
  letras: string;
  onMetaChange: (field: string, val: any) => void;
  onLetrasChange: (val: string) => void;
  validExportTracks: TrackGroup[];
  selectedExportTracks: Set<number>;
  selectedAnnexTracks: Set<number>;
  onToggleAll: () => void;
  onToggleTrackExport: (trackId: number, checked: boolean) => void;
  onToggleTrackAnnex: (trackId: number, checked: boolean) => void;
}

export const SettingsPrensaMetadata: React.FC<SettingsPrensaMetadataProps> = ({
  lang,
  metadata,
  letras,
  onMetaChange,
  onLetrasChange,
  validExportTracks,
  selectedExportTracks,
  selectedAnnexTracks,
  onToggleAll,
  onToggleTrackExport,
  onToggleTrackAnnex,
}) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="border-t-[2px] border-b-[4px] border-l-[3px] border-r-[2px] border-black rounded-[3px_6px_4px_8px] p-4 bg-white shadow-[3px_3px_0px_#000] flex flex-col gap-4">
        <h3 className="font-cactus font-bold text-sm uppercase mb-1 flex items-center gap-1.5 border-b border-black/10 pb-1">
          📜 {lang === 'fr' ? 'Métadonnées & Paroles' : 'Metadados & Letras'}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="flex flex-col gap-1">
            <label className="font-bold text-[10px] uppercase">{lang === 'fr' ? 'Titre :' : 'Título :'}</label>
            <input
              type="text"
              value={metadata.toada || ''}
              onChange={(e) => onMetaChange('toada', e.target.value)}
              className="bg-white border-2 border-black font-cactus font-bold text-xs p-2 focus:bg-[#fbf8f0] outline-none"
              placeholder={lang === 'fr' ? 'Nom de la Toada' : 'Nome da Toada'}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="font-bold text-[10px] uppercase">{lang === 'fr' ? 'Compositeur :' : 'Compositor :'}</label>
            <input
              type="text"
              value={metadata.compositor || ''}
              onChange={(e) => onMetaChange('compositor', e.target.value)}
              className="bg-white border-2 border-black font-cactus font-bold text-xs p-2 focus:bg-[#fbf8f0] outline-none"
              placeholder={lang === 'fr' ? 'Mestre / Compositeur' : 'Mestre / Compositor'}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="font-bold text-[10px] uppercase">{lang === 'fr' ? 'Rythme :' : 'Ritmo :'}</label>
            <input
              type="text"
              value={metadata.ritmo || ''}
              onChange={(e) => onMetaChange('ritmo', e.target.value)}
              className="bg-white border-2 border-black font-cactus font-bold text-xs p-2 focus:bg-[#fbf8f0] outline-none"
              placeholder={lang === 'fr' ? 'Ex : Maracatu Nação' : 'Ex: Maracatu Nação'}
            />
          </div>
        </div>
        <div className="flex flex-col gap-1 flex-grow">
          <label className="font-bold text-[10px] uppercase">{lang === 'fr' ? 'Paroles :' : 'Letras :'}</label>
          <textarea
            rows={5}
            value={letras}
            onChange={(e) => onLetrasChange(e.target.value)}
            className="bg-white border-2 border-black font-sans font-bold text-xs p-2 focus:bg-[#fbf8f0] outline-none resize-none custom-scrollbar flex-grow"
            placeholder={lang === 'fr' ? 'Entrez les paroles ici...' : 'Digite as letras aqui...'}
          />
        </div>
      </div>

      <div className="border-t-[2px] border-b-[4px] border-l-[3px] border-r-[2px] border-black rounded-[3px_6px_4px_8px] p-4 bg-white shadow-[3px_3px_0px_#000] flex flex-col gap-4">
        <h3 className="font-cactus font-bold text-sm uppercase mb-1 flex items-center gap-1.5 border-b border-black/10 pb-1">
          🥁 {lang === 'fr' ? 'Sélection des Instruments' : 'Seleção de Instrumentos'}
        </h3>
        <div className="flex flex-col gap-2 max-h-[360px] overflow-y-auto pr-2 custom-scrollbar flex-grow">
          <label className="flex items-center gap-3 p-2 border-2 border-black bg-white cursor-pointer hover:bg-black/5 transition-colors select-none">
            <input
              type="checkbox"
              className="w-4 h-4 cursor-pointer accent-black"
              checked={validExportTracks.length === selectedExportTracks.size}
              onChange={onToggleAll}
            />
            <span className="font-cactus font-bold text-xs uppercase">
              {lang === 'fr' ? 'Tous les instruments' : 'Todos os instrumentos'}
            </span>
          </label>

          {validExportTracks.map((track) => {
            const conf = instrumentsConfig[track.instrumentIdx];
            if (!conf) return null;
            const isExportChecked = selectedExportTracks.has(track.id);
            const isAnnexChecked = selectedAnnexTracks.has(track.id);

            return (
              <div key={track.id} className="grid grid-cols-2 gap-2 p-2 border border-black/20 bg-black/[0.01] ml-4">
                <label className="flex items-center gap-2 cursor-pointer hover:bg-black/5 transition-colors select-none truncate">
                  <input
                    type="checkbox"
                    className="w-3.5 h-3.5 cursor-pointer accent-black"
                    checked={isExportChecked}
                    onChange={(e) => onToggleTrackExport(track.id, e.target.checked)}
                  />
                  <span className="font-cactus text-xs font-bold text-[#8b2a1a] uppercase truncate">
                    {track.customName || useNomenclatureStore.getState().getInstrumentLabel(conf.id) || conf.name}
                  </span>
                </label>
                <label className={`flex items-center gap-2 cursor-pointer transition-all select-none ${!isExportChecked ? 'opacity-40 pointer-events-none' : 'hover:bg-black/5'}`}>
                  <input
                    type="checkbox"
                    className="w-3 h-3 cursor-pointer accent-black"
                    checked={isAnnexChecked}
                    disabled={!isExportChecked}
                    onChange={(e) => onToggleTrackAnnex(track.id, e.target.checked)}
                  />
                  <span className="font-sans text-[10px] opacity-80">
                    {lang === 'fr' ? 'Variation' : 'Variação'}
                  </span>
                </label>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
