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

const INPUT_CLS =
  'bg-[var(--cordel-surface-elevated)] text-[var(--cordel-text)] placeholder:text-[var(--cordel-text-muted)]/70 border-2 border-[var(--cordel-border)] font-cactus font-bold text-xs p-2 focus:border-[var(--cordel-accent-readable)] outline-none';

export const SettingsPrensaMetadata: React.FC<SettingsPrensaMetadataProps> = ({
  lang, metadata, letras, onMetaChange, onLetrasChange,
  validExportTracks, selectedExportTracks, selectedAnnexTracks,
  onToggleAll, onToggleTrackExport, onToggleTrackAnnex,
}) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="border-2 border-[var(--cordel-border)] rounded-[3px_6px_4px_8px] p-4 bg-[var(--cordel-surface)] text-[var(--cordel-text)] shadow-[3px_3px_0px_var(--cordel-shadow-color)] flex flex-col gap-4">
        <h3 className="font-cactus font-bold text-sm uppercase text-[var(--cordel-text)] mb-1 flex items-center gap-1.5 border-b border-[var(--cordel-border)]/35 pb-1.5">
          {lang === 'fr' ? 'Métadonnées & Paroles' : 'Metadados & Letras'}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="flex flex-col gap-1">
            <label className="font-semibold text-[10px] uppercase text-[var(--cordel-text-muted)]">{lang === 'fr' ? 'Titre :' : 'Título :'}</label>
            <input
              type="text"
              value={metadata.toada || ''}
              onChange={(e) => onMetaChange('toada', e.target.value)}
              className={INPUT_CLS}
              placeholder={lang === 'fr' ? 'Nom de la Toada' : 'Nome da Toada'}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="font-semibold text-[10px] uppercase text-[var(--cordel-text-muted)]">{lang === 'fr' ? 'Compositeur :' : 'Compositor :'}</label>
            <input
              type="text"
              value={metadata.compositor || ''}
              onChange={(e) => onMetaChange('compositor', e.target.value)}
              className={INPUT_CLS}
              placeholder={lang === 'fr' ? 'Mestre / Compositeur' : 'Mestre / Compositor'}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="font-semibold text-[10px] uppercase text-[var(--cordel-text-muted)]">{lang === 'fr' ? 'Rythme :' : 'Ritmo :'}</label>
            <input
              type="text"
              value={metadata.ritmo || ''}
              onChange={(e) => onMetaChange('ritmo', e.target.value)}
              className={INPUT_CLS}
              placeholder={lang === 'fr' ? 'Ex : Maracatu Nação' : 'Ex: Maracatu Nação'}
            />
          </div>
        </div>
        <div className="flex flex-col gap-1 flex-grow">
          <label className="font-semibold text-[10px] uppercase text-[var(--cordel-text-muted)]">{lang === 'fr' ? 'Paroles :' : 'Letras :'}</label>
          <textarea
            rows={5}
            value={letras}
            onChange={(e) => onLetrasChange(e.target.value)}
            className="bg-[var(--cordel-surface-elevated)] text-[var(--cordel-text)] placeholder:text-[var(--cordel-text-muted)]/70 border-2 border-[var(--cordel-border)] font-sans font-bold text-xs p-2 focus:border-[var(--cordel-accent-readable)] outline-none resize-none custom-scrollbar flex-grow"
            placeholder={lang === 'fr' ? 'Entrez les paroles ici...' : 'Digite as letras aqui...'}
          />
        </div>
      </div>

      <div className="border-2 border-[var(--cordel-border)] rounded-[3px_6px_4px_8px] p-4 bg-[var(--cordel-surface)] text-[var(--cordel-text)] shadow-[3px_3px_0px_var(--cordel-shadow-color)] flex flex-col gap-4">
        <h3 className="font-cactus font-bold text-sm uppercase text-[var(--cordel-text)] mb-1 flex items-center gap-1.5 border-b border-[var(--cordel-border)]/35 pb-1.5">
          {lang === 'fr' ? 'Sélection des Instruments' : 'Seleção de Instrumentos'}
        </h3>
        <div className="flex flex-col gap-2 max-h-[360px] overflow-y-auto pr-2 custom-scrollbar flex-grow">
          <label className="flex items-center gap-3 p-2 border-2 border-[var(--cordel-border-strong)] bg-[var(--cordel-surface-elevated)] text-[var(--cordel-text)] cursor-pointer hover:bg-[var(--cordel-surface-muted)] transition-colors select-none">
            <input
              type="checkbox"
              className="w-4 h-4 cursor-pointer accent-[var(--cordel-wood)]"
              checked={validExportTracks.length > 0 && validExportTracks.length === selectedExportTracks.size}
              onChange={onToggleAll}
            />
            <span className="font-cactus font-bold text-xs uppercase text-[var(--cordel-text)]">
              {lang === 'fr' ? 'Tous les instruments' : 'Todos os instrumentos'}
            </span>
          </label>

          {validExportTracks.map((track) => {
            const conf = instrumentsConfig[track.instrumentIdx];
            if (!conf) return null;
            const isExportChecked = selectedExportTracks.has(track.id);
            const isAnnexChecked = selectedAnnexTracks.has(track.id);

            return (
              <div key={track.id} className="grid grid-cols-2 gap-2 p-2 border border-[var(--cordel-border)]/50 bg-[var(--cordel-surface-muted)] ml-3 text-[var(--cordel-text)]">
                <label className="flex items-center gap-2 cursor-pointer hover:opacity-90 transition-opacity select-none truncate">
                  <input
                    type="checkbox"
                    className="w-3.5 h-3.5 cursor-pointer accent-[var(--cordel-wood)]"
                    checked={isExportChecked}
                    onChange={(e) => onToggleTrackExport(track.id, e.target.checked)}
                  />
                  <span className="font-cactus text-xs font-bold text-[var(--cordel-accent-readable)] uppercase truncate">
                    {track.customName || useNomenclatureStore.getState().getInstrumentLabel(conf.id) || conf.name}
                  </span>
                </label>
                <label className={`flex items-center gap-2 cursor-pointer transition-opacity select-none ${!isExportChecked ? 'opacity-40 pointer-events-none' : 'hover:opacity-90'}`}>
                  <input
                    type="checkbox"
                    className="w-3 h-3 cursor-pointer accent-[var(--cordel-wood)]"
                    checked={isAnnexChecked}
                    disabled={!isExportChecked}
                    onChange={(e) => onToggleTrackAnnex(track.id, e.target.checked)}
                  />
                  <span className="font-sans text-[10px] font-semibold text-[var(--cordel-text-muted)]">
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
