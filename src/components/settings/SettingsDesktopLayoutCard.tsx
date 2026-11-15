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
  const isPt = lang === 'pt';
  const modeLabel =
    layout.satelliteMode === 'mixer'
      ? (isPt ? 'Tela 2 : Mixagem' : 'Écran 2 : Mixage')
      : layout.satelliteMode === 'editor'
        ? (isPt ? 'Tela 2 : Edição' : 'Écran 2 : Édition')
        : (isPt ? 'Tela 2 : A Oficina' : 'Écran 2 : A Oficina');

  return (
    <div
      className={`border-2 border-[var(--cordel-border)] bg-[var(--cordel-surface)] text-[var(--cordel-text)] p-3.5 shadow-[3px_3px_0px_var(--cordel-shadow-color)] flex flex-col justify-between gap-2.5 transition-colors ${
        isActiveLayout ? 'ring-2 ring-[var(--cordel-accent)] bg-[var(--cordel-surface-elevated)]' : ''
      }`}
    >
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2 border-b border-[var(--cordel-border)]/35 pb-1.5">
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
              <button type="button" onClick={onSaveRename} className="px-2 py-1 bg-[var(--cordel-status-success)] text-[var(--cordel-on-accent)] border border-[var(--cordel-border-strong)] font-bold text-xs cursor-pointer flex items-center justify-center">
                <Check size={12} className="stroke-[2.5]" />
              </button>
              <button type="button" onClick={onCancelEdit} className="px-2 py-1 bg-[var(--cordel-surface-elevated)] text-[var(--cordel-text)] border border-[var(--cordel-border)] font-bold text-xs cursor-pointer flex items-center justify-center">
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
                <span className="text-[9px] font-bold font-cactus bg-[var(--cordel-wood)] text-[var(--cordel-on-accent)] px-1.5 py-0.5 shrink-0">
                  {isPt ? 'Ativo' : 'Actif'}
                </span>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5 text-[10px] font-cactus font-bold">
          <span className="px-1.5 py-0.5 border border-[var(--cordel-border)] bg-[var(--cordel-surface-elevated)] text-[var(--cordel-text)]">
            {isPt ? `Tela 1 : ${layout.bridgeViewMode === 'timeline' ? 'Sequenciador' : 'Roda'}` : `Écran 1 : ${layout.bridgeViewMode === 'timeline' ? 'Séquenceur' : 'Roda'}`}
          </span>
          <span className={`px-1.5 py-0.5 border ${layout.satelliteOpen ? 'bg-[var(--cordel-wood)] text-[var(--cordel-on-accent)] border-[var(--cordel-border-strong)]' : 'bg-[var(--cordel-surface-muted)] text-[var(--cordel-text-muted)] border-[var(--cordel-border)]'}`}>
            {layout.satelliteOpen ? modeLabel : (isPt ? '1 Tela única' : '1 Écran unique')}
          </span>
          {layout.satelliteBounds && (
            <span className="px-1.5 py-0.5 font-mono text-[9px] border border-[var(--cordel-border)] bg-[var(--cordel-surface-muted)] text-[var(--cordel-text-muted)]">
              ({layout.satelliteBounds.x}, {layout.satelliteBounds.y})
            </span>
          )}
        </div>
      </div>

      <div className="border-t border-[var(--cordel-border)]/35 pt-2 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onApply}
          className="flex-1 font-cactus font-bold uppercase text-[10px] md:text-xs py-1.5 px-3 border-2 border-[var(--cordel-border-strong)] shadow-[2px_2px_0px_var(--cordel-shadow-color)] cursor-pointer transition-colors bg-[var(--cordel-wood)] text-[var(--cordel-on-accent)] hover:bg-[var(--cordel-accent)]"
        >
          {isPt ? 'Aplicar espaço' : "Appliquer l'espace"}
        </button>

        {isConfirmingDelete ? (
          <div className="flex items-center gap-1">
            <button type="button" onClick={onConfirmDelete} className="px-2 py-1 bg-[var(--cordel-status-danger)] text-[var(--cordel-on-accent)] font-cactus font-bold text-[10px] uppercase border border-[var(--cordel-border-strong)] cursor-pointer">
              {isPt ? 'Excluir' : 'Suppr.'}
            </button>
            <button type="button" onClick={onCancelDelete} className="px-2 py-1 bg-[var(--cordel-surface-elevated)] text-[var(--cordel-text)] border border-[var(--cordel-border)] cursor-pointer flex items-center justify-center">
              <X size={12} className="stroke-[2.5]" />
            </button>
          </div>
        ) : (
          <button type="button" onClick={onAskDelete} className="px-2 py-1.5 bg-[var(--cordel-surface-elevated)] text-[var(--cordel-accent-readable)] hover:bg-[var(--cordel-status-danger)] hover:text-[var(--cordel-on-accent)] border-2 border-[var(--cordel-border)] cursor-pointer shadow-[1.5px_1.5px_0px_var(--cordel-shadow-color)] flex items-center justify-center transition-colors">
            <Trash2 size={13} />
          </button>
        )}
      </div>
    </div>
  );
};
