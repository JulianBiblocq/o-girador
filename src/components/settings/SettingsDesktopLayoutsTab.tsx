import React, { useState } from 'react';
import { LayoutGrid, Plus } from 'lucide-react';
import { useDesktopWorkspaceStore } from '../../stores/useDesktopWorkspaceStore';
import { applyDesktopWorkspaceLayout, saveCurrentDesktopWorkspaceLayout } from '../../utils/satelliteLayoutActions';
import { SettingsDesktopLayoutCard } from './SettingsDesktopLayoutCard';
import { SettingsDesktopModeCards } from './SettingsDesktopModeCards';

interface SettingsDesktopLayoutsTabProps {
  lang: string;
}

export const SettingsDesktopLayoutsTab: React.FC<SettingsDesktopLayoutsTabProps> = ({ lang }) => {
  const desktopLayouts = useDesktopWorkspaceStore((state) => state.layouts);
  const activeDesktopLayoutId = useDesktopWorkspaceStore((state) => state.activeLayoutId);
  const deleteDesktopLayout = useDesktopWorkspaceStore((state) => state.deleteLayout);
  const renameDesktopLayout = useDesktopWorkspaceStore((state) => state.renameLayout);

  const [isSavingLayoutModalOpen, setIsSavingLayoutModalOpen] = useState(false);
  const [newLayoutName, setNewLayoutName] = useState('');
  const [editingLayoutId, setEditingLayoutId] = useState<string | null>(null);
  const [editingLayoutName, setEditingLayoutName] = useState('');
  const [confirmDeleteLayoutId, setConfirmDeleteLayoutId] = useState<string | null>(null);
  const [appliedLayoutNotification, setAppliedLayoutNotification] = useState<string | null>(null);

  const handleSaveNewLayout = () => {
    if (!newLayoutName.trim()) return;
    saveCurrentDesktopWorkspaceLayout(newLayoutName.trim());
    setIsSavingLayoutModalOpen(false);
    setNewLayoutName('');
  };

  const notifyBanner = (msg: string) => {
    setAppliedLayoutNotification(msg);
    setTimeout(() => setAppliedLayoutNotification(null), 3500);
  };

  const handleApplyLayout = (id: string, name: string) => {
    if (applyDesktopWorkspaceLayout(id)) {
      notifyBanner(lang === 'pt' ? `Espaço de trabalho "${name}" aplicado com sucesso!` : `Espace de travail "${name}" appliqué avec succès !`);
    }
  };

  const handleSaveLayoutRename = (id: string) => {
    if (editingLayoutName.trim()) renameDesktopLayout(id, editingLayoutName.trim());
    setEditingLayoutId(null);
    setEditingLayoutName('');
  };

  return (
    <div className="flex flex-col gap-5 text-left">
      <div className="flex flex-wrap justify-between items-center gap-2 border-b border-[var(--cordel-border)]/35 pb-2.5">
        <div>
          <h3 className="font-cactus font-bold text-sm uppercase flex items-center gap-2 text-[var(--cordel-text)]">
            <LayoutGrid size={16} className="shrink-0 text-[var(--cordel-accent-readable)]" />
            <span>{lang === 'pt' ? 'Espaços de Trabalho (Multi-telas & Janelas)' : 'Espaces de Travail (Multi-écrans & Fenêtres)'}</span>
          </h3>
          <p className="text-[11px] text-[var(--cordel-text-muted)] mt-0.5">
            {lang === 'pt'
              ? 'Salve suas disposições de janelas personalizadas para restaurá-las com 1 clique.'
              : 'Sauvegardez vos agencements de fenêtres personnalisés pour les restaurer en 1 clic.'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsSavingLayoutModalOpen(true)}
          className="px-3 py-1.5 text-[11px] font-cactus font-bold uppercase border-2 border-[var(--cordel-border-strong)] bg-[var(--cordel-wood)] text-[var(--cordel-on-accent)] hover:bg-[var(--cordel-accent)] cursor-pointer shadow-[2px_2px_0px_var(--cordel-shadow-color)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none flex items-center gap-1.5 transition-colors"
        >
          <Plus size={14} className="shrink-0 stroke-[2.5]" />
          <span>{lang === 'pt' ? 'Memorizar espaço atual' : "Mémoriser l'espace actuel"}</span>
        </button>
      </div>

      {appliedLayoutNotification && (
        <div className="bg-[var(--cordel-status-success)] border-2 border-[var(--cordel-border-strong)] text-[var(--cordel-on-accent)] px-3 py-2 text-xs font-bold text-center shadow-[2px_2px_0px_var(--cordel-shadow-color)]">
          {appliedLayoutNotification}
        </div>
      )}

      <SettingsDesktopModeCards lang={lang} onNotify={notifyBanner} />

      {isSavingLayoutModalOpen && (
        <div className="border-2 border-[var(--cordel-border)] bg-[var(--cordel-surface)] text-[var(--cordel-text)] p-3.5 shadow-[3px_3px_0px_var(--cordel-shadow-color)] flex flex-col gap-2 rounded-[2px_4px_3px_5px]">
          <span className="font-cactus font-bold text-xs uppercase text-[var(--cordel-text)]">
            {lang === 'pt' ? 'Nome do espaço de trabalho :' : "Nom de l'espace de travail :"}
          </span>
          <div className="flex flex-wrap gap-2">
            <input
              type="text"
              value={newLayoutName}
              onChange={(e) => setNewLayoutName(e.target.value)}
              placeholder={lang === 'pt' ? 'ex: Studio 2 Telas' : 'ex: Studio 2 Écrans'}
              className="flex-1 min-w-[180px] border-2 border-[var(--cordel-border-strong)] px-2.5 py-1 text-xs font-cactus font-bold bg-[var(--cordel-surface-elevated)] text-[var(--cordel-text)] placeholder:text-[var(--cordel-text-muted)]/70 outline-none"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveNewLayout();
                if (e.key === 'Escape') { e.stopPropagation(); setIsSavingLayoutModalOpen(false); }
              }}
            />
            <button type="button" onClick={handleSaveNewLayout} className="px-3.5 py-1 bg-[var(--cordel-wood)] text-[var(--cordel-on-accent)] border-2 border-[var(--cordel-border-strong)] font-cactus font-bold text-xs uppercase shadow-[2px_2px_0px_var(--cordel-shadow-color)] hover:bg-[var(--cordel-accent)] cursor-pointer transition-colors">
              {lang === 'pt' ? 'Salvar' : 'Enregistrer'}
            </button>
            <button type="button" onClick={() => setIsSavingLayoutModalOpen(false)} className="px-3 py-1 bg-[var(--cordel-surface-elevated)] text-[var(--cordel-text)] border-2 border-[var(--cordel-border)] font-cactus font-bold text-xs uppercase shadow-[2px_2px_0px_var(--cordel-shadow-color)] hover:bg-[var(--cordel-surface-muted)] cursor-pointer transition-colors">
              {lang === 'pt' ? 'Cancelar' : 'Annuler'}
            </button>
          </div>
        </div>
      )}

      {desktopLayouts.length === 0 ? (
        <div className="p-6 border-2 border-dashed border-[var(--cordel-border)] bg-[var(--cordel-surface)] text-[var(--cordel-text)] text-center flex flex-col items-center justify-center gap-2 rounded">
          <span className="font-cactus font-bold text-sm uppercase text-[var(--cordel-text)]">
            {lang === 'pt' ? 'Nenhum espaço de trabalho salvo' : 'Aucun espace de travail enregistré'}
          </span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {desktopLayouts.map((layout) => (
            <SettingsDesktopLayoutCard
              key={layout.id} layout={layout} lang={lang}
              isActiveLayout={activeDesktopLayoutId === layout.id}
              isEditing={editingLayoutId === layout.id}
              editingName={editingLayoutName}
              isConfirmingDelete={confirmDeleteLayoutId === layout.id}
              onStartEdit={() => { setEditingLayoutId(layout.id); setEditingLayoutName(layout.name); }}
              onCancelEdit={() => setEditingLayoutId(null)}
              onSaveRename={() => handleSaveLayoutRename(layout.id)}
              onNameChange={setEditingLayoutName}
              onApply={() => handleApplyLayout(layout.id, layout.name)}
              onAskDelete={() => setConfirmDeleteLayoutId(layout.id)}
              onCancelDelete={() => setConfirmDeleteLayoutId(null)}
              onConfirmDelete={() => { deleteDesktopLayout(layout.id); setConfirmDeleteLayoutId(null); }}
            />
          ))}
        </div>
      )}
    </div>
  );
};
