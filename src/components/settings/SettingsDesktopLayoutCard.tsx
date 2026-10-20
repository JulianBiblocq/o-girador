import React from 'react';
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
  layout,
  lang,
  isActiveLayout,
  isEditing,
  editingName,
  isConfirmingDelete,
  onStartEdit,
  onCancelEdit,
  onSaveRename,
  onNameChange,
  onApply,
  onAskDelete,
  onCancelDelete,
  onConfirmDelete,
}) => {
  const { mixer, roda, detailEditor } = layout.detachedPanels;

  return (
    <div
      className={`border-2 border-black bg-white p-4 shadow-[3px_3px_0px_#000] flex flex-col justify-between gap-3 rounded-[3px_6px_4px_8px] transition-all ${
        isActiveLayout ? 'ring-2 ring-[#8b2a1a] bg-[#fbf8f0]' : ''
      }`}
    >
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2 border-b border-black/10 pb-2">
          {isEditing ? (
            <div className="flex items-center gap-1.5 flex-1">
              <input
                type="text"
                value={editingName}
                onChange={(e) => onNameChange(e.target.value)}
                className="border-2 border-black px-2 py-0.5 text-xs font-cactus font-bold bg-[#f4ecd8] flex-1 outline-none"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') onSaveRename();
                  if (e.key === 'Escape') onCancelEdit();
                }}
              />
              <button onClick={onSaveRename} className="px-2 py-0.5 bg-black text-[#f4ecd8] border border-black font-bold text-xs cursor-pointer hover:bg-green-700">
                ✓
              </button>
              <button onClick={onCancelEdit} className="px-2 py-0.5 bg-white text-black border border-black font-bold text-xs cursor-pointer hover:bg-gray-200">
                ✕
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span className="font-cactus font-bold text-sm text-black truncate" title={layout.name}>
                {layout.name}
              </span>
              <button onClick={onStartEdit} className="text-[11px] opacity-60 hover:opacity-100 cursor-pointer p-0.5">
                ✏️
              </button>
              {isActiveLayout && (
                <span className="text-[9px] font-bold font-cactus bg-[#8b2a1a] text-white px-1.5 py-0.2 rounded shrink-0">
                  {lang === 'pt' ? 'Ativo' : 'Actif'}
                </span>
              )}
              <span className="text-[9px] opacity-40 ml-auto font-mono">
                {new Date(layout.createdAt).toLocaleDateString()}
              </span>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5 text-[9px] font-cactus font-bold">
          <span className={`px-1.5 py-0.5 border rounded flex items-center gap-1 ${mixer?.detached ? 'bg-[#8b2a1a]/10 text-[#8b2a1a] border-[#8b2a1a]/40' : 'bg-gray-100 text-black/60 border-gray-300'}`}>
            🎛️ {mixer?.detached ? (lang === 'pt' ? 'Mesa déportada' : 'Console déportée') : (lang === 'pt' ? 'Mesa ancorada' : 'Console ancrée')}
          </span>
          <span className={`px-1.5 py-0.5 border rounded flex items-center gap-1 ${roda?.detached ? 'bg-[#8b2a1a]/10 text-[#8b2a1a] border-[#8b2a1a]/40' : 'bg-gray-100 text-black/60 border-gray-300'}`}>
            🥁 {roda?.detached ? (lang === 'pt' ? 'Roda déportada' : 'Roda déportée') : (lang === 'pt' ? 'Roda ancorada' : 'Roda ancrée')}
          </span>
          {detailEditor?.detached && (
            <span className="px-1.5 py-0.5 border rounded bg-[#8b2a1a]/10 text-[#8b2a1a] border-[#8b2a1a]/40 flex items-center gap-1">
              🔧 {lang === 'pt' ? 'Editor déportado' : 'Éditeur déporté'}
            </span>
          )}
        </div>
      </div>

      <div className="border-t border-black/10 pt-2 flex items-center justify-between gap-2">
        <button
          onClick={onApply}
          className={`flex-1 font-cactus font-bold uppercase text-[10px] md:text-xs py-1.5 px-3 border-2 border-black shadow-[2px_2px_0px_#000] cursor-pointer transition-colors active:translate-x-[1px] active:translate-y-[1px] active:shadow-none ${
            isActiveLayout ? 'bg-[#8b2a1a] text-[#f4ecd8] hover:bg-[#a83220]' : 'bg-black text-[#f4ecd8] hover:bg-[#8b2a1a]'
          }`}
        >
          🚀 {lang === 'pt' ? 'Aplicar espaço' : "Appliquer l'espace"}
        </button>

        {isConfirmingDelete ? (
          <div className="flex items-center gap-1">
            <button onClick={onConfirmDelete} className="px-2 py-1 bg-red-700 text-white font-cactus font-bold text-[10px] uppercase border border-black cursor-pointer hover:bg-red-800">
              {lang === 'pt' ? 'Excluir' : 'Suppr.'}
            </button>
            <button onClick={onCancelDelete} className="px-2 py-1 bg-white text-black font-cactus font-bold text-[10px] uppercase border border-black cursor-pointer hover:bg-gray-100">
              ✕
            </button>
          </div>
        ) : (
          <button onClick={onAskDelete} className="px-2 py-1 bg-white text-red-700 border-2 border-black font-cactus font-bold text-xs hover:bg-red-50 cursor-pointer shadow-[1.5px_1.5px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none">
            🗑️
          </button>
        )}
      </div>
    </div>
  );
};
