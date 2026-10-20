import React, { useState } from 'react';
import { useDesktopWorkspaceStore } from '../../stores/useDesktopWorkspaceStore';
import { SettingsDesktopLayoutCard } from './SettingsDesktopLayoutCard';

interface SettingsDesktopLayoutsTabProps {
  lang: string;
}

export const SettingsDesktopLayoutsTab: React.FC<SettingsDesktopLayoutsTabProps> = ({ lang }) => {
  const desktopLayouts = useDesktopWorkspaceStore((state) => state.layouts);
  const activeDesktopLayoutId = useDesktopWorkspaceStore((state) => state.activeLayoutId);
  const saveCurrentDesktopLayout = useDesktopWorkspaceStore((state) => state.saveCurrentLayout);
  const applyDesktopLayout = useDesktopWorkspaceStore((state) => state.applyLayout);
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
    saveCurrentDesktopLayout(newLayoutName.trim());
    setIsSavingLayoutModalOpen(false);
    setNewLayoutName('');
  };

  const handleApplyLayout = (id: string, name: string) => {
    const success = applyDesktopLayout(id);
    if (success) {
      setAppliedLayoutNotification(
        lang === 'pt' ? `Espaço de trabalho "${name}" aplicado com sucesso!` : `Espace de travail "${name}" appliqué avec succès !`
      );
      setTimeout(() => setAppliedLayoutNotification(null), 3500);
    }
  };

  const handleSaveLayoutRename = (id: string) => {
    if (editingLayoutName.trim()) renameDesktopLayout(id, editingLayoutName.trim());
    setEditingLayoutId(null);
    setEditingLayoutName('');
  };

  return (
    <div className="flex flex-col gap-5 text-left">
      <div className="flex flex-wrap justify-between items-center gap-2 border-b border-black/10 pb-2">
        <div>
          <h3 className="font-cactus font-bold text-sm uppercase flex items-center gap-1.5">
            <span>🖥️</span>
            <span>{lang === 'pt' ? 'Espaços de Trabalho (Multi-telas & Janelas)' : 'Espaces de Travail (Multi-écrans & Fenêtres)'}</span>
          </h3>
          <p className="text-[10px] opacity-75 mt-0.5">
            {lang === 'pt'
              ? 'Salve suas disposições de janelas personalizadas para restaurá-las com 1 clique.'
              : 'Sauvegardez vos agencements de fenêtres personnalisés pour les restaurer en 1 clic.'}
          </p>
        </div>
        <button
          onClick={() => setIsSavingLayoutModalOpen(true)}
          className="px-3 py-1.5 text-[11px] font-cactus font-bold uppercase border-2 border-black bg-[#8b2a1a] text-[#f4ecd8] hover:bg-[#a83220] cursor-pointer shadow-[2px_2px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none flex items-center gap-1.5 transition-all"
        >
          <span>💾</span>
          <span>{lang === 'pt' ? 'Memorizar espaço atual' : "Mémoriser l'espace actuel"}</span>
        </button>
      </div>

      {appliedLayoutNotification && (
        <div className="bg-emerald-100 border-2 border-emerald-800 text-emerald-900 px-3 py-2 text-xs font-bold text-center shadow-[2px_2px_0px_#065f46]">
          {appliedLayoutNotification}
        </div>
      )}

      {isSavingLayoutModalOpen && (
        <div className="border-2 border-black bg-white p-3.5 shadow-[3px_3px_0px_#000] flex flex-col gap-2 rounded-[2px_4px_3px_5px]">
          <span className="font-cactus font-bold text-xs uppercase text-[#1a1a1a]">
            {lang === 'pt' ? 'Nome do espaço de trabalho :' : "Nom de l'espace de travail :"}
          </span>
          <div className="flex gap-2">
            <input
              type="text"
              value={newLayoutName}
              onChange={(e) => setNewLayoutName(e.target.value)}
              placeholder={lang === 'pt' ? 'ex: Studio 2 Telas' : 'ex: Studio 2 Écrans'}
              className="flex-1 border-2 border-black px-2 py-1 text-xs font-cactus font-bold bg-[#f4ecd8] text-[#1a1a1a] outline-none"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveNewLayout();
                if (e.key === 'Escape') setIsSavingLayoutModalOpen(false);
              }}
            />
            <button onClick={handleSaveNewLayout} className="px-3.5 py-1 bg-[#8b2a1a] text-[#f4ecd8] border-2 border-black font-cactus font-bold text-xs uppercase shadow-[2px_2px_0px_#000] hover:bg-[#a83220] cursor-pointer">
              {lang === 'pt' ? 'Salvar' : 'Enregistrer'}
            </button>
            <button onClick={() => setIsSavingLayoutModalOpen(false)} className="px-3 py-1 bg-white text-black border-2 border-black font-cactus font-bold text-xs uppercase shadow-[2px_2px_0px_#000] hover:bg-gray-100 cursor-pointer">
              {lang === 'pt' ? 'Cancelar' : 'Annuler'}
            </button>
          </div>
        </div>
      )}

      {desktopLayouts.length === 0 ? (
        <div className="p-6 border-2 border-dashed border-black/40 bg-white/60 text-center flex flex-col items-center justify-center gap-2 rounded">
          <span className="text-3xl">🖥️</span>
          <span className="font-cactus font-bold text-sm uppercase text-black/80">
            {lang === 'pt' ? 'Nenhum espaço de trabalho salvo' : 'Aucun espace de travail enregistré'}
          </span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {desktopLayouts.map((layout) => (
            <SettingsDesktopLayoutCard
              key={layout.id}
              layout={layout}
              lang={lang}
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
