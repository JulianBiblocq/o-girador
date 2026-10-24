/**
 * Barre de chargement photo, sélection de modèle et reprise de brouillon Cloud (< 80 lignes).
 */
import React from 'react';
import { PaperPreset } from '../../types/paperWorkshop.types';
import { Upload, Trash2 } from 'lucide-react';
import { PaperScanDraftDocument } from '../../utils/paper/paperScanCloudStorage';

interface Props {
  photoPreview: string | null;
  onPhotoUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  selectedPresetId: string;
  presetsList: PaperPreset[];
  onSelectPreset: (preset: PaperPreset) => void;
  draftsList?: PaperScanDraftDocument[];
  selectedDraftId?: string | null;
  onSelectDraft?: (draft: PaperScanDraftDocument) => void;
  onDeleteDraft?: (draftId: string) => void;
  lang: 'fr' | 'pt';
}

export const PaperScannerUploadBar: React.FC<Props> = ({
  photoPreview, onPhotoUpload, selectedPresetId, presetsList, onSelectPreset,
  draftsList, selectedDraftId, onSelectDraft, onDeleteDraft, lang,
}) => {
  const isFr = lang === 'fr';

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val.startsWith('draft:')) {
      const dId = val.replace('draft:', '');
      const d = draftsList?.find((item) => item.id === dId);
      if (d && onSelectDraft) onSelectDraft(d);
    } else {
      onSelectPreset(presetsList.find((pr) => pr.id === val) || presetsList[0]);
    }
  };

  return (
    <div className="p-2.5 bg-black/5 dark:bg-black/20 border-2 border-[var(--cordel-border,#1a1a1a)] flex flex-wrap gap-2 items-center justify-between">
      <div className="flex items-center gap-2 shrink-0">
        <label className="px-2.5 py-1 bg-[#8b2a1a] text-[#f4ecd8] border-2 border-black font-cactus font-bold text-xs uppercase flex items-center gap-1.5 cursor-pointer shadow-[2px_2px_0px_#000]">
          <Upload size={12} />
          <span className="whitespace-nowrap">{isFr ? 'Charger Photo' : 'Carregar Foto'}</span>
          <input type="file" accept="image/*" capture="environment" onChange={onPhotoUpload} className="hidden" />
        </label>
        <span className="text-[10px] text-gray-600 dark:text-gray-300 italic whitespace-nowrap">
          {photoPreview ? (isFr ? 'Photo chargée' : 'Foto carregada') : (isFr ? 'Prenez en photo votre fiche' : 'Tire uma foto')}
        </span>
      </div>

      <div className="flex items-center gap-1.5 min-w-0 flex-1 sm:flex-initial justify-end">
        <label htmlFor="paper-model-select" className="font-cactus font-bold text-xs uppercase text-[#8b2a1a] dark:text-[#f59e0b] shrink-0 whitespace-nowrap">
          {isFr ? 'Partition / Import :' : 'Partitura / Import :'}
        </label>
        <select
          id="paper-model-select"
          value={selectedDraftId ? `draft:${selectedDraftId}` : selectedPresetId}
          onChange={handleSelectChange}
          className="p-1 bg-[#efe6d0] text-[#1a1a1a] border-2 border-[#1a1a1a] dark:bg-[#262220] dark:text-[#f4ecd8] dark:border-[#f4ecd8]/50 font-cactus font-bold text-xs max-w-[260px] w-full truncate cursor-pointer shadow-[1px_1px_0px_#000]"
        >
          {draftsList && draftsList.length > 0 && (
            <optgroup label={isFr ? 'Mes Imports en cours (Cloud)' : 'Minhas Importações (Nuvem)'}>
              {draftsList.map((d) => (
                <option key={d.id} value={`draft:${d.id}`}>
                  {d.deviceType === 'mobile' ? '[Mobile] ' : '[PC] '}{d.title}
                </option>
              ))}
            </optgroup>
          )}
          <optgroup label={isFr ? 'Modèles Standards' : 'Modelos Padrão'}>
            {presetsList.map((p) => (
              <option key={p.id} value={p.id} className="bg-[#efe6d0] text-[#1a1a1a] dark:bg-[#262220] dark:text-[#f4ecd8]">{p.name}</option>
            ))}
          </optgroup>
        </select>
        {selectedDraftId && onDeleteDraft && (
          <button
            type="button"
            onClick={() => onDeleteDraft(selectedDraftId)}
            title={isFr ? 'Supprimer ce brouillon d\'import' : 'Excluir rascunho de importação'}
            className="p-1 text-[#8b2a1a] hover:bg-[#8b2a1a]/10 border border-[#8b2a1a] cursor-pointer shrink-0"
          >
            <Trash2 size={13} />
          </button>
        )}
      </div>
    </div>
  );
};
