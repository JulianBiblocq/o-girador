import React from 'react';
import { BalancoPreset } from '../../types/balanco.types';
import { Language } from '../../types';

interface BalancoCustomSectionProps {
  editingPresetId: string | null;
  editingPreset: BalancoPreset | null;
  customName: string;
  isSaving: boolean;
  canManageEditingPreset: boolean;
  isPreviewPlaying: boolean;
  lang: Language;
  setEditingPresetId: (id: string | null) => void;
  setCustomName: (name: string) => void;
  onOpenCaptureModal: () => void;
  onSaveCustomPreset: (saveAsNew: boolean) => void;
  onNudgeGroup: (delta: number) => void;
  onTogglePreview: () => void;
}

export const BalancoCustomSection: React.FC<BalancoCustomSectionProps> = ({
  editingPresetId,
  editingPreset,
  customName,
  isSaving,
  canManageEditingPreset,
  isPreviewPlaying,
  lang,
  setEditingPresetId,
  setCustomName,
  onOpenCaptureModal,
  onSaveCustomPreset,
  onNudgeGroup,
  onTogglePreview,
}) => {
  return (
    <div className="flex flex-col gap-3 bg-[#eaddcf]/40 p-3 border border-black/15 rounded-sm">
      {editingPresetId && editingPreset && (
        <div className="flex items-center justify-between gap-2 bg-[#f4ecd8] px-2.5 py-1.5 border-2 border-[#8b2a1a] rounded-sm text-xs font-bold text-[#1a1a1a]">
          <div className="flex items-center gap-1.5 truncate">
            <span className="text-[#8b2a1a]">✏️</span>
            <span className="truncate">
              {lang === 'fr' ? 'Édition en cours : ' : 'Editando : '}
              <span className="text-[#8b2a1a] font-cactus text-sm">« {editingPreset.name} »</span>
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              setEditingPresetId(null);
              setCustomName('');
            }}
            className="px-1.5 py-0.5 bg-white text-[9px] font-bold border border-black hover:bg-black hover:text-white transition-colors cursor-pointer whitespace-nowrap"
          >
            ✕ {lang === 'fr' ? 'Quitter édition' : 'Sair da edição'}
          </button>
        </div>
      )}

      <div className="flex flex-col gap-1">
        <label className="font-bold text-[10px] uppercase text-[#1a1a1a]">
          {editingPresetId
            ? lang === 'fr' ? 'Nom du preset en édition :' : 'Nome do preset em edição :'
            : lang === 'fr' ? 'Nom du preset à sauvegarder :' : 'Nome do preset a salvar :'}
        </label>
        <div className="flex gap-1.5 flex-wrap sm:flex-nowrap">
          <input
            type="text"
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            placeholder="Ex: Nagô Samambaia, Trovão Pesado..."
            className="flex-1 min-w-[140px] bg-white border border-black px-2 py-1 text-xs font-bold text-[#1a1a1a] outline-none shadow-[1px_1px_0px_#000]"
          />
          <button
            type="button"
            onClick={onOpenCaptureModal}
            className="px-2 py-1 bg-white text-[#1a1a1a] border border-black text-xs font-bold hover:bg-black hover:text-white transition-colors cursor-pointer shadow-[1px_1px_0px_#000] flex items-center gap-1 whitespace-nowrap"
          >
            🎙️ {lang === 'fr' ? 'Capturer' : 'Capturar'}
          </button>

          {editingPresetId && canManageEditingPreset ? (
            <>
              <button
                type="button"
                onClick={() => onSaveCustomPreset(false)}
                disabled={isSaving}
                className="px-2.5 py-1 bg-[#1b4332] text-[#f4ecd8] border border-black text-xs font-bold hover:bg-black hover:text-white transition-colors cursor-pointer shadow-[1px_1px_0px_#000] disabled:opacity-50 whitespace-nowrap"
              >
                💾 {isSaving ? (lang === 'fr' ? 'Envoi...' : 'Salvando...') : lang === 'fr' ? 'Mettre à jour' : 'Atualizar'}
              </button>
              <button
                type="button"
                onClick={() => onSaveCustomPreset(true)}
                disabled={isSaving}
                className="px-2 py-1 bg-[#8b2a1a] text-[#f4ecd8] border border-black text-xs font-bold hover:bg-black hover:text-white transition-colors cursor-pointer shadow-[1px_1px_0px_#000] disabled:opacity-50 whitespace-nowrap"
              >
                ➕ {lang === 'fr' ? 'Enregistrer sous...' : 'Salvar como...'}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => onSaveCustomPreset(false)}
              disabled={isSaving}
              className="px-2.5 py-1 bg-[#8b2a1a] text-[#f4ecd8] border border-black text-xs font-bold hover:bg-black hover:text-white transition-colors cursor-pointer shadow-[1px_1px_0px_#000] disabled:opacity-50 whitespace-nowrap"
            >
              💾 {isSaving ? (lang === 'fr' ? 'Sauvegarde...' : 'Salvando...') : lang === 'fr' ? 'Enregistrer' : 'Salvar'}
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 pt-1 border-t border-black/10 flex-wrap">
        <div className="flex items-center gap-1.5">
          <span className="font-bold text-[10px] uppercase text-[#1a1a1a]">
            ⚡ {lang === 'fr' ? 'Nudge Groupé :' : 'Nudge em Bloco :'}
          </span>
          <div className="flex gap-1">
            {[-5, -1, 1, 5].map((delta) => (
              <button
                key={delta}
                type="button"
                onClick={() => onNudgeGroup(delta)}
                className="px-2 py-0.5 bg-white border border-black text-[10px] font-bold text-[#1a1a1a] hover:bg-black hover:text-white transition-colors cursor-pointer shadow-[1px_1px_0px_#000]"
              >
                {delta > 0 ? `+${delta}%` : `${delta}%`}
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={onTogglePreview}
          className={`px-2.5 py-1 text-xs font-bold border border-black cursor-pointer shadow-[1.5px_1.5px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none flex items-center gap-1 transition-all ${
            isPreviewPlaying
              ? 'bg-[#8b2a1a] text-[#f4ecd8] animate-pulse ring-1 ring-[#8b2a1a]'
              : 'bg-white text-[#1a1a1a] hover:bg-black hover:text-white'
          }`}
        >
          {isPreviewPlaying ? '⏹' : '▶'}{' '}
          {lang === 'fr' ? (isPreviewPlaying ? 'Arrêter' : 'Tester le groove') : isPreviewPlaying ? 'Parar' : 'Testar o groove'}
        </button>
      </div>
    </div>
  );
};
