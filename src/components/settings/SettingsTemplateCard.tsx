import React from 'react';
import { Check, X, Pencil, Trash2 } from 'lucide-react';
import { WorkspaceTemplate } from '../../types';
import { instrumentsConfig } from '../../data';

interface SettingsTemplateCardProps {
  tpl: WorkspaceTemplate;
  lang: string;
  isEditing: boolean;
  editingName: string;
  isConfirmingDelete: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSaveRename: () => void;
  onNameChange: (val: string) => void;
  onLoadTemplate: () => void;
  onAskDelete: () => void;
  onCancelDelete: () => void;
  onConfirmDelete: () => void;
}

export const SettingsTemplateCard: React.FC<SettingsTemplateCardProps> = ({
  tpl, lang, isEditing, editingName, isConfirmingDelete,
  onStartEdit, onCancelEdit, onSaveRename, onNameChange,
  onLoadTemplate, onAskDelete, onCancelDelete, onConfirmDelete,
}) => {
  return (
    <div className="border-2 border-[var(--cordel-border)] bg-[var(--cordel-surface)] text-[var(--cordel-text)] p-4 shadow-[3px_3px_0px_var(--cordel-shadow-color)] flex flex-col justify-between gap-3 rounded-[3px_6px_4px_8px]">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2 border-b border-[var(--cordel-border)]/35 pb-2">
          {isEditing ? (
            <div className="flex items-center gap-1.5 flex-1">
              <input
                type="text"
                value={editingName}
                onChange={(e) => onNameChange(e.target.value)}
                className="border-2 border-[var(--cordel-border-strong)] px-2 py-0.5 text-xs font-cactus font-bold bg-[var(--cordel-surface-elevated)] text-[var(--cordel-text)] flex-1 outline-none"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') onSaveRename();
                  if (e.key === 'Escape') { e.stopPropagation(); onCancelEdit(); }
                }}
              />
              <button
                type="button"
                onClick={onSaveRename}
                className="px-2 py-1 bg-[var(--cordel-status-success)] text-[var(--cordel-on-accent)] border border-[var(--cordel-border-strong)] font-bold text-xs cursor-pointer hover:opacity-90 flex items-center justify-center"
                title={lang === 'pt' ? 'Salvar' : 'Enregistrer'}
              >
                <Check size={12} className="stroke-[2.5]" />
              </button>
              <button
                type="button"
                onClick={onCancelEdit}
                className="px-2 py-1 bg-[var(--cordel-surface-elevated)] text-[var(--cordel-text)] border border-[var(--cordel-border)] font-bold text-xs cursor-pointer hover:bg-[var(--cordel-surface-muted)] flex items-center justify-center"
                title={lang === 'pt' ? 'Cancelar' : 'Annuler'}
              >
                <X size={12} className="stroke-[2.5]" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span className="font-cactus font-bold text-sm text-[var(--cordel-text)] truncate" title={tpl.name}>
                {tpl.name}
              </span>
              <button
                type="button"
                onClick={onStartEdit}
                className="text-[11px] text-[var(--cordel-text-muted)] hover:text-[var(--cordel-text)] cursor-pointer p-0.5"
                title={lang === 'pt' ? 'Renomear modelo' : 'Renommer le gabarit'}
              >
                <Pencil size={12} />
              </button>
            </div>
          )}
          <span className="text-[9px] font-bold font-cactus bg-[var(--cordel-surface-elevated)] text-[var(--cordel-text-muted)] border border-[var(--cordel-border)] px-1.5 py-0.5 rounded shrink-0">
            {lang === 'pt' ? 'Privado' : 'Privé'}
          </span>
        </div>

        <div className="flex items-center justify-between text-[10px] text-[var(--cordel-text-muted)]">
          <span>{tpl.tracks.length} {lang === 'pt' ? 'faixas' : 'pistes'}</span>
          <span>{new Date(tpl.updatedAt).toLocaleDateString(lang === 'pt' ? 'pt-BR' : 'fr-FR')}</span>
        </div>

        <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto py-1">
          {tpl.tracks.map((tr, idx) => {
            const inst = instrumentsConfig[tr.instrumentIdx];
            const label = tr.customName || (inst ? inst.name : `Track ${idx + 1}`);
            return (
              <span key={idx} className="bg-[var(--cordel-surface-elevated)] text-[var(--cordel-text)] border border-[var(--cordel-border)] px-1.5 py-0.5 text-[9px] font-cactus font-bold rounded">
                {label}
              </span>
            );
          })}
        </div>
      </div>

      <div className="border-t border-[var(--cordel-border)]/35 pt-2 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onLoadTemplate}
          className="flex-1 bg-[var(--cordel-wood)] text-[var(--cordel-on-accent)] hover:bg-[var(--cordel-accent)] border-2 border-[var(--cordel-border-strong)] font-cactus font-bold uppercase text-[10px] md:text-xs py-1.5 px-3 shadow-[2px_2px_0px_var(--cordel-shadow-color)] cursor-pointer transition-colors active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
        >
          {lang === 'pt' ? 'Criar projeto com este modelo' : 'Créer un projet avec ce gabarit'}
        </button>

        {isConfirmingDelete ? (
          <div className="flex items-center gap-1">
            <button type="button" onClick={onConfirmDelete} className="px-2 py-1 bg-[var(--cordel-status-danger)] text-[var(--cordel-on-accent)] font-cactus font-bold text-[10px] uppercase border border-[var(--cordel-border-strong)] cursor-pointer hover:opacity-90">
              {lang === 'pt' ? 'Excluir' : 'Suppr.'}
            </button>
            <button type="button" onClick={onCancelDelete} className="px-2 py-1 bg-[var(--cordel-surface-elevated)] text-[var(--cordel-text)] font-cactus font-bold text-[10px] uppercase border border-[var(--cordel-border)] cursor-pointer hover:bg-[var(--cordel-surface-muted)] flex items-center justify-center">
              <X size={12} className="stroke-[2.5]" />
            </button>
          </div>
        ) : (
          <button type="button" onClick={onAskDelete} className="px-2 py-1 bg-[var(--cordel-surface-elevated)] text-[var(--cordel-accent-readable)] hover:bg-[var(--cordel-status-danger)] hover:text-[var(--cordel-on-accent)] border-2 border-[var(--cordel-border)] font-cactus font-bold text-xs cursor-pointer shadow-[1.5px_1.5px_0px_var(--cordel-shadow-color)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none flex items-center justify-center transition-colors">
            <Trash2 size={13} />
          </button>
        )}
      </div>
    </div>
  );
};
