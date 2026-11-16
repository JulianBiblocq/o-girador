import React from 'react';
import { Edit3, Mic, Save, Plus } from 'lucide-react';
import { BalancoPreset } from '../../types/balanco.types';
import { Language } from '../../types';
import { BalancoCustomNudgeBar } from './BalancoCustomNudgeBar';

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
    <div className="flex flex-col gap-3 bg-[var(--cordel-surface)] p-3 border border-[var(--cordel-border)] rounded-sm">
      {editingPresetId && editingPreset && (
        <div className="flex items-center justify-between gap-2 bg-[var(--cordel-surface-elevated)] px-2.5 py-1.5 border-2 border-[var(--cordel-wood)] rounded-sm text-xs font-bold text-[var(--cordel-text)]">
          <div className="flex items-center gap-1.5 truncate">
            <Edit3 size={13} className="text-[var(--cordel-accent-readable)] shrink-0" />
            <span className="truncate">
              {lang === 'fr' ? 'Édition en cours : ' : 'Editando : '}
              <span className="text-[var(--cordel-accent-readable)] font-cactus text-sm">« {editingPreset.name} »</span>
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              setEditingPresetId(null);
              setCustomName('');
            }}
            className="px-1.5 py-0.5 bg-[var(--cordel-card-btn-bg)] text-[var(--cordel-card-btn-text)] text-[9px] font-bold border border-[var(--cordel-card-btn-border)] hover:bg-[var(--cordel-wood)] hover:text-[var(--cordel-on-accent)] transition-colors cursor-pointer whitespace-nowrap"
          >
            {lang === 'fr' ? 'Quitter édition' : 'Sair da edição'}
          </button>
        </div>
      )}

      <div className="flex flex-col gap-1">
        <label className="font-bold text-[10px] uppercase text-[var(--cordel-text)]">
          {editingPresetId
            ? lang === 'fr' ? 'Nom du preset en édition :' : 'Nome do preset em edição :'
            : lang === 'fr' ? 'Nom du preset à sauvegarder :' : 'Nome do preset a salvar :'}
        </label>
        <div className="flex gap-1.5 flex-wrap sm:flex-nowrap">
          <input
            type="text"
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            placeholder={lang === 'fr' ? 'Ex: Nagô Traditionnel, Baque Pesado...' : 'Ex: Nagô Tradicional, Baque Pesado...'}
            className="flex-1 min-w-[140px] bg-[var(--cordel-surface-elevated)] border border-[var(--cordel-border)] px-2 py-1 text-xs font-bold text-[var(--cordel-text)] placeholder:text-[var(--cordel-text-muted)]/60 outline-none shadow-[1px_1px_0px_var(--cordel-shadow-color)]"
          />
          <button
            type="button"
            onClick={onOpenCaptureModal}
            className="px-2 py-1 bg-[var(--cordel-card-btn-bg)] text-[var(--cordel-card-btn-text)] border border-[var(--cordel-card-btn-border)] text-xs font-bold hover:bg-[var(--cordel-wood)] hover:text-[var(--cordel-on-accent)] transition-colors cursor-pointer shadow-[1px_1px_0px_var(--cordel-shadow-color)] flex items-center gap-1 whitespace-nowrap"
          >
            <Mic size={13} className="shrink-0" />
            <span>{lang === 'fr' ? 'Capturer' : 'Capturar'}</span>
          </button>

          {editingPresetId && canManageEditingPreset ? (
            <>
              <button
                type="button"
                onClick={() => onSaveCustomPreset(false)}
                disabled={isSaving}
                className="px-2.5 py-1 bg-[var(--cordel-status-success)] text-[var(--cordel-on-accent)] border border-[var(--cordel-border)] text-xs font-bold hover:opacity-90 transition-opacity cursor-pointer shadow-[1px_1px_0px_var(--cordel-shadow-color)] disabled:opacity-50 whitespace-nowrap flex items-center gap-1"
              >
                <Save size={13} className="shrink-0" />
                <span>{isSaving ? (lang === 'fr' ? 'Envoi...' : 'Salvando...') : lang === 'fr' ? 'Mettre à jour' : 'Atualizar'}</span>
              </button>
              <button
                type="button"
                onClick={() => onSaveCustomPreset(true)}
                disabled={isSaving}
                className="px-2 py-1 bg-[var(--cordel-wood)] text-[var(--cordel-on-accent)] border border-[var(--cordel-border)] text-xs font-bold hover:opacity-90 transition-opacity cursor-pointer shadow-[1px_1px_0px_var(--cordel-shadow-color)] disabled:opacity-50 whitespace-nowrap flex items-center gap-1"
              >
                <Plus size={13} className="shrink-0" />
                <span>{lang === 'fr' ? 'Enregistrer sous...' : 'Salvar como...'}</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => onSaveCustomPreset(false)}
              disabled={isSaving}
              className="px-2.5 py-1 bg-[var(--cordel-wood)] text-[var(--cordel-on-accent)] border border-[var(--cordel-border)] text-xs font-bold hover:opacity-90 transition-opacity cursor-pointer shadow-[1px_1px_0px_var(--cordel-shadow-color)] disabled:opacity-50 whitespace-nowrap flex items-center gap-1"
            >
              <Save size={13} className="shrink-0" />
              <span>{isSaving ? (lang === 'fr' ? 'Sauvegarde...' : 'Salvando...') : lang === 'fr' ? 'Enregistrer' : 'Salvar'}</span>
            </button>
          )}
        </div>
      </div>

      <BalancoCustomNudgeBar
        lang={lang}
        isPreviewPlaying={isPreviewPlaying}
        onNudgeGroup={onNudgeGroup}
        onTogglePreview={onTogglePreview}
      />
    </div>
  );
};
