import React from 'react';
import { Check, X, Pencil, Trash2 } from 'lucide-react';
import { DesktopWorkspaceLayout } from '../../types/desktopWorkspace.types';

interface SettingsDesktopLayoutCardProps {
  layout: DesktopWorkspaceLayout;
  lang: string;
  isActiveLayout: boolean;
  isEditing: boolean;
  editingName: string;
  isConfirmingDelete: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSaveRename: () => void;
  onNameChange: (val: string) => void;
  onApply: () => void;
  onAskDelete: () => void;
  onCancelDelete: () => void;
  onConfirmDelete: () => void;
}

export const SettingsDesktopLayoutCard: React.FC<SettingsDesktopLayoutCardProps> = ({
  layout, lang, isActiveLayout, isEditing, editingName, isConfirmingDelete,
  onStartEdit, onCancelEdit, onSaveRename, onNameChange,
  onApply, onAskDelete, onCancelDelete, onConfirmDelete,
}) => {
  const { mixer, roda, detailEditor } = layout.detachedPanels;

  return (
    <div
      className={`border-2 border-[var(--cordel-border)] bg-[var(--cordel-surface)] text-[var(--cordel-text)] p-4 shadow-[3px_3px_0px_var(--cordel-shadow-color)] flex flex-col justify-between gap-3 rounded-[3px_6px_4px_8px] transition-colors ${
        isActiveLayout ? 'ring-2 ring-[var(--cordel-accent)] bg-[var(--cordel-surface-elevated)]' : ''
      }`}
    >
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
              <button type="button" onClick={onSaveRename} className="px-2 py-1 bg-[var(--cordel-status-success)] text-[var(--cordel-on-accent)] border border-[var(--cordel-border-strong)] font-bold text-xs cursor-pointer hover:opacity-90 flex items-center justify-center">
                <Check size={12} className="stroke-[2.5]" />
              </button>
              <button type="button" onClick={onCancelEdit} className="px-2 py-1 bg-[var(--cordel-surface-elevated)] text-[var(--cordel-text)] border border-[var(--cordel-border)] font-bold text-xs cursor-pointer hover:bg-[var(--cordel-surface-muted)] flex items-center justify-center">
                <X size={12} className="stroke-[2.5]" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span className="font-cactus font-bold text-sm text-[var(--cordel-text)] truncate" title={layout.name}>
                {layout.name}
              </span>
              <button type="button" onClick={onStartEdit} className="text-[11px] text-[var(--cordel-text-muted)] hover:text-[var(--cordel-text)] cursor-pointer p-0.5">
                <Pencil size={12} />
              </button>
              {isActiveLayout && (
                <span className="text-[9px] font-bold font-cactus bg-[var(--cordel-wood)] text-[var(--cordel-on-accent)] px-1.5 py-0.5 rounded shrink-0">
                  {lang === 'pt' ? 'Ativo' : 'Actif'}
                </span>
              )}
              <span className="text-[9px] text-[var(--cordel-text-muted)] ml-auto font-mono">
                {new Date(layout.createdAt).toLocaleDateString()}
              </span>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5 text-[9px] font-cactus font-bold">
          <span className={`px-1.5 py-0.5 border rounded flex items-center gap-1 ${mixer?.detached ? 'bg-[var(--cordel-surface-elevated)] text-[var(--cordel-accent-readable)] border-[var(--cordel-accent)]' : 'bg-[var(--cordel-surface-muted)] text-[var(--cordel-text-muted)] border-[var(--cordel-border)]'}`}>
            {mixer?.detached ? (lang === 'pt' ? 'Mesa destacada' : 'Console déportée') : (lang === 'pt' ? 'Mesa ancorada' : 'Console ancrée')}
          </span>
          <span className={`px-1.5 py-0.5 border rounded flex items-center gap-1 ${roda?.detached ? 'bg-[var(--cordel-surface-elevated)] text-[var(--cordel-accent-readable)] border-[var(--cordel-accent)]' : 'bg-[var(--cordel-surface-muted)] text-[var(--cordel-text-muted)] border-[var(--cordel-border)]'}`}>
            {roda?.detached ? (lang === 'pt' ? 'Roda destacada' : 'Roda déportée') : (lang === 'pt' ? 'Roda ancorada' : 'Roda ancrée')}
          </span>
          {detailEditor?.detached && (
            <span className="px-1.5 py-0.5 border rounded bg-[var(--cordel-surface-elevated)] text-[var(--cordel-accent-readable)] border-[var(--cordel-accent)] flex items-center gap-1">
              {lang === 'pt' ? 'Editor destacado' : 'Éditeur déporté'}
            </span>
          )}
        </div>
      </div>

      <div className="border-t border-[var(--cordel-border)]/35 pt-2 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onApply}
          className={`flex-1 font-cactus font-bold uppercase text-[10px] md:text-xs py-1.5 px-3 border-2 border-[var(--cordel-border-strong)] shadow-[2px_2px_0px_var(--cordel-shadow-color)] cursor-pointer transition-colors active:translate-x-[1px] active:translate-y-[1px] active:shadow-none ${
            isActiveLayout
              ? 'bg-[var(--cordel-accent)] text-[var(--cordel-on-accent)] hover:bg-[var(--cordel-wood)]'
              : 'bg-[var(--cordel-wood)] text-[var(--cordel-on-accent)] hover:bg-[var(--cordel-accent)]'
          }`}
        >
          {lang === 'pt' ? 'Aplicar espaço' : "Appliquer l'espace"}
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
