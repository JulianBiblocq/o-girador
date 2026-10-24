/**
 * Barre superieure d'importation et chargement photo avec filtre traite (< 115 lignes).
 */
import React from 'react';
import { PaperPreset } from '../../types/paperWorkshop.types';
import { Upload, Trash2, FolderOpen, Eye, EyeOff, Check, RotateCcw } from 'lucide-react';
import { PaperScanDraftDocument } from '../../utils/paper/paperScanCloudStorage';
import { PaperScannerSelectOptions } from './PaperScannerSelectOptions';

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
  hideProcessed: boolean;
  onToggleHideProcessed: () => void;
  processedCount: number;
  isCurrentProcessed: boolean;
  onToggleCurrentProcessed: () => void;
  isProcessedId: (id: string) => boolean;
}

export const PaperScannerUploadBar: React.FC<Props> = ({
  photoPreview, onPhotoUpload, selectedPresetId, presetsList, onSelectPreset,
  draftsList = [], selectedDraftId, onSelectDraft, onDeleteDraft, lang,
  hideProcessed, onToggleHideProcessed, processedCount, isCurrentProcessed,
  onToggleCurrentProcessed, isProcessedId,
}) => {
  const isFr = lang === 'fr';

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (!val) return;
    if (val.startsWith('draft:')) {
      const d = draftsList.find((item) => item.id === val.replace('draft:', ''));
      if (d && onSelectDraft) onSelectDraft(d);
    } else {
      const found = presetsList.find((pr) => pr.id === val);
      if (found) onSelectPreset(found);
    }
  };

  const unprocDrafts = draftsList.filter((d) => !isProcessedId(`draft:${d.id}`));
  const procDrafts = draftsList.filter((d) => isProcessedId(`draft:${d.id}`));
  const unprocPresets = presetsList.filter((p) => !isProcessedId(p.id));
  const procPresets = presetsList.filter((p) => isProcessedId(p.id));
  const hasUnprocessed = unprocDrafts.length > 0 || unprocPresets.length > 0;

  return (
    <div className="p-3 bg-black/10 dark:bg-black/40 border-2 border-[var(--cordel-border,#1a1a1a)] flex flex-col gap-3">
      {/* RANGEE 1 : Selecteur PARTITION / IMPORT pleine largeur et actions de statut */}
      <div className="flex flex-col gap-1.5 w-full">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-[#d99b26] font-cactus font-bold text-xs sm:text-sm uppercase tracking-wide">
            <FolderOpen size={16} className="text-[#d99b26] shrink-0" />
            <span>{isFr ? 'Partition / Import :' : 'Partitura / Import :'}</span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={onToggleHideProcessed}
              className="px-2 py-1 bg-[#262220] hover:bg-[#383330] text-[#f4ecd8] border border-[#d99b26]/60 font-cactus font-bold text-[10px] uppercase flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
              title={hideProcessed ? (isFr ? 'Afficher les morceaux traites' : 'Exibir importacoes tratadas') : (isFr ? 'Masquer les morceaux traites' : 'Ocultar importacoes tratadas')}
            >
              {hideProcessed ? <Eye size={12} className="text-[#d99b26]" /> : <EyeOff size={12} className="text-[#d99b26]" />}
              <span>{hideProcessed ? `${isFr ? 'Afficher traites' : 'Exibir tratadas'} (${processedCount})` : `${isFr ? 'Masquer traites' : 'Ocultar tratadas'} (${processedCount})`}</span>
            </button>
            <button
              type="button"
              onClick={onToggleCurrentProcessed}
              className={`px-2 py-1 border font-cactus font-bold text-[10px] uppercase flex items-center gap-1 cursor-pointer transition-colors shadow-xs ${
                isCurrentProcessed
                  ? 'bg-[#15803d]/20 text-[#22c55e] border-[#22c55e] hover:bg-[#15803d]/30'
                  : 'bg-[#8b2a1a]/20 text-[#fca5a5] border-[#ef4444] hover:bg-[#8b2a1a]/30'
              }`}
            >
              {isCurrentProcessed ? <RotateCcw size={11} /> : <Check size={11} />}
              <span>{isCurrentProcessed ? (isFr ? 'Remettre a traiter' : 'Reabrir') : (isFr ? 'Marquer traite' : 'Marcar tratada')}</span>
            </button>
            {selectedDraftId && onDeleteDraft && (
              <button
                type="button"
                onClick={() => onDeleteDraft(selectedDraftId)}
                title={isFr ? 'Supprimer ce brouillon' : 'Excluir rascunho'}
                className="p-1 text-[#ef4444] hover:bg-[#ef4444]/15 border border-[#ef4444]/60 cursor-pointer"
              >
                <Trash2 size={12} />
              </button>
            )}
          </div>
        </div>

        <select
          id="paper-model-select"
          value={selectedDraftId ? `draft:${selectedDraftId}` : selectedPresetId}
          onChange={handleSelectChange}
          className="w-full min-h-[42px] px-3 py-2 text-sm font-cactus font-bold bg-[#1a1a1a] text-[#f4ecd8] border border-[#c8963e]/60 rounded focus:border-[#d99b26] focus:outline-none cursor-pointer shadow-[2px_2px_0px_#000]"
        >
          <PaperScannerSelectOptions
            hideProcessed={hideProcessed}
            hasUnprocessed={hasUnprocessed}
            unprocDrafts={unprocDrafts}
            procDrafts={procDrafts}
            unprocPresets={unprocPresets}
            procPresets={procPresets}
            isFr={isFr}
          />
        </select>
      </div>

      {/* RANGEE 2 : Action Photo / Scan sans chevauchement */}
      <div className="flex items-center gap-2.5 pt-1 border-t border-[var(--cordel-border,#1a1a1a)]/20">
        <label className="px-3 py-1.5 bg-[#8b2a1a] hover:bg-[#a03220] text-[#f4ecd8] border-2 border-black font-cactus font-bold text-xs uppercase flex items-center gap-1.5 cursor-pointer shadow-[2px_2px_0px_#000] active:translate-y-0.5 transition-all">
          <Upload size={13} />
          <span className="whitespace-nowrap">{isFr ? 'Charger Photo' : 'Carregar Foto'}</span>
          <input type="file" accept="image/*" capture="environment" onChange={onPhotoUpload} className="hidden" />
        </label>
        <span className="text-[11px] text-gray-600 dark:text-gray-300 italic whitespace-nowrap truncate">
          {photoPreview ? (isFr ? 'Photo chargee avec succes' : 'Foto carregada') : (isFr ? 'Prenez en photo votre fiche' : 'Tire uma foto da ficha')}
        </span>
      </div>
    </div>
  );
};
